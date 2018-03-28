var clickId = 'o';

window.onload = function(){

  createGrid(3,3,65,65,6,'#e5e6e8','black','blue');
}

function createGrid(cols,rows,width,height,offset,cellColor,borderColor){

  var grid = document.getElementById('grid-container');
  var color = 'black';

  for(var i=0;i<cols;i++){
    for(var j=0;j<rows;j++){
      var button = document.createElement('button');
      button.col = i;
      button.row = j;
      button.style.width = width + 'px';
      button.style.height = height + 'px';

      button.style.borderStyle = 'solid';
      button.style.borderWidth = offset + 'px';
      button.style.outline = '0';

     button.setAttribute('class','grid-btn');

      if(cellColor){
        button.style.backgroundColor = cellColor;
        button.style.color = cellColor;
      }

      if(borderColor){
        button.style.borderColor = borderColor;
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
      grid.appendChild(button);
    }
    grid.innerHTML += '<br/>'
  }
}

function onButtonClick(b){
  b.style.color = 'blue';
  b.style.fontWeight = 'bold';
  b.innerText = clickId;
}
