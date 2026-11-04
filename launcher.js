/* Assistent – Startbildschirm (Launcher) für Android
   App-Liste, Favoriten, Suche, Gesten. Nur aktiv in der Android-App. */
(function(){
"use strict";
const N=window.Native||null;
const ON=!!(N&&typeof N.apps==='function');
const $=id=>document.getElementById(id);
const KEY='planer.launcher';
let apps=[],cfg=load();
function load(){let c={};try{c=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}c.fav=c.fav||[];c.ren=c.ren||{};c.hid=c.hid||[];return c}
function save(){try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch(e){}notifyStart()}
const keyOf=x=>x.p+'/'+x.a;
const nameOf=x=>cfg.ren[keyOf(x)]||x.l;
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function haptic(){try{N.haptic()}catch(e){}}
function toast(m){try{const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2800)}catch(e){}}

function reload(){
  if(!ON)return;
  try{apps=JSON.parse(N.apps()||'[]')}catch(e){apps=[]}
  apps.sort((a,b)=>nameOf(a).localeCompare(nameOf(b),'de',{sensitivity:'base'}));
  const keys=new Set(apps.map(keyOf));
  /* Deinstallierte Apps aus den Favoriten nehmen */
  const f=cfg.fav.filter(k=>keys.has(k));
  if(!cfg.init){cfg.init=1;if(!f.length)suggest(f);}
  if(f.length!==cfg.fav.length||cfg.init===1){cfg.fav=f;cfg.init=2;save()}
  if(drawer&&drawer.classList.contains('on'))renderList();
  notifyStart();
}
/* Beim ersten Start ein paar naheliegende Favoriten vorschlagen */
function suggest(f){
  const want=[/dialer|\.phone$|contacts/,/messag|\.mms$|sms/,/whatsapp/,/chrome|browser|firefox/,/camera|kamera/,/gm$|gmail/,/maps/];
  for(const re of want){const x=apps.find(a=>re.test(a.p)&&!f.includes(keyOf(a)));if(x&&f.length<5)f.push(keyOf(x))}
}
function favs(){const m=new Map(apps.map(x=>[keyOf(x),x]));return cfg.fav.map(k=>m.get(k)).filter(Boolean).map(x=>({k:keyOf(x),name:nameOf(x)}))}
function byKey(k){return apps.find(x=>keyOf(x)===k)}
function launch(k){
  const x=byKey(k);if(!x)return false;haptic();
  const ok=N.launch(x.p,x.a);
  if(!ok)toast('„'+nameOf(x)+'“ lässt sich nicht öffnen');
  else if(drawer&&drawer.classList.contains('on')){clearTimeout(launch.t);launch.t=setTimeout(closeDrawer,350)}
  return ok;
}
function notifyStart(){try{const w=$('f-start').contentWindow;w&&w.onLauncher&&w.onLauncher()}catch(e){}}

/* ---------------- Alle Apps ---------------- */
let drawer=null,showHidden=false;
function build(){
  const st=document.createElement('style');
  st.textContent=`
.ldr{position:fixed;inset:0;z-index:60;background:#fff;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .28s cubic-bezier(.2,.8,.2,1);visibility:hidden}
.ldr.on{transform:none;visibility:visible}
.ldr .lh{padding:22px 20px 10px;max-width:640px;width:100%;margin:0 auto}
.ldr .lt{display:flex;align-items:center;gap:10px;font-size:30px;font-weight:800;letter-spacing:-.02em;color:#1C1C1E;margin:0}
.ldr .lt svg{flex:none}
.ldr .lx{margin-left:auto;width:36px;height:36px;border-radius:50%;background:#F2F3F5;display:grid;place-items:center;color:#8A8F98}
.ldr .ls{display:flex;align-items:center;gap:8px;margin-top:14px;background:#F2F3F5;border-radius:12px;padding:0 12px;height:44px;color:#8A8F98}
.ldr .ls input{flex:1;border:0;background:none;outline:0;font-size:17px;color:#1C1C1E;min-width:0}
.ldr .ll{flex:1;overflow-y:auto;padding:4px 20px 40px;max-width:640px;width:100%;margin:0 auto;-webkit-overflow-scrolling:touch}
.ldr .lg{font-size:13px;font-weight:600;color:#8A8F98;padding:16px 2px 4px}
.ldr .la{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:11px 2px;font-size:19px;font-weight:500;color:#1C1C1E;letter-spacing:-.01em;border-radius:8px}
.ldr .la:active{background:#F2F3F5}
.ldr .la .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ldr .la .fv{color:#F2C200;font-size:15px}
.ldr .la.hid{color:#AEB2B9}
.ldr .le{color:#8A8F98;text-align:center;padding:40px 10px;font-size:15px}
.ldr .lm{display:block;margin:22px auto 0;color:#2A82F6;font-size:15px;font-weight:600}
.lsc{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.28);opacity:0;pointer-events:none;transition:opacity .2s}
.lsc.on{opacity:1;pointer-events:auto}
.lsh{position:fixed;left:0;right:0;bottom:0;z-index:71;background:#fff;border-radius:18px 18px 0 0;padding:10px 16px calc(22px + env(safe-area-inset-bottom,0px));transform:translateY(105%);transition:transform .25s cubic-bezier(.2,.8,.2,1);max-width:560px;margin:0 auto}
.lsh.on{transform:none}
.lsh .gr{width:38px;height:5px;border-radius:3px;background:#E1E3E7;margin:0 auto 12px}
.lsh h3{margin:0 4px 10px;font-size:19px;font-weight:700;color:#1C1C1E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lsh .o{display:flex;align-items:center;gap:12px;width:100%;padding:13px 10px;font-size:16px;font-weight:500;color:#1C1C1E;border-radius:10px;text-align:left}
.lsh .o:active{background:#F2F3F5}
.lsh .o svg{flex:none;color:#2A82F6}
.lsh .o.red,.lsh .o.red svg{color:#EE4B4B}
.lsh input{width:100%;height:46px;border:0;border-radius:12px;background:#F2F3F5;padding:0 14px;font-size:17px;outline:0;margin:2px 0 12px;color:#1C1C1E}
.lsh .row{display:flex;gap:10px}.lsh .row .d-btn{flex:1}
`;
  document.head.appendChild(st);
  drawer=document.createElement('section');drawer.className='ldr';drawer.id='ldr';
  drawer.innerHTML='<div class="lh"><h1 class="lt"><svg width="26" height="26" viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="#2A82F6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="#F2C200"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="#2FB3A6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="#EE4B4B"/></svg>Alle Apps<button class="lx" id="ldrX" aria-label="Schließen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></button></h1>'+
    '<label class="ls"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="ldrQ" placeholder="App suchen" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="go"></label></div><div class="ll" id="ldrL"></div>';
  document.body.appendChild(drawer);
  const sc=document.createElement('div');sc.className='lsc';sc.id='lsc';document.body.appendChild(sc);
  const sh=document.createElement('div');sh.className='lsh';sh.id='lsh';document.body.appendChild(sh);
  sc.onclick=closeMenu;
  $('ldrX').onclick=closeDrawer;
  const q=$('ldrQ');
  q.oninput=renderList;
  q.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const b=$('ldrL').querySelector('.la');if(b)launch(b.dataset.k)}};
  const L=$('ldrL');
  L.addEventListener('click',e=>{if(e.target.closest('#ldrHid')){showHidden=!showHidden;renderList();return}const b=e.target.closest('.la');if(b&&!longFired)launch(b.dataset.k)});
  longPress(L,'.la',b=>menu(b.dataset.k));
  /* Nach unten wischen am Listenanfang schließt */
  let y0=null;
  L.addEventListener('touchstart',e=>{y0=L.scrollTop<=0?e.touches[0].clientY:null},{passive:true});
  L.addEventListener('touchend',e=>{if(y0==null)return;const d=e.changedTouches[0].clientY-y0;y0=null;if(d>90)closeDrawer()},{passive:true});
}
let longFired=false;
function longPress(root,sel,fn){
  let t=null,sx=0,sy=0;
  root.addEventListener('touchstart',e=>{const b=e.target.closest(sel);longFired=false;if(!b)return;sx=e.touches[0].clientX;sy=e.touches[0].clientY;t=setTimeout(()=>{longFired=true;haptic();fn(b)},480)},{passive:true});
  root.addEventListener('touchmove',e=>{if(t&&(Math.abs(e.touches[0].clientX-sx)>10||Math.abs(e.touches[0].clientY-sy)>10)){clearTimeout(t);t=null}},{passive:true});
  root.addEventListener('touchend',()=>{clearTimeout(t);t=null;setTimeout(()=>{longFired=false},60)});
  root.addEventListener('contextmenu',e=>{const b=e.target.closest(sel);if(b){e.preventDefault();if(!longFired)fn(b)}});
}
function renderList(){
  const q=norm($('ldrQ').value.trim()),hid=new Set(cfg.hid),fav=new Set(cfg.fav);
  let list=apps.filter(x=>q||showHidden?true:!hid.has(keyOf(x)));
  if(q){list=list.filter(x=>norm(nameOf(x)).includes(q));list.sort((a,b)=>(norm(nameOf(a)).startsWith(q)?0:1)-(norm(nameOf(b)).startsWith(q)?0:1)||nameOf(a).localeCompare(nameOf(b),'de',{sensitivity:'base'}))}
  else list.sort((a,b)=>nameOf(a).localeCompare(nameOf(b),'de',{sensitivity:'base'}));
  let h='',g='';
  for(const x of list){
    if(!q){let l=norm(nameOf(x)).charAt(0).toUpperCase();if(!/[A-Z]/.test(l))l='#';if(l!==g){g=l;h+='<div class="lg">'+l+'</div>'}}
    const k=keyOf(x);
    h+='<button class="la'+(hid.has(k)?' hid':'')+'" data-k="'+esc(k)+'"><span class="n">'+esc(nameOf(x))+'</span>'+(fav.has(k)?'<span class="fv">★</span>':'')+'</button>';
  }
  if(!list.length)h='<div class="le">'+(q?'Keine App gefunden.':'Keine Apps.')+'</div>';
  if(!q&&cfg.hid.length)h+='<button class="lm" id="ldrHid">'+(showHidden?'Ausgeblendete Apps verbergen':cfg.hid.length+' ausgeblendete '+(cfg.hid.length===1?'App':'Apps')+' zeigen')+'</button>';
  $('ldrL').innerHTML=h;
}
function openDrawer(){
  if(!ON)return;if(!drawer)build();clearTimeout(launch.t);
  if(!apps.length)reload();
  $('ldrQ').value='';showHidden=false;renderList();$('ldrL').scrollTop=0;
  drawer.classList.add('on');haptic();
  try{N.setBars(document.body.classList.contains('ep')?'#FFFFFF':'#9AD6FB',true)}catch(e){}
  try{if(cfg.kb!==false)setTimeout(()=>$('ldrQ').focus(),280)}catch(e){}
}
function closeDrawer(){
  if(!drawer||!drawer.classList.contains('on'))return false;
  drawer.classList.remove('on');try{$('ldrQ').blur()}catch(e){}
  try{window.updateBar&&window.updateBar()}catch(e){}
  return true;
}

/* ---------------- Menü einer App ---------------- */
const IC={
  star:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  up:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  pen:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  eye:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12s3.5-6.5 9-6.5S21 12 21 12s-3.5 6.5-9 6.5S3 12 3 12z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  info:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  bin:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>'};
function menu(k){
  const x=byKey(k);if(!x)return;if(!drawer)build();
  const isF=cfg.fav.includes(k),isH=cfg.hid.includes(k),i=cfg.fav.indexOf(k);
  const o=(id,ic,t,c)=>'<button class="o'+(c?' '+c:'')+'" data-o="'+id+'">'+ic+t+'</button>';
  let h='<div class="gr"></div><h3>'+esc(nameOf(x))+'</h3>';
  h+=o('fav',IC.star,isF?'Aus Favoriten entfernen':'Zu Favoriten');
  if(isF&&i>0)h+=o('up',IC.up,'In den Favoriten nach oben');
  h+=o('ren',IC.pen,'Umbenennen');
  h+=o('hid',IC.eye,isH?'Wieder einblenden':'In „Alle Apps“ ausblenden');
  h+=o('info',IC.info,'App-Info');
  h+=o('del',IC.bin,'Deinstallieren','red');
  const sh=$('lsh');sh.innerHTML=h;
  sh.onclick=e=>{const b=e.target.closest('[data-o]');if(!b)return;act(b.dataset.o,k)};
  $('lsc').classList.add('on');requestAnimationFrame(()=>sh.classList.add('on'));
}
function act(o,k){
  const x=byKey(k);if(!x)return closeMenu();
  if(o==='fav'){const i=cfg.fav.indexOf(k);if(i>=0)cfg.fav.splice(i,1);else{if(cfg.fav.length>=10){toast('Höchstens 10 Favoriten');return closeMenu()}cfg.fav.push(k)}save();toast(i>=0?'Aus Favoriten entfernt':'Zu Favoriten hinzugefügt')}
  else if(o==='up'){const i=cfg.fav.indexOf(k);if(i>0){cfg.fav.splice(i,1);cfg.fav.splice(i-1,0,k);save()}}
  else if(o==='hid'){const i=cfg.hid.indexOf(k);if(i>=0)cfg.hid.splice(i,1);else cfg.hid.push(k);save();toast(i>=0?'Wieder eingeblendet':'Ausgeblendet – über die Suche weiter erreichbar')}
  else if(o==='info'){N.appInfo(x.p)}
  else if(o==='del'){N.uninstall(x.p)}
  else if(o==='ren'){
    const sh=$('lsh');
    sh.innerHTML='<div class="gr"></div><h3>Umbenennen</h3><input id="lRen" value="'+esc(nameOf(x))+'" maxlength="40"><div class="row"><button class="d-btn" id="lRes">Original</button><button class="d-btn primary" id="lOk">Speichern</button></div>';
    sh.onclick=null;
    const f=$('lRen');setTimeout(()=>{f.focus();f.select()},200);
    const done=v=>{v=(v||'').trim();if(!v||v===x.l)delete cfg.ren[k];else cfg.ren[k]=v;save();apps.sort((a,b)=>nameOf(a).localeCompare(nameOf(b),'de',{sensitivity:'base'}));closeMenu()};
    $('lOk').onclick=()=>done(f.value);$('lRes').onclick=()=>done('');
    f.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();done(f.value)}};
    return;
  }
  closeMenu();
}
function closeMenu(){const sh=$('lsh'),sc=$('lsc');if(!sh||!sh.classList.contains('on'))return false;sh.classList.remove('on');sc.classList.remove('on');try{document.activeElement.blur()}catch(e){}if(drawer&&drawer.classList.contains('on'))renderList();return true}

/* ---------------- Gesten & Systemaktionen ---------------- */
function isHome(){try{return ON&&N.isHome()}catch(e){return false}}
function notifications(){try{if(N.notifications())return true}catch(e){}return false}
function lock(){
  if(!ON)return;
  let on=false;try{on=N.lockOn()}catch(e){}
  if(on){try{if(N.lock())return}catch(e){}}
  if(cfg.lockAsk===false)return;
  if(!drawer)build();
  const sh=$('lsh');
  sh.innerHTML='<div class="gr"></div><h3>Per Doppeltippen sperren</h3><p style="margin:0 4px 14px;color:#8A8F98;font-size:15px;line-height:1.45">Dafür einmal in den Bedienungshilfen <b style="color:#1C1C1E">„Assistent – Bildschirm sperren“</b> einschalten. Der Dienst liest keine Inhalte, er sperrt nur das Display.</p><div class="row"><button class="d-btn" id="lNo">Nicht nutzen</button><button class="d-btn primary" id="lGo">Einschalten</button></div>';
  sh.onclick=null;
  $('lGo').onclick=()=>{closeMenu();try{N.lockSettings()}catch(e){}};
  $('lNo').onclick=()=>{cfg.lockAsk=false;save();closeMenu()};
  $('lsc').classList.add('on');requestAnimationFrame(()=>sh.classList.add('on'));
}
function setOpt(k,v){cfg[k]=v;save()}
function opt(k){return cfg[k]}

window.Launcher={on:ON,reload,favs,launch,menu,openDrawer,closeDrawer,isHome,notifications,lock,setOpt,opt,
  homeSettings(){try{N.homeSettings()}catch(e){}},openClock(){try{N.openClock()}catch(e){}},
  lockOn(){try{return N.lockOn()}catch(e){return false}},lockSettings(){try{N.lockSettings()}catch(e){}}};
window.launcherHome=function(){
  closeMenu();closeDrawer();
  try{window.AssistentSync&&AssistentSync.isOpen()&&AssistentSync.close()}catch(e){}
  try{const m=$('mig');if(m&&m.classList.contains('on'))m.classList.remove('on')}catch(e){}
  try{window.call&&call(window.activeTab?activeTab():'start','handleBack')}catch(e){}
  if(window.showTab)showTab('start');
  try{const w=$('f-start').contentWindow;w.epShow&&w.epShow()}catch(e){}
  try{$('f-start').contentWindow.scrollTo({top:0,behavior:'smooth'})}catch(e){}
};
if(ON){
  /* Zurück-Taste: erst Menü, dann App-Liste schließen; auf dem Startbildschirm zurück zu Start */
  const hb=window.handleBack;
  window.handleBack=function(){
    if(closeMenu())return true;if(closeDrawer())return true;
    const r=hb?hb():false;if(r)return true;
    if(isHome()&&window.activeTab&&activeTab()!=='start'){showTab('start');return true}
    return false;
  };
  const rs=window.onResumeApp;
  window.onResumeApp=function(){if(rs)rs();notifyStart()};
  /* Sofort beim Zurückkehren: nur Uhr und Favoriten auffrischen, der Rest kommt kurz danach */
  window.onResumeFast=function(){notifyStart()};
  reload();
}
})();
