var socket= io("http://localhost:33108");
var playername;
var userObj;
var clickId;
var myTimer;

var mCells = new Object;
window.onload = function(){

  $('#waiting-message').show();
  var options1 = {
    width:50,
    height:50,
    offset:5,
    cellColor: 'white',
    borderColor: 'black',
    containerId: 'grid1'
  }
  var options2 = {
    width:50,
    height:50,
    offset:5,
    cellColor: 'white',
    borderColor: 'blue',
    containerId: 'grid2'
  }
  var options3 = {
    width:50,
    height:50,
    offset:5,
    cellColor: 'white',
    borderColor: 'blue',
    containerId: 'grid3'
  }

  createGrid(3,3,options1);
  createGrid(3,3,options2);
  createGrid(3,3,options3);
}

function createGrid(cols,rows,options,margin){

  var grid = document.getElementById('grid-container');
  var color = 'black';
  var container = document.createElement('div');
  container.setAttribute('id',options.containerId);

  for(var i=0;i<cols;i++){
    for(var j=0;j<rows;j++){
      var button = document.createElement('button');
      button.row = i;
      button.col = j;
      button.grid = options.containerId;

      button.setAttribute('id',button.row+''+button.col+''+button.grid);
      button.style.width = options.width + 'px';
      button.style.height = options.height + 'px';

      button.style.borderStyle = 'solid';
      button.style.borderWidth = options.offset + 'px';
      button.style.outline = '0';


      button.setAttribute('class','grid-btn');

      if(options.cellColor){
        button.style.backgroundColor = options.cellColor;
        button.style.color = options.cellColor;
      }

      if(options.borderColor){
        button.style.borderColor = options.borderColor;
      }

      if(j == 0){
        button.style.borderLeftWidth = '0px';
      }
      if(j == cols - 1){
        button.style.borderRightWidth = '0px';
      }

      if(i == 0){
        button.style.borderTopWidth = '0px';
      }
      if(i == rows - 1){
        button.style.borderBottomWidth = '0px';
      }
      button.innerText = 'n';
      button.setAttribute('onclick','onButtonClick()');
      container.appendChild(button);
      mCells[button.id] = button;
    }
    container.innerHTML += '<br/>'
  }
  //container.style.backgroundColor = options.borderColor;
  //container.style.transform = 'rotateX('+options.perspective+'deg)';
  grid.appendChild(container);
  grid.innerHTML += '<br/>';
}

function onButtonClick(){
  if(event.target.innerHTML == 'n'){
    var cell = event.target;
    /*cell.style.color = 'blue';
    cell.style.fontWeight = 'bold';
    cell.innerText = clickId;*/

    //example usage of getting cell col row and grid
    var col = getCellCol(cell.id);
    var row = getCellRow(cell.id);
    var grid = getcellGridNumber(cell.id);
    console.log(userObj);
    socket.emit('madeMove', clickId,col,row,grid,userObj.room,$('#username').text());
  }
}

function getCellCol(id){
  return mCells[id].col;
}

function getCellRow(id){
  return mCells[id].row;
}

function getcellGridNumber(id){
  return mCells[id].grid;
}

var logoutBut= document.getElementById('logout-btn');
logoutBut.addEventListener('click', function()
{
  console.log(userObj.room);
  socket.emit('disconnectMe',userObj.room);
//  socket.close();
//  socket.close();  //will emit disconnect event.
});
var quitBut= document.getElementById('quit');
console.log(quitBut);
quitBut.addEventListener('click', function()
{
  socket.emit('gameQuit', userObj.room);
  location.href= '/myStats';
});
socket.on('welcome', function(user)
{
  playerName = user.username;

  alert("Hello "+playerName+", Welcome to 3D Tic-tac-toe.");
  socket.emit("JoinRoom",user);
});
socket.on('newMove', function(symbol,col,row,grid)
{

  col= col.toString();
  row= row.toString();
  var makeID= row+col+grid;
  //makeID= makeID.toString();
  console.log(makeID);
  var myCell= document.getElementById(makeID);
  myCell.style.color = 'blue';
  myCell.style.fontWeight = 'bold';
  myCell.innerText = symbol;
});
socket.on('playerJoined', function(playerName)
{
  alert(playerName+" joined!");
});
socket.on('playerLeft', function()
{
  clearInterval(myTimer);
  alert("Other player left!");
});

document.forms[0].onsubmit = function () {
    var input = document.getElementById("message");
		var msg = playerName+": " + input.value;
    printMessage(msg);
    socket.emit('chat',msg,userObj.room);
    input.value = '';
};
socket.on('message', function(message)
{
  printMessage(message);
});

var second=0;
var minute=0;
var hour=0;
var timer= document.getElementById('game-timer');
function startTimer()
{
  second++;

  if(second>=60)
  {
    second=0;
    minute++;
    if(minute >=60)
    {
      minute=0;
      hour++;
    }
  }
  if(second < 10)
  {
    if(minute < 10)
    {
      if(hour < 10)
      {
        timer.innerText= '0'+hour+":"+'0'+minute+':'+'0'+second;
      }
      else //second < 10, minute<10, hour>10.
      {
        timer.innerText= hour+":"+'0'+minute+':'+'0'+second;
      }
    }
    else  //minute>10 && second<10.
    {
      if(hour>10)
      {
          timer.innerText= hour+":"+minute+':'+'0'+second;
      }
      else
      {
        timer.innerText= '0'+hour+":"+minute+':'+'0'+second;
      }
    }
  }
  else //Second > 10.
  {
    if(minute < 10)
    {
      if(hour < 10)
      {
        timer.innerText= '0'+hour+":"+'0'+minute+':'+second;
      }
      else //second > 10, minute<10, hour>10.
      {
        timer.innerText= hour+":"+'0'+minute+':'+second;
      }
    }
    else  //minute>10 && second>10.
    {
      if(hour>10)
      {
        timer.innerText= hour+":"+minute+':'+second;
      }
      else
      {
        timer.innerText= '0'+hour+":"+minute+':'+second;
      }
    }
  }
}

socket.on("RoomStatus",function(code,user){
  userObj = user;
  /*if(document.getElementById('username').innerText == user.username){
    clickId = user.moveSymbol;
  }*/
  if(code == 0){
    $("#waiting-message").hide();
    $("#game-body").show();
  //  console.log("starting the timer");
     myTimer= setInterval(startTimer, 1000);        //starts the timer.
  }else{
    $("#waiting-message").show();
  }
});

function printMessage(message) {
    var p = document.createElement("p");
    console.log(message);
    p.style.color= 'white';
    p.style.margin= "5px";
    p.innerText = message;
    console.log(p);
  //  document.querySelector("div.messages").appendChild(p);
  document.getElementById("box").appendChild(p);
}
