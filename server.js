var express= require('express');
var http= require('http');
var session= require('express-session');
var flash= require('express-flash');
var mongoClient= require('mongodb').MongoClient;

var database;
var userCollection;
var url="mongodb://mayankandkaran:assignment4game@ds119129.mlab.com:19129/assignment4";

var rooms = new Object();
var numberofRooms = 0;
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


var app= express();
app.use(flash());
var port= 33108;
//login head and end. Body will be served dynamically.
app.use(express.static("."));
var usernamesArray= [];     //Will store all usernames on our server. This will help to check uniqueness of username.
var head= `<!DOCTYPE html>
<html>
<head>
<title> Homepage </title>
<link rel="stylesheet" href="/main.css"/>
<script src= "./asn4script.js"></script>
</head>
<body>
  <header><b><h1>TIC-TAC-TOE</h1></b><h2>Now in 3D</h2></header>`;

var end= `</form>
</section>
<a id="tutorial" href="https://www.youtube.com/watch?v=hgu71eSCuXotype" class="btn btn-default">Tutorial</a>
<button id="features" onclick="features()" type="button"> Features </button>
</body>
</html>`;

function addUserToNewRoom(user){
  var roomID = 0;
  if(numberofRooms > 0){
    roomID = numberofRooms;
  }
  var newRoom = 'room'+roomID;
  rooms[newRoom] = new Array();
  rooms[newRoom].push(user);
  numberofRooms++;
}


function joinRoom(user){
  if(numberofRooms == 0){
    addUserToNewRoom(user);
  }else{
    var pendingRoom = 'room'+(numberofRooms-1);
    if(rooms[pendingRoom].length < 2){
      rooms[pendingRoom].push(user);
    }else{
      addUserToNewRoom(user);
    }
  }
}

//To access request body.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


//enabling sessions
app.use(session({
  name: "session",
  secret: "players",
  maxAge: 1000*60*10      //10 MINUTES OF SESSION TIME.
}));

app.get('/', function(req, res, next)     //serve on get to /
{
  var errorMessage= req.flash('error');
  var successRegister= req.flash('success');

  var form= `<p style= "color: red" id= "error">`+errorMessage+`</p><p style="color: blue" id="success">`+successRegister+`</p><section><form action="/login" method="POST">
  <label for="username"> Username </label>
  <br>
  <input type="text" id="username" name="username">
  <br><br>
  <label for="password"> Password </label>
  <br>
  <input type= "password" id="password" name="password"><br>
  <input type="submit" id="submit" value="Login">
  <a id="register" href="/register" class="btn btn-default">Register now! </a>`;
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
  <label for="gender"> Gender: </label><br>
  <input type="radio" name="gender" value="male" checked>Male<br>
  <input type="radio" style= "color: white" name="gender" value="female">Female<br><br>
  <label for="username"> Username </label>
  <input type="text" id="username" name="username"><br>
  <label for="email"> Email </label>
  <input type= "email" id="email" name="email"><br>
  <label for="password"> Password </label>
  <input type= "password" id="password" name="password"><br>
  <input type="submit" id="regSubmit" value="Register">`;

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
      console.log("doesnt exist");
       var userToAdd= {
        "username": `${req.body.username}`,
        "password":`${req.body.password}`,
        "email":`${req.body.email}`,
        "gender":`${req.body.gender}`,
        "firstname":`${req.body.firstname}`,
        "lastname":`${req.body.lastname}`,
        "count":3
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
    console.log(array);
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
      //4) attach session_id
      req.session.user= loggedUser;
      joinRoom(req.session.user);
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

app.get('/myStats',function(req, res)
{
  var currentUser= req.session.user;        //currentUser= logged in user.
  var logout= `<a href="/logout"> Logout </a>`;
  var dash= currentUser.firstname;
//  var newHead= stats html;
//var endNew= stats html';
  //var toServe= newHead+dash+endNew;
  res.end(dash+logout);
  //res.end(toServe);
});
app.get('/logout', function(req, res)
{
  //delete the session
});
var server= http.createServer(app);
server.listen(port);
