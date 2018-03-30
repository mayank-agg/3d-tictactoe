var clickId = 'x';


window.onload = function(){
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
      button.col = i;
      button.row = j;
      button.grid = options.containerId;
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
      button.setAttribute('onclick','onButtonClick(this)');
      container.appendChild(button);
    }
    container.innerHTML += '<br/>'
  }
  //container.style.backgroundColor = options.borderColor;
  //container.style.transform = 'rotateX('+options.perspective+'deg)';
  grid.appendChild(container);
  grid.innerHTML += '<br/>';
}

function onButtonClick(b){
  b.style.color = 'blue';
  b.style.fontWeight = 'bold';
  b.innerText = clickId;
}
