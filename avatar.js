/* Assistent – Avatar-Moderator für die Bereiche (Kalender, Projekte, Pinnwand, Wetter).
   Text und Figur kommen von der Startseite (gleicher Avatar, gleiche Daten). Akkuschonend:
   kein Zeitgeber, keine Dauer-Animation – neu gezeichnet wird nur beim Öffnen des Bereichs. */
(function(){
  var area=(document.currentScript&&document.currentScript.dataset.area)||'';
  var P=window.parent&&window.parent!==window?window.parent:null;
  if(!P||!area)return;
  var css='.avm{display:flex;align-items:center;gap:10px;width:calc(100% - 28px);max-width:760px;margin:4px auto 10px;padding:8px 14px 8px 8px;border:0;border-radius:16px;background:#fff;box-shadow:0 1px 0 rgba(0,0,0,.05),0 2px 10px rgba(0,0,0,.04);text-align:left;font:inherit;color:#111;cursor:pointer;box-sizing:border-box}'+
    '.avm .mav{flex:none;width:52px;height:52px;border-radius:50%;overflow:hidden;background:#fff;border:2px solid #111}'+
    '.avm .mbub{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}'+
    '.avm .mt{font-size:14px;line-height:1.35;color:#111!important;font-weight:500;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'+
    '.avm .ms{font-size:12px;font-weight:700;color:#007AFF!important}.avm .ms:empty{display:none}'+
    '.avm.mnew .mav{animation:avmPop .5s cubic-bezier(.3,1.6,.5,1)}@keyframes avmPop{0%{transform:scale(.85)}60%{transform:scale(1.06)}100%{transform:none}}'+
    '@media (prefers-reduced-motion:reduce){.avm.mnew .mav{animation:none}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  function render(){
    var r=null;try{r=P.call('start','modFor',area)}catch(e){}
    var el=document.getElementById('avm');
    if(!r){if(el)el.style.display='none';return}
    if(!el){el=document.createElement('button');el.id='avm';el.className='avm';el.type='button';
      var m=document.querySelector('main');if(!m)return;m.parentNode.insertBefore(el,m);
      el.addEventListener('click',function(e){
        var face=e.target.closest('[data-brief]'),a=el.dataset.act||'';
        if(face||a==='brief'){try{P.showTab('start');setTimeout(function(){P.call('start','openBriefing')},60)}catch(_){}return}
        if(a.indexOf('tab:')===0){try{P.showTab(a.slice(4))}catch(_){}return}
        if(a.indexOf('start:')===0){try{P.showTab('start');var f=a.slice(6);setTimeout(function(){P.call('start',f)},60)}catch(_){}return}
      })}
    el.style.display='';el.dataset.act=r.act||'';
    if(el.__h!==r.html){var first=!el.__h;el.innerHTML=r.html;el.__h=r.html;if(!first){el.classList.remove('mnew');void el.offsetWidth;el.classList.add('mnew')}}
  }
  var o=window.onShow;window.onShow=function(){var x;if(typeof o==='function')x=o.apply(this,arguments);try{render()}catch(_){}return x};
  /* Seiten, die onShow erst später setzen, werden nachträglich umhüllt */
  setTimeout(function(){if(window.onShow&&!window.onShow.__avm){var o2=window.onShow;window.onShow=function(){var x=o2.apply(this,arguments);try{render()}catch(_){}return x};window.onShow.__avm=1}},0);
  window.onShow.__avm=1;
  document.addEventListener('visibilitychange',function(){if(!document.hidden)try{render()}catch(_){}});
  setTimeout(render,1800);
})();
