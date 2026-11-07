/* Assistent – Fokus-Timer (aus „Kleine Dinge“)
   S = 10 Min, M = 20 Min, L = 2 × 25 Min mit 5 Min Pause.
   Android: läuft nativ als Benachrichtigung (auch Sperrbildschirm). Windows/Web: hier im Fenster. */
(function(){
"use strict";
const N=window.Native||null;
const NATIVE=!!(N&&typeof N.focusStart==='function');
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS='planer.focus.state',EV='planer.focus.events',LOG='planer.fokus';
const BASE={S:10,M:20,L:55};

/* ---------- Gelernte Dauer ---------- */
function log(){try{const l=JSON.parse(localStorage.getItem(LOG)||'{}');return Array.isArray(l.log)?l.log:[]}catch(e){return[]}}
function addLog(e){const l=log();l.push(e);try{localStorage.setItem(LOG,JSON.stringify({log:l.slice(-90)}))}catch(_){}}
function learned(size){
  const m=log().filter(x=>x.size===size).slice(-12).map(x=>x.mins).sort((a,b)=>a-b);
  if(m.length<3)return null;return m[Math.floor(m.length/2)];
}
function minutes(size){return learned(size)||BASE[size]||10}

/* ---------- Ablauf im Browser (Windows/Web) ---------- */
function jsLoad(){try{return JSON.parse(localStorage.getItem(LS)||'null')}catch(e){return null}}
function jsStore(o){try{o?localStorage.setItem(LS,JSON.stringify(o)):localStorage.removeItem(LS)}catch(e){}}
function plan(size){return size==='L'?[{k:'w',m:25},{k:'p',m:5},{k:'w',m:25}]:[{k:'w',m:size==='M'?20:10}]}
function seg(o,now){const ph=o.plan[o.idx];Object.assign(o,{endAt:now+ph.m*60000,segStart:now,paused:false,over:false,left:0})}
function notifyDesk(t,b){try{if(window.Notification&&Notification.permission==='granted')new Notification(t,{body:b,silent:false})}catch(e){}}
const JS={
  start(j){const o=Object.assign({},j,{plan:plan(j.size),idx:0,workMs:0,startedAt:Date.now()});seg(o,Date.now());jsStore(o);
    try{if(window.Notification&&Notification.permission==='default')Notification.requestPermission()}catch(e){}return o},
  op(op){const o=jsLoad();if(!o)return null;const now=Date.now(),w=o.plan[o.idx].k==='w';
    if(op==='pause'&&!o.paused&&!o.over){if(w)o.workMs+=now-o.segStart;o.left=Math.max(0,o.endAt-now);o.paused=true}
    else if(op==='resume'&&o.paused){o.endAt=now+o.left;o.segStart=now;o.paused=false}
    else if(op==='plus5'){if(o.over){o.plan[o.idx].k='w';Object.assign(o,{endAt:now+300000,segStart:now,over:false,paused:false})}else if(o.paused)o.left+=300000;else o.endAt+=300000}
    else if(op==='end'&&!o.paused&&!o.over&&now>=o.endAt-1500){if(w)o.workMs+=o.endAt-o.segStart;
      if(o.idx+1<o.plan.length){o.idx++;seg(o,now);const nw=o.plan[o.idx].k==='w';notifyDesk(nw?"Weiter geht's":'Kurze Pause',nw?'Die zweite Runde beginnt – 25 Minuten.':'5 Minuten durchatmen.')}
      else{o.over=true;notifyDesk('Zeit um','„'+o.title+'“ – erledigt? Oder noch 5 Minuten?')}}
    else if(op==='done'){if(!o.paused&&!o.over&&w)o.workMs+=now-o.segStart;
      let ev=[];try{ev=JSON.parse(localStorage.getItem(EV)||'[]')}catch(e){}
      ev.push({task:o.task,step:o.step,size:o.size,mins:Math.max(1,Math.round(o.workMs/60000)),at:now,done:true});
      try{localStorage.setItem(EV,JSON.stringify(ev))}catch(e){}jsStore(null);return null}
    else if(op==='stop'){jsStore(null);return null}
    jsStore(o);return o},
  state(){const o=jsLoad();if(o&&!o.paused&&!o.over&&Date.now()>=o.endAt)return JS.op('end');return o},
  drain(){let ev=[];try{ev=JSON.parse(localStorage.getItem(EV)||'[]')}catch(e){}try{localStorage.removeItem(EV)}catch(e){}return ev}
};
const ENG=NATIVE?{
  start(j){return JSON.parse(N.focusStart(JSON.stringify(j))||'null')},
  op(op){return JSON.parse(N.focusOp(op)||'null')},
  state(){return JSON.parse(N.focusState()||'null')},
  drain(){return JSON.parse(N.focusDrain()||'[]')}
}:JS;

/* ---------- Erledigtes übernehmen ---------- */
function apply(){
  let ev=[];try{ev=ENG.drain()||[]}catch(e){}
  if(!ev.length)return;
  for(const e of ev){
    addLog({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),size:e.step?'S':e.size,mins:e.mins,at:e.at});
    if(!e.done||!e.task)continue;
    try{
      if(e.task.indexOf('p:')===0){const [pid,tid]=e.task.slice(2).split('|');window.call&&call('projekte','toggleTask',pid,tid)}
      else if(e.task==='green'){/* Nachhaltigkeits-Idee */const w=$('f-start').contentWindow;w.markGreen&&w.markGreen()}
      else if(e.step)call('woche','completeStep',e.task,e.step);
      else call('woche','completeTask',e.task);
    }catch(_){}
  }
  try{window.playNote&&playNote(false)}catch(_){}
  refreshStart();
}
function refreshStart(){try{const w=$('f-start').contentWindow;w&&w.onFocus&&w.onFocus()}catch(e){}}

/* ---------- Oberfläche ---------- */
let el=null,tick=null,cur=null;
function build(){
  const st=document.createElement('style');
  st.textContent=`
.fk{position:fixed;inset:0;z-index:65;background:#fff;display:flex;flex-direction:column;align-items:center;padding:calc(20px + env(safe-area-inset-top,0px)) 24px calc(28px + env(safe-area-inset-bottom,0px));transform:translateY(100%);transition:transform .3s cubic-bezier(.2,.8,.2,1);visibility:hidden}
.fk.on{transform:none;visibility:visible}
.fk .top{width:100%;max-width:520px;display:flex;align-items:center}
.fk .x{width:38px;height:38px;border-radius:50%;background:#F2F3F5;display:grid;place-items:center;color:#8A8F98;border:0}
.fk .eb{margin-left:12px;font-size:14px;font-weight:600;color:#8A8F98}
.fk .tt{margin:26px 0 0;max-width:520px;width:100%;text-align:center;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-.02em;color:#1C1C1E}
.fk .sb{margin-top:6px;text-align:center;color:#8A8F98;font-size:14.5px;font-weight:500}
.fk .ring{position:relative;width:min(68vw,280px);aspect-ratio:1;margin:auto 0}
.fk .ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.fk .ring .tm{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.fk .ring b{font-size:min(15vw,62px);font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums;color:#1C1C1E}
.fk .ring small{font-size:14px;font-weight:600;color:#8A8F98;margin-top:2px}
.fk .bt{width:100%;max-width:420px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fk .bt .d-btn{height:52px;font-size:16px}
.fk .bt .primary{grid-column:1/-1}
.fk .cn{margin-top:14px;background:none;border:0;color:#8A8F98;font-size:14px;font-weight:600}
.fk.pause .ring circle.p{stroke:#2FB3A6}
.fk.over .ring b{color:#2A82F6}
`;
  document.head.appendChild(st);
  el=document.createElement('section');el.className='fk';el.id='fk';
  el.innerHTML='<div class="top"><button class="x" id="fkX" aria-label="Ausblenden"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></button><span class="eb" id="fkE">Fokus</span></div>'+
    '<h2 class="tt" id="fkT"></h2><div class="sb" id="fkS"></div>'+
    '<div class="ring"><svg viewBox="0 0 120 120"><defs><linearGradient id="fkGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4CC2F7"/><stop offset=".6" stop-color="#4F96FB"/><stop offset="1" stop-color="#7B7CFF"/></linearGradient></defs><circle cx="60" cy="60" r="52" fill="none" stroke="#FFFFFF" stroke-width="9"/><circle class="p" id="fkP" cx="60" cy="60" r="52" fill="none" stroke="#2A82F6" stroke-width="9" stroke-linecap="round" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg><div class="tm"><b id="fkM">10:00</b><small id="fkR"></small></div></div>'+
    '<div class="bt" id="fkB"></div><button class="cn" id="fkC">Abbrechen</button>';
  document.body.appendChild(el);
  $('fkX').onclick=hide;
  $('fkC').onclick=()=>{ENG.op('stop');cur=null;hide();refreshStart()};
  $('fkB').onclick=e=>{const b=e.target.closest('[data-op]');if(!b)return;try{N&&N.haptic()}catch(_){}
    const op=b.dataset.op;cur=ENG.op(op);if(op==='done'){apply();hide();try{window.playNote&&playNote(false)}catch(_){}return}paint()};
}
const mmss=ms=>{ms=Math.max(0,ms);const s=Math.round(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function paint(){
  if(!el)return;
  const o=cur;if(!o){hide();return}
  const ph=o.plan[o.idx],w=ph.k==='w',now=Date.now();
  const left=o.over?0:o.paused?o.left:o.endAt-now,tot=ph.m*60000;
  el.classList.toggle('pause',!w);el.classList.toggle('over',!!o.over);
  $('fkE').textContent=(w?'Fokus':'Pause')+' · '+o.size+(o.plan.length>1?(w?' · Runde '+(Math.floor(o.idx/2)+1)+' von 2':''):'');
  $('fkT').textContent=o.title||'Fokus';
  $('fkS').textContent=o.over?'Zeit um. Erledigt – oder noch 5 Minuten?':o.paused?'Pausiert':w?'Nur dieser eine Schritt. Alles andere wartet.':'Kurz aufstehen, Wasser trinken, durchatmen.';
  $('fkM').textContent=o.over?'Fertig':mmss(left);
  $('fkR').textContent=o.over?'':o.paused?'pausiert':'noch';
  $('fkP').style.strokeDashoffset=(326.7*(1-Math.min(1,Math.max(0,left/tot)))).toFixed(1);
  const B=(op,t,c)=>'<button class="d-btn'+(c?' '+c:'')+'" data-op="'+op+'">'+t+'</button>';
  $('fkB').innerHTML=o.over?B('done','Erledigt','primary')+B('plus5','+5 Min')+B('stop','Beenden'):
    B(o.paused?'resume':'pause',o.paused?'Weiter':'Pause')+B('plus5','+5 Min')+B('done','Erledigt','primary');
}
function loop(){
  clearInterval(tick);
  tick=setInterval(()=>{
    try{cur=ENG.state()}catch(e){cur=null}
    apply();
    if(!cur){clearInterval(tick);tick=null;hide();refreshStart();return}
    if(el&&el.classList.contains('on'))paint();
    refreshStart();
  },1000);
}
function show(){if(!el)build();try{cur=ENG.state()}catch(e){cur=null}if(!cur)return false;paint();el.classList.add('on');try{N&&N.setBars(document.documentElement.classList.contains('glass')?'#DDE6FD':document.documentElement.classList.contains('epaper')?'#FFFFFF':'#86CEFA',true)}catch(_){}loop();return true}
function hide(){if(!el||!el.classList.contains('on'))return false;el.classList.remove('on');try{window.updateBar&&updateBar()}catch(_){}return true}

window.Fokus={
  start(j){/* {title, task, step, size} */try{cur=ENG.start(j)}catch(e){cur=null}if(!el)build();paint();el.classList.add('on');loop();refreshStart();return !!cur},
  open:show,hide,
  state(){try{return ENG.state()}catch(e){return null}},
  minutes,learned,native:NATIVE,
  apply,
  log
};
/* Zurück schließt die Ansicht (Timer läuft weiter) */
const hb=window.handleBack;window.handleBack=function(){if(hide())return true;return hb?hb():false};
const rs=window.onResumeApp;window.onResumeApp=function(){if(rs)rs();apply();try{if(ENG.state())loop()}catch(e){}};
setTimeout(()=>{apply();try{if(ENG.state())loop()}catch(e){}},1200);
})();
