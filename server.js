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
var url="mongodb://mayankandkaran:assignment4game@ds119129.mlab.com:19129/assignment4";
var currentPlayers= [];
//create and keep track of running channels
var rooms = new Object();
var numOfRooms = 0;
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
      console.log(user.room);
      return [user,true];
    }else{
      addUserToNewRoom(user);
      socket.join("room"+(numOfRooms-1));
      return [user,false];
    }
  }
}

io.on('connection', function(socket)        //callback that has default arg: socket (which just joined).
{
  socket.emit('welcome',mUser);
  socket.on('madeMove', function(clickId,col,row,grid,room,username)
  {
    var symbol = 'x';
    if(rooms[room][1].username == username){
      symbol = 'o';
    }
    if(!(rooms[room].lastKnownSymbol) || rooms[room].lastKnownSymbol != symbol){
      socket.emit('newMove',symbol, col, row, grid);
      socket.to(room).emit('newMove', symbol, col, row, grid);
      rooms[room].lastKnownSymbol = symbol;
    }
  });
  socket.on('disconnectMe', function(room)      //clicked Logout
  {
    //disconnect event
    //socket.to(room).emit('playerLeft', room);
    console.log(room);
    socket.to(room).emit('playerLeft');
    socket.disconnect();
  });
  socket.on('chat', function(message, room){
    socket.to(room).emit('message',message);
    console.log(room);
  });

  socket.on('JoinRoom',function(user){
    var joinData = joinRoom(user,socket);
    console.log();
    if(joinData[1] == true){
      socket.emit("RoomStatus",0,joinData[0]);
      socket.to(joinData[0].room).emit("RoomStatus",0,joinData[0]);
    }else{
      socket.to(joinData[0].room).emit("RoomStatus",-1,joinData[0]);
    }
    socket.to(joinData[0].room).emit("playerJoined",user.username);
  });
});
mongoClient.connect(url, function(error, client)
{
  if(error)
  {
    console.log(error);
  }
  else
  {
    database= client.db('assignment4');   //use this db.
    userCollection= database.collection('userCollection');    //create user collection.
    console.log("Connected to database. ");
  }
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
        "totalGames":0
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
//  console.log(loggedUser);
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
   <script src='./data.js'></script>
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
   </body>
   <script src='./game.js'></script>
  </html>`;

  var toServe= gameHead+gameBody;
  res.end(toServe);
});

app.get('/myStats',isLoggedIn, function(req, res)
{
  var currentUser= req.session.user;        //currentUser= logged in user.
  var logout= `<a href="/logout"> Logout </a>`;
  var dash= currentUser.firstname;


  var games= `${req.session.user.totalGames}`;
  var wins= `${req.session.user.totalWins}`;
  console.log(wins);
  console.log(games);
  if(games!=0)
  {
    var acc= (wins/(games))*100;
  }
  else
  {
    var acc= 0;
  }
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
  <p>Total Wins: `+`${req.session.user.totalWins}`+`</p>
  <p>Total Losses: `+`${req.session.user.totalLosses}`+` </p>
  <p> Winning Accuracy: `+acc+`%</p>
  <a href="#" data-toggle="popover" data-trigger="focus" data-content="Tic-tac master medals are the medals awarded to players after they win 10 games. Keep earning more to become a master.">Tic-Tac-Master Medals: `+`${req.session.user.tictacMaster}`+`</a>
  </div>
  <span style="font-size:30px;cursor:pointer" onclick="openNav()">&#9776; View Stats</span>
  <script>
  $(document).ready(function(){
      $('[data-toggle="popover"]').popover();
  });
  </script>
   </body></html>`;

//  var newHead= stats html;
//var endNew= stats html';
  //var toServe= newHead+dash+endNew;
  res.end(head);
  //res.end(toServe);
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
