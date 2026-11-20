/* Assistent – Begleiter-Figur im Stil der alten Office-Assistenten (eigene Figuren: Klementine, Bit, Olli).
   Ersetzt die Avatar-Leiste: frei verschiebbare Figur mit Sprechblase und Menü, reagiert aufs Abhaken.
   Akkuschonend: Animationen laufen nur ein paar Sekunden nach einem Ereignis, danach steht die Figur still. */
(function(){
"use strict";
const NAMES=['Klementine','Bit','Olli'];
const KEY='planer.buddy',POS='planer.buddy.pos',SEEN='planer.buddy.seen';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function kind(){let k=0;try{const v=localStorage.getItem(KEY);if(v!==null)k=+v}catch(_){}return isNaN(k)?0:k}
function moodOf(m){return m==='happy'||m==='proud'?'happy':m==='busy'?'think':m==='sleepy'?'sleepy':m==='think'?'think':'normal'}

/* ---------------- Figuren (SVG, 100×100) ---------------- */
function eyes(x1,x2,y,rx,ry,pr,mood,white,pupil){
  let s='';
  for(const x of [x1,x2]){
    if(mood==='happy')s+='<path d="M'+(x-rx*.8)+' '+(y+2)+'Q'+x+' '+(y-ry*1.1)+' '+(x+rx*.8)+' '+(y+2)+'" fill="none" stroke="'+pupil+'" stroke-width="3" stroke-linecap="round"/>';
    else if(mood==='sleepy')s+='<path d="M'+(x-rx*.8)+' '+y+'Q'+x+' '+(y+ry*.6)+' '+(x+rx*.8)+' '+y+'" fill="none" stroke="'+pupil+'" stroke-width="3" stroke-linecap="round"/>';
    else{const lx=mood==='think'?2.5:0,ly=mood==='think'?-3.5:.8;
      s+='<g class="bl"><ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+white+'"/><circle cx="'+(x+lx)+'" cy="'+(y+ly)+'" r="'+pr+'" fill="'+pupil+'"/><circle cx="'+(x+lx-pr*.35)+'" cy="'+(y+ly-pr*.4)+'" r="'+(pr*.32)+'" fill="#fff" opacity=".8"/></g>'}
  }
  return s;
}
function mouth(x,y,w,col,mood){
  const talk='<ellipse class="mt" cx="'+x+'" cy="'+y+'" rx="'+(w*.35)+'" ry="3" fill="'+col+'"/>';
  let rest;
  if(mood==='happy')rest='<path d="M'+(x-w*.7)+' '+(y-1)+'A'+(w*.7)+' '+(w*.65)+' 0 0 0 '+(x+w*.7)+' '+(y-1)+'Z" fill="'+col+'"/>';
  else if(mood==='think')rest='<path d="M'+(x-w*.2)+' '+(y+1)+'L'+(x+w*.45)+' '+(y-1)+'" stroke="'+col+'" stroke-width="2.5" stroke-linecap="round"/>';
  else if(mood==='sleepy')rest='<ellipse cx="'+x+'" cy="'+(y+1)+'" rx="2.5" ry="2" fill="'+col+'"/>';
  else rest='<path d="M'+(x-w*.47)+' '+(y-1.5)+'Q'+x+' '+(y+w*.4)+' '+(x+w*.47)+' '+(y-1.5)+'" fill="none" stroke="'+col+'" stroke-width="2.5" stroke-linecap="round"/>';
  return '<g class="mr">'+rest+'</g>'+(mood==='happy'?'':talk);
}
function clementine(m){
  const arms=m==='happy'
    ?'<g class="wv"><path d="M22 58L11 44" /><path d="M78 58L89 44"/></g>'
    :'<path d="M22 64L14 73"/><path d="M78 64L86 73"/>';
  return '<g stroke="#E0701A" stroke-width="4" stroke-linecap="round" fill="none">'+arms+'</g>'+
    '<path d="M50 30L52 21" stroke="#6B4A2B" stroke-width="3" stroke-linecap="round"/>'+
    '<ellipse cx="62" cy="24" rx="10" ry="5" fill="#2E9E4A" transform="rotate(-28 60 24)"/>'+
    '<circle cx="50" cy="59" r="30" fill="#FF8A1F"/><ellipse cx="38" cy="43" rx="8" ry="6" fill="#fff" opacity=".32"/>'+
    '<circle cx="64" cy="76" r="1.2" fill="#A04000" opacity=".15"/><circle cx="36" cy="74" r="1.2" fill="#A04000" opacity=".15"/><circle cx="70" cy="50" r="1.2" fill="#A04000" opacity=".15"/>'+
    '<circle cx="34" cy="67" r="4.5" fill="#FF3D6D" opacity=".33"/><circle cx="66" cy="67" r="4.5" fill="#FF3D6D" opacity=".33"/>'+
    eyes(41,59,56,6,7.5,3.3,m,'#fff','#2A1A10')+mouth(50,70,10,'#5A2A10',m);
}
function robot(m,acc){
  const eye='#4FE3FF';let e='';
  for(const x of [42.5,57.5]){
    if(m==='happy')e+='<path d="M'+(x-4)+' 51Q'+x+' 43 '+(x+4)+' 51" fill="none" stroke="'+eye+'" stroke-width="2.8" stroke-linecap="round"/>';
    else if(m==='sleepy')e+='<path d="M'+(x-3.5)+' 50h7" stroke="'+eye+'" stroke-width="2.8" stroke-linecap="round"/>';
    else{const lx=m==='think'?2:0,ly=m==='think'?-3:0;e+='<rect class="bl" x="'+(x-3.5+lx)+'" y="'+(44+ly)+'" width="7" height="10" rx="2.5" fill="'+eye+'"/>'}
  }
  const mo=m==='happy'?'<path d="M44 58.5A6 4.5 0 0 0 56 58.5" fill="none" stroke="'+eye+'" stroke-width="2.5" stroke-linecap="round"/>'
    :'<g class="mr"><path d="M46 60h8" stroke="'+eye+'" stroke-width="2.5" stroke-linecap="round"/></g><rect class="mt" x="45" y="58" width="10" height="4" rx="1.5" fill="'+eye+'"/>';
  return '<ellipse cx="50" cy="82" rx="14" ry="4" fill="'+acc+'" opacity=".22"/>'+
    '<path d="M50 28V15" stroke="#9A9A98" stroke-width="2.5" stroke-linecap="round"/><circle class="ant" cx="50" cy="13" r="3.8" fill="'+acc+'"/>'+
    '<rect x="19" y="44" width="8" height="16" rx="3" fill="#BDBDBA"/><rect x="73" y="44" width="8" height="16" rx="3" fill="#BDBDBA"/>'+
    (m==='happy'?'<g class="wv" stroke="#BDBDBA" stroke-width="3.5" stroke-linecap="round"><path d="M26 70L14 58"/><path d="M74 70L86 58"/></g>':'')+
    '<rect x="26" y="28" width="48" height="49" rx="14" fill="#EDEDEA" stroke="#CFCFCB" stroke-width="1.5"/>'+
    '<rect x="32" y="36" width="36" height="30" rx="8" fill="#262626"/>'+e+mo;
}
function owl(m){
  const wl=m==='happy'?' class="fl"':'';
  return '<g'+wl+'><ellipse cx="26" cy="61" rx="7" ry="15" fill="#6F5541" transform="rotate(10 28 50)"/><ellipse cx="74" cy="61" rx="7" ry="15" fill="#6F5541" transform="rotate(-10 72 50)"/></g>'+
    '<path d="M29 34L32 14L44 27ZM71 34L68 14L56 27Z" fill="#8B6B52"/>'+
    '<ellipse cx="50" cy="54" rx="24" ry="32" fill="#8B6B52"/><ellipse cx="50" cy="67" rx="14" ry="17" fill="#E3CFB2"/>'+
    '<g fill="none" stroke="#B89B7A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M41 64l3 3 3-3"/><path d="M53 64l3 3 3-3"/><path d="M47 72l3 3 3-3"/></g>'+
    '<circle cx="40" cy="43" r="11.5" fill="#F4E9D4"/><circle cx="60" cy="43" r="11.5" fill="#F4E9D4"/>'+
    eyes(40,60,43,8.5,8.5,4.6,m,'#fff','#1E1E1E')+
    '<path d="M45.5 52h9L50 58Z" fill="#F2A33A"/>'+(m==='happy'?'':'<path class="mt" d="M47 59h6l-3 3Z" fill="#F2A33A"/>')+
    '<ellipse cx="43" cy="86" rx="4" ry="3" fill="#F2A33A"/><ellipse cx="57" cy="86" rx="4" ry="3" fill="#F2A33A"/>';
}
function svg(k,mood,acc){
  const m=moodOf(mood);
  const fig=k===1?robot(m,acc||'#FF5A1F'):k===2?owl(m):clementine(m);
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><g class="sh"><ellipse cx="50" cy="94" rx="24" ry="3" fill="#000" opacity=".13"/></g><g class="bd">'+fig+'</g></svg>';
}
window.buddySVG=function(m,k){return svg(k==null?kind():k,m)};
window.buddyKind=kind;

/* ---------------- Oberfläche ---------------- */
const st=document.createElement('style');
st.textContent=`
.bud{position:fixed;width:64px;height:64px;z-index:45;touch-action:none;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none}
.bud[hidden],body.kbup .bud,body.kbup .bub{display:none!important}
.bud svg{overflow:visible;display:block}
.bud .bd,.bud .sh{transform-box:fill-box;transform-origin:50% 100%}
.bud .bl{transform-box:fill-box;transform-origin:50% 50%}
.bud .mt{display:none;transform-box:fill-box;transform-origin:50% 50%}
.bud.talk .mt{display:inline}.bud.talk .mr{display:none}
.bud.live .bd{animation:budBob 2.4s ease-in-out infinite}
.bud.live .sh{animation:budSh 2.4s ease-in-out infinite}
.bud.live .bl{animation:budBlink 4.3s infinite}
.bud.live.talk .mt{animation:budTalk .19s ease-in-out infinite alternate}
.bud.live .wv{animation:budWave .35s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}
.bud.live .fl{animation:budWave .16s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 0}
.bud.live .ant{animation:budAnt 1s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 50%}
.bud.hop{animation:budHop .7s cubic-bezier(.3,1.5,.5,1)}
@keyframes budBob{0%,100%{transform:translateY(1.5px)}50%{transform:translateY(-2px)}}
@keyframes budSh{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.85)}}
@keyframes budBlink{0%,95%,100%{transform:none}97%{transform:scaleY(.1)}}
@keyframes budTalk{from{transform:scaleY(.45)}to{transform:scaleY(1.5)}}
@keyframes budWave{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}
@keyframes budAnt{from{transform:scale(.85)}to{transform:scale(1.15)}}
@keyframes budHop{0%{transform:none}35%{transform:translateY(-14px)}65%{transform:translateY(2px)}100%{transform:none}}
.bub{position:fixed;z-index:46;max-width:min(290px,calc(100vw - 24px));box-sizing:border-box;padding:12px 10px 10px 14px;border-radius:14px;background:#FFFBE3;border:1px solid #E7DDA6;box-shadow:0 10px 30px -10px rgba(40,30,0,.35);font:500 14px/1.38 -apple-system,system-ui,"Segoe UI",Roboto,sans-serif;color:#111;transform-origin:var(--ox,90%) var(--oy,100%);animation:bubIn .18s ease-out}
.bub .bt{display:flex;gap:8px;align-items:flex-start}.bub .bt span{flex:1;white-space:pre-line}
.bub .bx{flex:none;border:0;background:none;color:#999;font-size:13px;padding:0 4px 6px 8px;cursor:pointer}
.bub .bo{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 2px;font:inherit;font-weight:600;color:#111;cursor:pointer;border-radius:8px}
.bub .bo:active{background:rgba(0,0,0,.05)}
.bub .bo i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#007AFF;margin:0 10px 1px 2px;vertical-align:middle}
.bub .bos{margin-top:6px}
.bub:after{content:"";position:absolute;left:var(--tx,80%);width:14px;height:14px;background:#FFFBE3;border:1px solid #E7DDA6;transform:rotate(45deg);border-top:0;border-left:0;bottom:-8px}
.bub.below:after{bottom:auto;top:-8px;border:1px solid #E7DDA6;border-bottom:0;border-right:0}
@keyframes bubIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.bud.live *,.bud.hop,.bub{animation:none!important}}
`;
document.head.appendChild(st);

const el=document.createElement('div');el.className='bud';el.id='bud';el.setAttribute('role','button');el.setAttribute('aria-label','Assistent');
document.body.appendChild(el);
let mood='normal',cur=null,bub=null,hideT=0,liveT=0,talkT=0,moodT=0,lastShown={};
function paint(){el.innerHTML=svg(kind(),mood,"#007AFF")}
function live(ms){el.classList.add('live');clearTimeout(liveT);liveT=setTimeout(()=>el.classList.remove('live'),ms||12000)}
function setMood(m,ms){mood=moodOf(m);paint();clearTimeout(moodT);if(ms)moodT=setTimeout(()=>{mood=cur?moodOf(cur.mood):'normal';paint()},ms)}
function hop(){el.classList.remove('hop');void el.offsetWidth;el.classList.add('hop');live()}
function haptic(){try{window.Native&&Native.haptic&&Native.haptic()}catch(_){}}

/* Position: Standard unten rechts über der Leiste; verschoben wird per Ziehen, gespeichert als Anteil des Fensters */
function place(){
  let p=null;try{p=JSON.parse(localStorage.getItem(POS)||'null')}catch(_){}
  const W=innerWidth,H=innerHeight;
  if(p&&typeof p.x==='number'){el.style.left=Math.max(0,Math.min(W-64,p.x*W))+'px';el.style.top=Math.max(0,Math.min(H-64,p.y*H))+'px';el.style.right=el.style.bottom=''}
  else{el.style.left=el.style.top='';el.style.right='12px';el.style.bottom='calc(var(--tab,72px) + var(--sb,0px) + 10px)'}
}
let dn=null,drag=false;
el.addEventListener('pointerdown',e=>{dn={x:e.clientX,y:e.clientY,r:el.getBoundingClientRect()};drag=false;try{el.setPointerCapture(e.pointerId)}catch(_){}});
el.addEventListener('pointermove',e=>{if(!dn)return;const dx=e.clientX-dn.x,dy=e.clientY-dn.y;
  if(!drag&&Math.hypot(dx,dy)>8){drag=true;hide();live()}
  if(drag){el.style.right=el.style.bottom='';el.style.left=Math.max(0,Math.min(innerWidth-64,dn.r.left+dx))+'px';el.style.top=Math.max(0,Math.min(innerHeight-64,dn.r.top+dy))+'px'}});
el.addEventListener('pointerup',()=>{if(!dn)return;dn=null;
  if(drag){const r=el.getBoundingClientRect();try{localStorage.setItem(POS,JSON.stringify({x:r.left/innerWidth,y:r.top/innerHeight}))}catch(_){}return}
  haptic();hop();menu()});
el.addEventListener('pointercancel',()=>{dn=null});
addEventListener('resize',()=>{place();hide()});

/* ---------------- Sprechblase ---------------- */
function hide(){clearTimeout(hideT);if(bub){bub.remove();bub=null}el.classList.remove('talk')}
function say(text,m,opts){
  if(kind()<0)return;
  hide();live(Math.max(9000,text.length*80));
  const b=document.createElement('div');b.className='bub';
  b.innerHTML='<div class="bt"><span>'+esc(text)+'</span><button class="bx" aria-label="Schließen">✕</button></div>'+
    (opts&&opts.length?'<div class="bos">'+opts.map((o,i)=>'<button class="bo" data-i="'+i+'"><i></i>'+esc(o[0])+'</button>').join('')+'</div>':'');
  document.body.appendChild(b);bub=b;
  b.querySelector('.bx').onclick=hide;
  b.querySelectorAll('.bo').forEach(x=>x.onclick=()=>{haptic();const f=opts[+x.dataset.i][1];hide();try{f()}catch(_){}});
  const r=el.getBoundingClientRect(),bw=b.offsetWidth,bh=b.offsetHeight;
  let x=Math.max(12,Math.min(innerWidth-bw-12,r.right-bw+10)),y=r.top-bh-10,below=false;
  if(y<12){y=r.bottom+10;below=true}
  b.style.left=x+'px';b.style.top=y+'px';b.classList.toggle('below',below);
  const tx=Math.max(14,Math.min(bw-28,r.left+r.width/2-x-7));
  b.style.setProperty('--tx',tx+'px');b.style.setProperty('--ox',(tx+7)+'px');b.style.setProperty('--oy',below?'0':'100%');
  setMood(m||'normal',2600);
  el.classList.add('talk');clearTimeout(talkT);talkT=setTimeout(()=>el.classList.remove('talk'),Math.min(2600,700+text.length*30));
  if(!opts||!opts.length)hideT=setTimeout(hide,Math.max(5000,text.length*75));
}

/* ---------------- Inhalte ---------------- */
function P(){return window}
function runAct(a){
  if(!a)return;
  if(a==='brief'){showTab('start');setTimeout(()=>call('start','openBriefing'),80);return}
  if(a.indexOf('tab:')===0){showTab(a.slice(4));return}
  if(a==='woche:plan'){showTab('woche',{plan:true});return}
  if(a.indexOf('start:')===0){showTab('start');const f=a.slice(6);setTimeout(()=>call('start',f),80);return}
  if(a.indexOf('home:')===0){showTab('start');const f=a.slice(5);setTimeout(()=>call('start','modAct',f),80);return}
  showTab('start');setTimeout(()=>call('start','modAct',a),80);
}
const TIPS=[
  'Halte mich gedrückt und zieh mich dorthin, wo ich dich nicht störe.',
  'Jede erledigte Aufgabe spielt den nächsten Ton – das kannst du in den Einstellungen abschalten.',
  'Plane einmal pro Woche: Priorität, Woche, Monat. Zehn Minuten sparen dir Stunden.',
  'Nimm dir immer nur die nächste Aufgabe vor. Der Rest wartet.',
  'Alles, was dir durch den Kopf geht, gehört in den Eingang – geklärt wird später.',
  'Im Briefing siehst du Termine, Aufgaben, Mails und Wetter auf einer Seite.',
  'Termine stehen im Kalender, Aufgaben in der Woche, Ideen auf der Pinnwand.',
  'Bei jedem Projekt hilft ein konkreter nächster Schritt. Je kleiner, desto besser.'];
let tipI=Math.floor(Math.random()*TIPS.length);
function tip(){tipI=(tipI+1)%TIPS.length;say(TIPS[tipI],'think',[['Noch ein Tipp',tip],['Danke!',()=>{setMood('happy',1500);hop()}]])}
function intro(){
  const k=kind();if(k<0)return;hop();
  say('Hallo, ich bin '+NAMES[k]+', '+(k===0?'deine Assistentin':'dein Assistent')+'! Tipp mich an, wenn du Hilfe brauchst – oder zieh mich woandershin.','happy');
}
function menu(){
  const t=cur&&cur.t?cur.t:'Hallo! Wobei kann ich helfen?';
  const o=[];
  if(cur&&cur.s&&cur.act)o.push([cur.s.replace(/^▶\s*/,''),()=>runAct(cur.act)]);
  o.push(['Briefing für heute',()=>runAct('brief')]);
  o.push(['Neue Aufgabe',()=>{showTab('start');setTimeout(()=>call('start','openAdd'),80)}]);
  o.push(['Gib mir einen Tipp',tip]);
  o.push(['Andere Figur',()=>{const k=(kind()+1)%3;try{localStorage.setItem(KEY,k)}catch(_){}paint();intro()}]);
  o.push(['Ausblenden',()=>{say('Alles klar, bis bald! In den Einstellungen („Dein Assistent“) holst du mich zurück.','normal');setTimeout(()=>window.buddySet(-1),2800)}]);
  say(t,cur?cur.mood:'normal',o);
}

/* Wird von der Hülle bei Bereichswechsel/Rückkehr aufgerufen: Text vom Moderator der Startseite */
let lastArea=null;
window.buddyUpdate=function(r,area){
  if(kind()<0){el.hidden=true;hide();return}
  el.hidden=false;
  cur=r||null;
  const nm=cur?moodOf(cur.mood):'normal';
  if(!bub&&nm!==mood){mood=nm;paint()}
  const moved=area!==lastArea;lastArea=area;
  if(!cur||!cur.t)return;
  let first=false;try{first=!localStorage.getItem(SEEN)}catch(_){}
  const key=cur.t.replace(/[0-9]+/g,'#');
  if(first){try{localStorage.setItem(SEEN,'1')}catch(_){}lastShown[area]=key;setTimeout(intro,400);return}
  /* Von selbst spricht die Figur nur beim Wechsel in einen Bereich und nur bei neuer Nachricht (Minutenangaben zählen nicht) */
  if(moved&&lastShown[area]!==key&&!bub){lastShown[area]=key;hop();say(cur.t,cur.mood,cur.s&&cur.act?[[cur.s.replace(/^▶\s*/,''),()=>runAct(cur.act)],['Später',()=>{}]]:null)}
};
/* Reaktion aufs Abhaken (aus playNote) */
window.buddyDone=function(final){
  if(kind()<0)return;
  if(final){hop();say('Stark – für heute ist alles erledigt!','happy');return}
  if(Math.random()<.34){const a=['Abgehakt!','Eins weniger.','Weiter so!','Läuft bei dir.'];hop();say(a[Math.floor(Math.random()*a.length)],'happy')}
  else{setMood('happy',1400);hop()}
};
window.buddySet=function(k){try{localStorage.setItem(KEY,k)}catch(_){}hide();if(k<0){el.hidden=true;return}el.hidden=false;paint();place()};
window.buddyIntro=intro;
window.buddyOn=true;

place();paint();if(kind()<0)el.hidden=true;
document.addEventListener('visibilitychange',()=>{if(document.hidden){el.classList.remove('live');hide()}});
})();
