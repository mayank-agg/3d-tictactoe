var socket= io("http://localhost:33108");
var playername;
var userObj;
var clickId = 'x';
var lastMoveMade = null;

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
      button.innerText = 'o';
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

  if(clickId != lastMoveMade || lastMoveMade == null){
    var cell = event.target;
    cell.style.color = 'blue';
    cell.style.fontWeight = 'bold';
    cell.innerText = clickId;

    //example usage of getting cell col row and grid
    var col = getCellCol(cell.id);
    var row = getCellRow(cell.id);
    var grid = getcellGridNumber(cell.id);
    lastMoveMade = clickId;

    socket.emit('madeMove', clickId,col,row,grid,userObj.room);
  }else{
    alert("go away!!");
  }
  console.log(clickId +","+lastMoveMade);
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
  socket.close();  //will emit disconnect event.
});
logoutBut.addEventListener('click', function()
{
  location.href= '/logout';
});
socket.on('welcome', function(user)
{
  playerName = user.username;

  alert("Hello "+playerName+", Welcome to 3D Tic-tac-toe.");
  socket.emit("JoinRoom",user);
});
socket.on('newMove', function(clickId,col,row,grid)
{

  col= col.toString();
  row= row.toString();
  var makeID= row+col+grid;
  //makeID= makeID.toString();
  console.log(makeID);
  var myCell= document.getElementById(makeID);
  myCell.style.color = 'blue';
  myCell.style.fontWeight = 'bold';
  myCell.innerText = clickId;
  lastMoveMade = clickId;
});
socket.on('playerJoined', function(playerName)
{
  alert(playerName+" joined!");
});
socket.on('playerLeft', function(playerName)
{
  alert("Someone left!");
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

socket.on("RoomStatus",function(code,user){
  userObj = user;
  if(document.getElementById('username').innerText == user.username){
    clickId = user.moveSymbol;
  }
  if(code == 0){
    $("#waiting-message").hide();
    $("#game-body").show();
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
