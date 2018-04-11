var express= require('express');
var http= require('http');
var session= require('express-session');
var flash= require('express-flash');
var app= express();
app.use(flash());
var port= 33108;
var mUser;

var server= http.createServer(app).listen(port);
var io= require('socket.io')(server);
//login head and end. Body will be served dynamically.
app.use(express.static("."));

var playerName;
var username;
var mongoClient= require('mongodb').MongoClient;

var database;
var userCollection;
//var url="mongodb://mayankandkaran:assignment4game@ds119129.mlab.com:19129/assignment4";
var url= 'mongodb://maggarwa:QoYdlD8f@127.0.0.1:27017/cmpt218_maggarwa?authSource=admin';
//var currentPlayers= [];
//create and keep track of running channels
var rooms = new Object();
var numOfRooms = 0;

var displayWinner;
var displayLoser;
var displayTime;
var displayNumberOfMoves;
var displayGameLasted;

mongoClient.connect(url, function(error, client)
{
  if(error)
  {
    console.log(error);
  }
  else
  {
    //database= client.db('assignment4');
    database= client.db('cmpt218_maggarwa');   //use this db.
    userCollection= database.collection('userCollection');    //create user collection.
    console.log("Connected to database. ");
  }
});

function addUserToNewRoom(user){
  rooms["room"+numOfRooms] = new Array();
  user.room = "room"+numOfRooms;
  user.moveSymbol = 'x';
  rooms["room"+numOfRooms].push(user);
  numOfRooms++;
}
function joinRoom(user,socket){
  if(numOfRooms == 0){
    addUserToNewRoom(user);
    socket.join("room"+(numOfRooms-1));
    return [user,false];
  }else{
    var pendingRoom = "room" + '' + (numOfRooms - 1);
    if(rooms[pendingRoom].length < 2){
      socket.join(pendingRoom);
      user.room = pendingRoom;
      user.moveSymbol = 'o';
      rooms[pendingRoom].push(user);
      rooms[pendingRoom].canPlay = true;
      //create bitmap for each room
      var bitmap = new Array(27);
      bitmap.fill(0);
      rooms[pendingRoom].bitMap = bitmap;
      return [user,true];
    }else{
      addUserToNewRoom(user);
      socket.join("room"+(numOfRooms-1));
      return [user,false];
    }
  }
}

function didPlayerWin(bitmap,move){
  return didWinOn1DPlane(bitmap,move) || didWinOn3DPlane(bitmap,move);
}

function didWinOn3DPlane(bitmap,move){
  var winPosStraight = new Array(3);
  var winPosDiagonalLeft = new Array(3);
  var winPosDiagonalRight = new Array(3);
  var winDiagStraightCol = new Array(3);
  var winDiagStraightRow = new Array(3);

  var countStraight = 0;
  var countDiagonalLeft = 0;
  var countDiagonalRight = 0;
  var countDiagRow = 0;
  var countDiagCol = 0;

  var gridNumber = move.grid.charAt(move.grid.length-1)-1;
  //straight up wins
  for(var i=0;i<3;i++){
    winPosStraight[gridNumber] = move;
    if(i != gridNumber){
      if(bitmap[(move.row*3 + move.col) + (9*i)] != move.bitcode){
        break;
      }else{
        var pos = {col:move.col,row:move.row,grid:"grid"+(i+1)};
        winPosStraight[i] = pos;
        countStraight++;
        if(countStraight >= 2){
          return winPosStraight;
        }
      }
    }
  }

  //diagonal row wins
  for(var i=0;i<3;i++){
    winDiagStraightRow[move.col] = move;
    if(i != gridNumber && i != move.col){
      if(bitmap[(move.row*3 + i) + (9*i)] != move.bitcode){
        break;
      }else{
        var pos = {col:i,row:move.row,grid:"grid"+(i+1)};
        winDiagStraightRow[i] = pos;
        countDiagRow++;
        if(countDiagRow >= 2){
            return winDiagStraightRow;
        }
      }
    }
  }

  //diagonal column wins
  for(var i=0;i<3;i++){
    winDiagStraightCol[move.row] = move;
    if(i != gridNumber && i !== move.row){
      if(bitmap[(i*3 + move.col + (9*i))] != move.bitcode){
        break;
      }else{
        var pos = {col:move.col,row:i,grid:"grid"+(i+1)};
        winDiagStraightCol[i] = pos;
        countDiagCol++;
        if(countDiagCol >= 2){
          return winDiagStraightCol;
        }
      }
    }
  }

  // diagonal wins
  var isDiagonalSol = move.row == 0 && move.col == 0 || move.row == 2 && move.col == 0 || move.row == 0 && move.col == 2
                      || move.row == 2 && move.col == 2 || move.row == 1 && move.col == 1;
  if(isDiagonalSol){
    if(move.row == 2 && move.col == 0 || move.row == 0 && move.col == 2 || move.col == 1 && move.col == move.row){
      var i = 0;
      var j = 2;
      while(i < 3 && j >= 0){
        winPosDiagonalRight[gridNumber] = move;
        if(i != move.col && j != move.row && j != gridNumber){
          if(bitmap[(j*3 + i) + (9*j)] != move.bitcode){
            return false;
          }else{
            var pos = {col:i,row:j,grid:"grid"+(j+1)};
            winPosDiagonalRight[j] = pos;
            countDiagonalRight++;
            if(countDiagonalRight >= 2){
              return winPosDiagonalRight;
            }
          }
        }
        i++;
        j--;
      }
    }else if(move.row == move.col){
      for(var i=0;i<3;i++){
        winPosDiagonalLeft[move.row] = move;
        if(i != move.row && i != gridNumber){
          if(bitmap[(i*3 + i) + (9*i)] != move.bitcode){
            return false;
          }else{
            var pos = {col:i,row:i,grid:"grid"+(i+1)};
            winPosDiagonalLeft[i] = pos;
            countDiagonalLeft++;
            if(countDiagonalLeft >= 2){
              return winPosDiagonalLeft;
            }
          }
        }
      }
    }
  }else{
    return false;
  }
  return false;
}

function didWinOn1DPlane(bitmap,move){
  var winPosCol = new Array(3);
  var winPosRow = new Array(3);
  var winPosDiagonalRight = new Array(3);
  var winPosDiagonalLeft = new Array(3);
  var rowCount = 0;
  var colCount = 0;
  var diagonalRightCount = 0;
  var diagonalLeftCount = 0;

  for(var i=0;i<3;i++){
    //row wins
    winPosRow[move.col] = move;
    if(i != move.col){
      if(bitmap[(move.row*3 + i) + (9*(move.grid.charAt(move.grid.length-1)-1))] != move.bitcode){
        break;
      }else{
        var pos = {col:i,row:move.row,grid:move.grid}
        winPosRow[i] = pos;
        rowCount++;
        if(rowCount >= 2){
          return winPosRow;
        }
      }
    }
  }
  //col wins
  for(var i=0;i<3;i++){
    winPosCol[move.row] = move;
    if(i != move.row){
      if(bitmap[(i*3 + move.col) + (9*(move.grid.charAt(move.grid.length-1)-1))] != move.bitcode){
        break;
      }else{
        var pos = {col:move.col,row:i,grid:move.grid};
        winPosCol[i] = pos;
        colCount++;
        if(colCount >= 2){
          return winPosCol;
        }
      }
    }
  }
  // diagonal wins
  var isDiagonalSol = move.row == 0 && move.col == 0 || move.row == 2 && move.col == 0 || move.row == 0 && move.col == 2
                      || move.row == 2 && move.col == 2 || move.row == 1 && move.col == 1;
  if(isDiagonalSol){
    if(move.row == 2 && move.col == 0 || move.row == 0 && move.col == 2 || move.col == 1 && move.col == move.row){
      var i = 0;
      var j = 2;
      while(i < 3 && j >= 0){
        winPosDiagonalRight[move.col] = move;
        if(i != move.col && j != move.row){
          if(bitmap[(j*3 + i) + (9*(move.grid.charAt(move.grid.length-1)-1))] != move.bitcode){
            return false;
          }else{
            var pos = {col:i,row:j,grid:move.grid};
            winPosDiagonalRight[i] = pos;
            diagonalRightCount++;
            if(diagonalRightCount >= 2){
              return winPosDiagonalRight;
            }
          }
        }
        i++;
        j--;
      }
    }else if(move.row == move.col){
      for(var i=0;i<3;i++){
        winPosDiagonalLeft[move.row] = move;
        if(i != move.row){
          if(bitmap[(i*3 + i) + (9*(move.grid.charAt(move.grid.length-1)-1))] != move.bitcode){
            return false;
          }else{
            var pos = {col:i,row:i,grid:move.grid};
            winPosDiagonalLeft[i] = pos;
            diagonalLeftCount++;
            if(diagonalLeftCount >= 2){
              return winPosDiagonalLeft;
            }
          }
        }
       }
    }
  }else{
    return false;
  }
  return false;
}

io.on('connection', function(socket)        //callback that has default arg: socket (which just joined).
{
  socket.emit('welcome',mUser);
  socket.on('madeMove', function(clickId,col,row,grid,room,username)
  {
    var symbol = 'x';
    var bitcode = 1;
    var roomIndexOfWinner = 0;
    var roomIndexOfLoser = 1;
    if(rooms[room][1].username == username){
      symbol = 'o';
      bitcode = 2;
      roomIndexOfWinner = 1;
      roomIndexOfLoser = 0;
    }
    if((!(rooms[room].lastKnownSymbol) || rooms[room].lastKnownSymbol != symbol) && rooms[room].canPlay == true)
    {
      socket.emit('newMove',symbol, col, row, grid);
      socket.to(room).emit('newMove', symbol, col, row, grid);
      rooms[room].lastKnownSymbol = symbol;
      rooms[room].bitMap[(row*3 + col)+(9*(grid.charAt(grid.length-1)-1))] = bitcode;
      var move = {col:col,row:row,grid:grid.charAt(grid.length-1),bitcode:bitcode};
      var win = didPlayerWin(rooms[room].bitMap,move);
      if(win != false){
        rooms[room].canPlay = false;
        var winner = rooms[room][roomIndexOfWinner];
        var loser = rooms[room][roomIndexOfLoser];
        //update stats: do this whenever game ends: on finish, on logout, on quit.

        var winnerName= winner.username;
        var loserName= loser.username;
        var winnerWins;
        var winnerGames;
        var winnerAcc;
        var numMedals;
        var loserLosses;
        var loserGames;
        var loserWins;
        var loserAcc;
        userCollection.find({"username":winnerName}).toArray().then(function(array)
        {
          winnerWins= array[0].totalWins+1;
          winnerGames= array[0].totalGames+1;
          winnerAcc= parseInt((winnerWins/winnerGames)*100);
          numMedals=parseInt(winnerWins/5);
          userCollection.update({"username":winnerName}, {$set:{"tictacMaster":numMedals}});
          userCollection.find({"username":loserName}).toArray().then(function(newArr)
          {
            loserLosses= newArr[0].totalLosses+1;
            loserGames= newArr[0].totalGames+1;
            loserWins= newArr[0].totalWins;
            loserAcc= parseInt((loserWins/loserGames)*100);

            userCollection.update({"username":winnerName}, {$set:{"totalGames":winnerGames, "totalWins":winnerWins, "winningAccuracy":winnerAcc}});
            userCollection.update({"username":loserName}, {$set: {"totalLosses":loserLosses, "totalGames":loserGames, "winningAccuracy":loserAcc}});

            socket.emit("gameover",winner,loser, win, room);
            socket.to(room).emit("gameover",winner,loser,win,room);
          });
        });
      }
    }
  });
  socket.on('gameDraw', function(room)
  {
    var player1 = rooms[room][0];
    var player2 = rooms[room][1];

    var p1totGames;
    var p2totGames;
    var p1wins;

    var p1acc;
    var p2acc;
    var p2wins;

    userCollection.find({"username":player1.username}).toArray().then(function(array)
    {
      p1totGames= array[0].totalGames+1;
      p1wins= array[0].totalWins;
      p1acc= parseInt((p1wins/p1totGames)*100);

      userCollection.update({"username":player1.username}, {$set:{"totalGames":p1totGames, "winningAccuracy":p1acc}});
      userCollection.find({"username":player2.username}).toArray().then(function(newArr)
      {
        p2totGames= newArr[0].totalGames+1;
        p2wins= newArr[0].totalWins;
        p2acc= parseInt((p2wins/p2totGames)*100);
        userCollection.update({"username":player2.username}, {$set:{"totalGames":p2totGames, "winningAccuracy":p2acc}});
        socket.emit('updatedDB');
      });
    });
  });
  socket.on('disconnectMe', function(room,username)      //clicked Logout
  {
    var winName = rooms[room][1].username;
    socket.to(room).emit('playerLeft',username);
    if(rooms[room][1].username == username){
      winName = rooms[room][0].username;
    }

    delete rooms[room];
    numOfRooms--;

    var newLosses;
    var newGames;
    var newAcc;
    var newWins;

    var WGames;
    var WAcc;
    var WWins;



    userCollection.find({"username":username}).toArray().then(function(array)
    {
      newLosses= array[0].totalLosses+1;
      newGames= array[0].totalGames+1;
      newWins= array[0].totalWins;
      newAcc= parseInt((newWins/newGames)*100);

      userCollection.update({"username":username}, {$set:{"totalGames":newGames, "winningAccuracy":newAcc, 'totalLosses':newLosses}});
      userCollection.find({"username":winName}).toArray().then(function(newArr)
      {
        WGames= newArr[0].totalGames+1;
        WWins= newArr[0].totalWins+1;
        WAcc= parseInt((WWins/WGames)*100);
        userCollection.update({"username":winName}, {$set:{"totalGames":WGames, "totalWins":WWins, "winningAccuracy":WAcc}});
        socket.disconnect();
      });
    });
  });
  socket.on('gameQuit', function(room,username)      //quit game
  {
    var winName = rooms[room][1].username;
    socket.to(room).emit('playerLeft',username);
    if(rooms[room][1].username == username){
      winName = rooms[room][0].username;
    }
    delete rooms[room];
    numOfRooms--;


    var newLosses;
    var newGames;
    var newAcc;
    var newWins;

    var WGames;
    var WAcc;
    var WWins;



    userCollection.find({"username":username}).toArray().then(function(array)
    {
      console.log(array[0]);
      newLosses= array[0].totalLosses+1;
      newGames= array[0].totalGames+1;
      newWins= array[0].totalWins;
      newAcc= parseInt((newWins/newGames)*100);

      userCollection.update({"username":username}, {$set:{"totalGames":newGames, "winningAccuracy":newAcc, 'totalLosses':newLosses}});
      userCollection.find({"username":winName}).toArray().then(function(newArr)
      {
        WGames= newArr[0].totalGames+1;
        WWins= newArr[0].totalWins+1;
        WAcc= parseInt((WWins/WGames)*100);
        userCollection.update({"username":winName}, {$set:{"totalGames":WGames, "totalWins":WWins, "winningAccuracy":WAcc}});
        socket.emit("showStats");
      });
    });
  });

  socket.on('chat', function(message, room){
    socket.to(room).emit('message',message);
  });

  socket.on('JoinRoom',function(user){
    var joinData = joinRoom(user,socket);
    if(joinData[1] == true){
      socket.emit("RoomStatus",0,joinData[0]);
      socket.to(joinData[0].room).emit("RoomStatus",0,joinData[0]);
    }else{
      socket.to(joinData[0].room).emit("RoomStatus",-1,joinData[0]);
    }
    socket.to(joinData[0].room).emit("playerJoined",user.username);
  });

  socket.on('gameOverStats', function(winner, loser, pos,room, timeString, totalMoves, timer)
  {
    //Display stats
    displayWinner= winner;
    displayLoser= loser;
    displayTime= timeString;
    displayNumberOfMoves= totalMoves;
    displayGameLasted= timer;
  });
});

var usernamesArray= [];     //Will store all usernames on our server. This will help to check uniqueness of username.
var head= `<!DOCTYPE html>
<html>
<head>
<title> Homepage </title>
<link rel="stylesheet" href="/main.css"/>
<link rel="stylesheet" type="text/css" href="https://csshake.surge.sh/csshake.min.css">
<script src= "./asn4script.js"></script>
</head>
<body>
  <header><b><h1>TIC-TAC-TOE</h1></b><h2>3D</h2></header>`;

var end= `</form>
</section>
<a id="tutorial" href="https://www.youtube.com/watch?v=hgu71eSCuXotype" class="btn btn-default">Tutorial</a>
<button id="features" onclick="features()" type="button"> Features </button>
<footer> Copyright 2018 </footer>
</body>
</html>`;

//To access request body.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


//enabling sessions
app.use(session({
  name: "session",
  secret: "players",
  maxAge: 1000*60*(1000)     //10 MINUTES OF SESSION TIME.
}));

function isLoggedIn(req, res, next)     //middleware
{
  if(req.session.user != null)
  {
    next();
  }
  else
  {
    req.flash('error', 'Please Login first');
    res.redirect('/')
  }

}
app.get('/', function(req, res, next)     //serve on get to /
{
  var errorMessage= req.flash('error');
  var successRegister= req.flash('success');

  var form= `<p style= "color: red" id= "error">`+errorMessage+`</p><p style="color: blue" id="success">`+successRegister+`</p><section id='loginSection'><form id="loginForm" action="/login" method="POST">
  <label for="username"> Username </label>
  <br>
  <input type="text" id="username" name="username">
  <br><br>
  <label for="password"> Password </label>
  <br>
  <input type= "password" id="password" name="password"><br>
  <input class='shake-little' type="submit" id="submit" value="Login">
  <a class='shake-little' id="register" href="/register" class="btn btn-default">Register now! </a>`;
  var toServe= head+form+end;
  res.end(toServe);
});

//listening for post request for LOGIN

var blockedUsernames= [];   //An array of blocked usernames: these are usernames for which password trials are exceeded. These users cannot
//enter their stats.

app.get('/register', function(req, res)       //on get register request
{
  var usernameExists= req.flash('error');
  var newEnd= `</form>
  </section>
  </body>
  </html>`;

  var body= `<section id="registerSection"><form action="/addMe" method="POST">
  <label for="firstname"> First Name </label><br>
  <input type="text" id="firstname" name="firstname"><br>
  <label for="lastname"> Last Name </label><br>
  <input type="text" id="lastname" name="lastname"><br>
  <label for="age"> Age </label><br>
  <input type="number" id="age" name="age"><br>
  <label for="gender"> Gender: </label><br>
  <input type="radio" name="gender" value="male" checked>Male<br>
  <input type="radio" style= "color: white" name="gender" value="female">Female<br><br>
  <label for="username"> Username </label>
  <input type="text" id="username" name="username"><br>
  <label for="email"> Email </label>
  <input type= "email" id="email" name="email"><br>
  <label for="password"> Password </label>
  <input type= "password" id="password" name="password"><br>
  <input class='shake-little' type="submit" id="regSubmit" value="Register">`;

  var toServe= head+`<p id="error" style="color: red">`+usernameExists+`</p>`+body+newEnd;
  res.end(toServe);
});

app.post('/addMe', function(req, res)     //handling post request for register
{
  var search= `${req.body.username}`;
  var pass= `${req.body.password}`;
  var name= `${req.body.firstname}`;
  if(search=="" || pass=="" || name=="")
  {
    req.flash('error', "Please fill in empty fields. ");
    console.log("empty fields")
    res.redirect('/register');
  }
  console.log(search);
  userCollection.find({"username":search}).toArray().then(function(respo)
  {
    //console.log(respo);
    if(respo.length != 0)
    {
      console.log("exists")
      req.flash('error', "Sorry, this username is taken. Please choose a different one. ");
      res.redirect('/register');
    }
    else
    {
       var userToAdd= {
        "username": `${req.body.username}`,
        "password":`${req.body.password}`,
        "email":`${req.body.email}`,
        "gender":`${req.body.gender}`,
        "firstname":`${req.body.firstname}`,
        "lastname":`${req.body.lastname}`,
        "age":`${req.body.age}`,
        "count":3,
        "totalWins":0,
        "totalLosses":0,
        "tictacMaster":0,
        "totalGames":0,
        "winningAccuracy":0
       }
      usernamesArray.push(`${req.body.username}`);
      userCollection.insert(userToAdd, function(err, result)
      {
        if(err)
        {
          console.log(err);
        }
      });
       req.flash('success', 'Thank you for registering. Please login');
       res.redirect('/');
     }
});
});

app.post('/login', function(req, res)     //No next needed because we dont have any other middlewares for '/login' post request
{
  var loggedUser= null;
  userCollection.find({"username": `${req.body.username}`}).toArray().then(function(array)
  {
  //  console.log(array);
    for(var l=0; l<array.length; l++)
    {
      if(array[l].username == `${req.body.username}`)
      {
        loggedUser= array[l];
      }
    }
  if(loggedUser == null)   //username doesnt exist.
  {
    //send them back to login.
    req.flash('error', 'No user found. Please register. ');
    res.redirect('/');     //make a get request to login.
  //  res.end();
  }
  else //User found, Now check password
  {
    if(loggedUser.count<0)
    {
      req.flash('error', "Sorry, your account has been suspended due to exceeded password trials");
      res.redirect('/');
    }
    for (var t=0; t<blockedUsernames.length; t++)
    {
      if((blockedUsernames[t] == `${req.body.username}`))
      {
        req.flash('error', "Sorry, your account has been suspended due to exceeded password trials");
        res.redirect('/');
      }
    }
    if(loggedUser.password == `${req.body.password}`)
    {
      console.log("in here");
      console.log(loggedUser);
    //  console.log(loggedUser.totalGames);
      //4) attach session_id

      //Update count on succesfull login:
      var newCount= 3;
      userCollection.update({"username":`${req.body.username}`}, {$set:{"count":newCount}});
      console.log("Changed count to 3.");
      console.log(loggedUser);
      req.session.user= loggedUser;
            //Attaching full user to session. Could also attach only username etc.
      res.redirect('/myStats');     //myStats will have this session.
    }
    else    //password doesnt match.
    {
      var updatedCount= loggedUser.count-1;
      userCollection.update({"username":`${req.body.username}`}, {$set:{"count":updatedCount}});
      if(loggedUser.count >0)
      {
        req.flash('error', "Wrong password: "+loggedUser.count+" trials left");
        res.redirect('/');
      }
      else
      {
        blockedUsernames.push(`${req.body.username}`);
        req.flash('error', "Account suspended");
        res.redirect('/');
      }
    }
   }
 });
});

app.get('/game',isLoggedIn, function(req, res, next)
{
  playerName= req.session.user.firstname;
  mUser = req.session.user;

//  username= req.session.user.username;
  var gameHead= `<!DOCTYPE html>
<html>
 <head>
   <title>3D TicTacToe!</title>
   <script src='./jquery-3.3.1.min.js'></script>
   <script src= './socket.io.js'></script>
   <link href = './game.css' rel = 'stylesheet' type='text/css'/>
   <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
 </head>`;

   var gameBody= `<body>
     <nav id='nav-bar'>
       <ul>
         <li>
         <button id='logout-btn'>
           <span class="glyphicon glyphicon-log-out"></span>
           <span id='logout-text'>Log out</span>
         </button>
         <button id='quit'>
           <span class="glyphicon glyphicon-home"></span>
           <span>Quit</span>
         </button>
       </li>
       </ul>
     </nav>
     <div id="waiting-message">
      Waiting For Player2...
     </div>
     <div id="game-body">
      <div id='header-container'>
        <span id='game-header'><span id="firstname">${req.session.user.firstname}</span> (<span id="username">${req.session.user.username}</span>)</span>
        <span id='game-timer'></span>
        </div>
        <hr/>
        <div id='grid-container'>
        <div id = 'smart-overlay'></div>
        </div>
        <div id="box" class="messages"><p id="title"> Chat Box </p><hr>
        <form id= "messageForm" action="javascript:void(0)">
          <input size= "35" placeholder= "Write Here" type="text" id="message" required autofocus />
          </form>
        </div>
     </div>
     <button id= 'displayStats' type='button' onclick="location.href='/displayStats'"> Display Game results </button>
     <button id='goHome' type='button' onclick='location.href="/myStats"'> Go Home </button>
   </body>
   <script src='./game.js'></script>
  </html>`;

  var toServe= gameHead+gameBody;
  res.end(toServe);
});

app.get('/displayStats', isLoggedIn, function(req, res)
{
  //collect stats from database

  var searchWinner= displayWinner.username;
  var searchLoser= displayLoser.username;

  var winMaster;
  var winGames;
  var winAcc;
  var winLosses;
  var winWins;

  var losMaster;
  var losAcc;
  var losGames;
  var losLosses;
  var losWins;

  userCollection.find({"username":searchWinner}).toArray().then(function(array)
  {
    console.log("Winner: "+array);
    winMaster= array[0].tictacMaster;
    winGames= array[0].totalGames;
    winAcc= array[0].winningAccuracy;
    winLosses= array[0].totalLosses;
    winWins= array[0].totalWins;
    userCollection.find({"username":searchLoser}).toArray().then(function(newArr)
    {
      console.log("Loser: "+newArr);
      losMaster= newArr[0].tictacMaster;
      losGames= newArr[0].totalGames;
      losAcc= newArr[0].winningAccuracy;
      losLosses= newArr[0].totalLosses;
      losWins= newArr[0].totalWins;

    var stats= `<!DOCTYPE html>
    <html>
    <head>
    <title>Game results!</title>
    <script src='./jquery-3.3.1.min.js'></script>
    <link rel='stylesheet' href='./statscss.css'>
    <script src= './socket.io.js'></script>
    </head>
    <div id="game-results">
    <div id='header-container'>
     <div id='grid-container'>
     <div id = 'smart-overlay'></div>
     </div>
     <header> Game results: </header>
     <p> Winner: `+displayWinner.firstname+`</p><p> Loser: `+displayLoser.firstname+`</p><p> Game started at: `+displayTime+`</p> Total Moves: `+displayNumberOfMoves+`</p> <p> Total time for which game lasted: `+displayGameLasted+`</p>
     <p Statistics of both the players: <p>
     <table>
     <tr>
      <th style="width:50%"></th>
      <th>`+displayWinner.firstname+`</th>
      <th>`+displayLoser.firstname+`</th>
    </tr>
  <tr>
    <td>Total Wins</td>
    <td>`+winWins+`</td>
    <td>`+losWins+`</td>
  </tr>
  <tr>
    <td>Total Losses</td>
    <td>`+winLosses+`</td>
    <td>`+losLosses+`</td>
  </tr>
  <tr>
    <td>Total Number of Games</td>
    <td>`+winGames+`</td>
    <td>`+losGames+`</td>
  </tr>
  <tr>
    <td> Winning Accuracy </td>
    <td>`+winAcc+`%</td>
    <td>`+losAcc+`%</td>
  </tr>
  <tr>
    <td>Tic-tac-Master Medals </td>
    <td>`+winMaster+`</td>
    <td>`+losMaster+`</td>
  </tr>
</table>

   </div> <button type='button' onclick='location.href="/logout"'> Logout </button>
   </div> <button type='button' onclick='location.href="/myStats"'> Go Home </button>`;

   res.end(stats);
 });
 });
});
app.get('/myStats',isLoggedIn, function(req, res)
{
  var currentUser= req.session.user;        //currentUser= logged in user.
  var logout= `<a href="/logout"> Logout </a>`;
  var dash= currentUser.firstname;
  var userNameSearch= currentUser.username;

  userCollection.find({"username":userNameSearch}).toArray().then(function(newArray)
  {
    var currWins= newArray[0].totalWins;
    var currAcc= newArray[0].winningAccuracy;
    var currLosses= newArray[0].totalLosses;
    var currMedals= newArray[0].tictacMaster;

  var head= `<!DOCTYPE html>
  <html>
  <head>
  <title> My Stats </title>
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
  <link rel="stylesheet" href='./main.css'>
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
  <script>
  function openNav() {
    document.getElementById("mySidenav").style.width = "300px";
  }

  function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
  }

</script>
  </head>
  <body>
  <nav class="navbar navbar-inverse">
  <div class="container-fluid">
  <div class="navbar-header">
    <a class="navbar-brand" href="#"> Welcome, `+dash+`!</a>
  </div>
  <ul class="nav navbar-nav">
    </ul>
    <ul class="nav navbar-nav navbar-right">
    <li><a class= 'glyphicons-log-out' href='/logout'> Logout </a></li>
    <li><a class= 'glyphicons-gamepad' href='/game'> Play game </a></li>
  </ul>
  </div>
  </nav>

  <div id="mySidenav" class="sidenav">
  <a href="javascript:void(0)" class="closebtn" onclick="closeNav()">&times;</a>
  <p>Total Wins: `+currWins+`</p>
  <p>Total Losses: `+currLosses+` </p>
  <p> Winning Accuracy: `+currAcc+`%</p>
  <p> Tic-Tac-Master Medals: `+currMedals+`</p>
  </div>
  <span style="font-size:30px;cursor:pointer" onclick="openNav()">&#9776; View Stats</span>
  <script>
  $(document).ready(function(){
      $('[data-toggle="popover"]').popover();
  });
  </script>
   </body></html>`;

  res.end(head);
});
});
app.get('/logout',isLoggedIn, function(req, res)
{
  //delete the session
  var toSearch= req.session.user.username;
  var name= req.session.user.firstname;

  req.session.regenerate(function(err)
  {
    req.flash('success', `Succesfully logged out. See you soon `+name+`!`);
    res.redirect('/');
  });
});
