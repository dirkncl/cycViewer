/*******************************************
         cycReader.js
     Dirk Levinus Nicolaas
     =====================
  To read cyc and files put it on iframe
  or stored as a book
  - Ctrl-S to save
  - Ctrl-C to close the wondow  
 ************************************/
function iframeView(html){
  var toBody = document.body;
  iframeMake(html, toBody);
}

function iframeMake(htmlFragment, toElement){
  var scrolbar = `::-webkit-scrollbar {width: 10px;height: 0px;}::-webkit-scrollbar-thumb{background-color: rgba(100,170,200, 1);border-radius: 0 1px 1px 0;}::-webkit-scrollbar-track {background: rgba(117,191,248, 0.5);}`
  var fragment = document.createDocumentFragment();
  var iframe = document.createElement('iframe');
  iframe.width = window.innerWidth-20;
  iframe.height = window.innerHeight-80;
  iframe.border='none';
  iframe.onload = function(){
    var innerDoc = this.contentWindow.document;
    innerDoc.body.innerHTML= htmlFragment;
    var style = document.createElement("style");
    style.setAttribute("type","text/css");
    style.innerHTML = `${scrolbar}`;
    innerDoc.head.appendChild(style);
  }
  fragment.appendChild(iframe);
  while (toElement.firstChild) {
    toElement.removeChild(toElement.firstChild);
  }
  toElement.appendChild(fragment);
};

var onehtml = make_onehtml();
var fs={};
var stringArray = [];
var stringHTML;
    
fs.readFile = function (file, cb){
  var rawFile = new XMLHttpRequest();
  rawFile.overrideMimeType('text/plain; charset=utf-8');
  rawFile.open("GET", file, false);
  rawFile.onreadystatechange = function () {
    if(rawFile.readyState === 4) {
      if(rawFile.status === 200 || rawFile.status == 0) {
       cb(rawFile.responseText)
      }
    }
  }
  rawFile.send(null);
}    

fs.writeFileSync = function writeFileSync(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();
  document.body.removeChild(element);
  
}
fs.readFileSync = function readFileSync(filePath) {
  let result = null;
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.overrideMimeType('text/plain; charset=utf-8');
  xmlhttp.open("GET", filePath, false);
  xmlhttp.send();
  if (xmlhttp.status === 200||xmlhttp.status === 0) {
      result = xmlhttp.responseText;
  }
  return result;
};

fs.readFile("cyc/book.cyc",function (data){       
  var dataString = data.toString();
  var dataIncludeNum = dataString.search("@include");
  var dataNew = dataString.slice(dataIncludeNum, -1);
  var dataList = dataNew.replace(/['"]+/g, '').replace(/@include+/g, '').replace(/\n+/g, '').replace(/\r+/g, '');
  var dataSplit = dataList.trim().split(" ");
  console.log(dataSplit)
  console.log(dataSplit.length + " .cyc files found")
  for(i=0; i < dataSplit.length; i +=1 ){
    const stringData = fs.readFileSync("./" + dataSplit[i]);
      stringArray.push(stringData)
  }
  console.log(stringArray.length + " .cyc Files Stringified");
  stringCombined = stringArray.join();
  var stringCyc = stringCombined.replace(/,@+/g, " @");
  stringHTML = cyc(stringCyc, onehtml);
  iframeView(stringHTML)
  }
);

document.onkeydown = function(e){
  e.preventDefault()
  if(e.ctrlKey)
    switch(e.keyCode){
      case 83:fs.writeFileSync('JavascriptEncyclopedia.html',stringHTML);break;//[ctrl-S] to save
      case 67:window.close();break;//[ctrl-C] to close
    }
    
};