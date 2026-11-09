/* Assistent – Plattform-Erkennung (Android-App, Windows-App, Web-App)
   Muss in jeder Seite als erstes Skript geladen werden. */
(function(){
  var par=null;try{par=window.parent&&window.parent!==window?window.parent:null}catch(e){}
  var plat=(par&&par.ASSISTENT_PLATFORM)||(window.Native||(par&&par.Native)?'android':(window.AssistentDesktop?'windows':'web'));
  window.ASSISTENT_PLATFORM=plat;
  /* Design: nur noch E-Paper */
  try{
    document.documentElement.classList.add('epaper');if(plat==='android')document.documentElement.classList.add('nat');
    var add=function(){if(document.getElementById('epcss'))return;var l=document.createElement('link');l.id='epcss';l.rel='stylesheet';l.href='epaper.css';document.head.appendChild(l)};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
  }catch(e){}
  if(plat!=='web')return;
  /* Auf github.io teilen sich alle Projektseiten eines Kontos denselben Speicher.
     Damit sich die Web-App nicht mit anderen Apps (z. B. Wochenstapel) vermischt,
     bekommen ihre Schlüssel einen eigenen Namensraum. */
  if(!/github\.io$/i.test(location.hostname))return;
  var NS='assistent:';
  try{
    var ls=window.localStorage;
    var wrap={
      getItem:function(k){return ls.getItem(NS+k)},
      setItem:function(k,v){ls.setItem(NS+k,String(v))},
      removeItem:function(k){ls.removeItem(NS+k)},
      key:function(i){var a=[];for(var j=0;j<ls.length;j++){var k=ls.key(j);if(k&&k.indexOf(NS)===0)a.push(k.slice(NS.length))}return a[i]==null?null:a[i]},
      clear:function(){var a=[];for(var j=0;j<ls.length;j++){var k=ls.key(j);if(k&&k.indexOf(NS)===0)a.push(k)}a.forEach(function(k){ls.removeItem(k)})}
    };
    Object.defineProperty(wrap,'length',{get:function(){var n=0;for(var j=0;j<ls.length;j++){var k=ls.key(j);if(k&&k.indexOf(NS)===0)n++}return n}});
    Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return wrap}});
  }catch(e){}
  try{
    var open=indexedDB.open.bind(indexedDB);
    indexedDB.open=function(name,v){return v===undefined?open('assistent-'+name):open('assistent-'+name,v)};
  }catch(e){}
})();
