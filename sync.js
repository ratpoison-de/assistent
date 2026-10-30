/* Assistent – Synchronisation über ein privates GitHub-Repo
   Läuft in der Hülle (index.html) auf allen drei Plattformen.
   Prinzip: Drei-Wege-Abgleich (letzter gemeinsamer Stand ↔ dieses Gerät ↔ GitHub),
   Einträge mit id werden einzeln zusammengeführt, Fotos liegen als eigene Dateien im Repo. */
(function(){
"use strict";
const PLAT=window.ASSISTENT_PLATFORM||'web';
const DEVICE={android:'Android',windows:'Windows',web:'Web'}[PLAT]||'Gerät';
const CK='planer.sync.cfg',BK='planer.sync.base',IK='planer.sync.imgs';
const FILE='daten.json';
const $=id=>document.getElementById(id);
const sh=window.call||function(){};

/* ---------- Einstellungen ---------- */
function loadCfg(){try{return Object.assign({owner:'ratpoison-de',repo:'assistent-daten',dir:'assistent',token:'',api:'https://api.github.com',on:false},JSON.parse(localStorage.getItem(CK)||'{}'))}catch(e){return{owner:'ratpoison-de',repo:'assistent-daten',dir:'assistent',token:'',api:'https://api.github.com',on:false}}}
let cfg=loadCfg();
function saveCfg(){try{localStorage.setItem(CK,JSON.stringify(cfg))}catch(e){}}
function loadBase(){try{return JSON.parse(localStorage.getItem(BK)||'null')}catch(e){return null}}
function saveBase(b){try{localStorage.setItem(BK,JSON.stringify(b))}catch(e){}}

/* ---------- Hilfen ---------- */
function stable(x){if(x===undefined)return'u';if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return'['+x.map(stable).join(',')+']';return'{'+Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}'}
const eq=(a,b)=>stable(a)===stable(b);
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const idList=a=>Array.isArray(a)&&a.every(o=>isObj(o)&&o.id!=null);
const primList=a=>Array.isArray(a)&&a.every(v=>v===null||typeof v!=='object');
function b64e(s){return btoa(unescape(encodeURIComponent(s)))}
function b64d(s){return decodeURIComponent(escape(atob(String(s).replace(/\s/g,''))))}
function parse(s,d){try{return s==null?d:JSON.parse(s)}catch(e){return d}}

/* ---------- Drei-Wege-Zusammenführung ---------- */
function merge(b,l,r){
  if(eq(l,r))return l;
  if(eq(l,b))return r;          // nur GitHub hat sich geändert
  if(eq(r,b))return l;          // nur dieses Gerät hat sich geändert
  if(l===undefined)return r;    // hier gelöscht, dort bearbeitet → Bearbeitung gewinnt
  if(r===undefined)return l;
  if(isObj(l)&&isObj(r)){
    const bo=isObj(b)?b:{},out={};
    const keys=[...Object.keys(l),...Object.keys(r).filter(k=>!(k in l))];
    for(const k of keys){const v=merge(bo[k],l[k],r[k]);if(v!==undefined)out[k]=v}
    return out;
  }
  if(idList(l)&&idList(r)){
    const bm=new Map((idList(b)?b:[]).map(o=>[String(o.id),o]));
    const lm=new Map(l.map(o=>[String(o.id),o])),rm=new Map(r.map(o=>[String(o.id),o]));
    const order=[...lm.keys()];
    r.forEach((o,i)=>{const id=String(o.id);if(lm.has(id))return;
      /* neue Einträge von dort hinter ihren Vorgänger einsortieren */
      let at=order.length;for(let j=i-1;j>=0;j--){const p=order.indexOf(String(r[j].id));if(p>=0){at=p+1;break}}if(i===0)at=0;order.splice(at,0,id)});
    const out=[];for(const id of order){const v=merge(bm.get(id),lm.get(id),rm.get(id));if(v!==undefined)out.push(v)}
    return out;
  }
  if(primList(l)&&primList(r)){
    const bs=new Set((primList(b)?b:[]).map(stable));
    const ls=new Set(l.map(stable)),rs=new Set(r.map(stable));
    const gone=new Set([...bs].filter(k=>!ls.has(k)||!rs.has(k)));
    const out=[],seen=new Set();
    for(const v of [...l,...r]){const k=stable(v);if(gone.has(k)||seen.has(k))continue;seen.add(k);out.push(v)}
    return out;
  }
  return l;                     // echter Widerspruch bei einem Einzelwert: dieses Gerät gewinnt
}

/* ---------- Pinnwand-Datenbank (gleiche Struktur wie im Modul) ---------- */
let idb=null;
function db(){return idb||(idb=new Promise((res,rej)=>{const r=indexedDB.open('pinnwand',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');if(!d.objectStoreNames.contains('img'))d.createObjectStore('img')};r.onsuccess=()=>res(r.result);r.onerror=()=>{idb=null;rej(r.error)}}))}
async function dget(store,k){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(store,'readonly').objectStore(store).get(k);t.onsuccess=()=>res(t.result);t.onerror=()=>rej(t.error)})}
async function dput(store,k,v){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction(store,'readwrite');tx.objectStore(store).put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function dkeys(store){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(store,'readonly').objectStore(store).getAllKeys();t.onsuccess=()=>res(t.result||[]);t.onerror=()=>rej(t.error)})}

/* ---------- Was synchronisiert wird ---------- */
const SLOTS={
  woche:{frames:['woche','start','kalender'],
    get:()=>parse(localStorage.getItem('wochenstapel'),undefined),
    set:v=>{if(v===undefined)localStorage.removeItem('wochenstapel');else localStorage.setItem('wochenstapel',JSON.stringify(v))}},
  kalender:{frames:['kalender','start'],
    get:()=>{const p=parse(localStorage.getItem('meinkalender'),null);return p?{events:p.events||[]}:undefined},
    set:v=>{const p=parse(localStorage.getItem('meinkalender'),null)||{v:1,settings:{}};p.events=(v&&v.events)||[];localStorage.setItem('meinkalender',JSON.stringify(p))}},
  google:{frames:['kalender','start'],readonly:PLAT!=='android',
    get:()=>parse(localStorage.getItem('planer.gcal'),undefined),
    set:v=>{if(v===undefined)localStorage.removeItem('planer.gcal');else localStorage.setItem('planer.gcal',JSON.stringify(v))}},
  pinnwand:{frames:['pinnwand','start','kalender'],
    get:async()=>{const s=await dget('kv','state');if(!s)return undefined;const o=clone(s);delete o.current;delete o.filter;return o},
    set:async v=>{if(!v)return;const cur=await dget('kv','state')||{};const o=clone(v);o.current=cur.current;o.filter=cur.filter||'all';
      if(!o.boards||!o.boards.find(b=>b.id===o.current))o.current=o.boards&&o.boards[0]&&o.boards[0].id;await dput('kv','state',o)}},
  profil:{frames:['start','woche'],
    get:()=>({name:localStorage.getItem('planer.name')||'',doneDays:parse(localStorage.getItem('planer.doneDays'),[])}),
    set:v=>{if(!v)return;if(v.name)localStorage.setItem('planer.name',v.name);if(v.doneDays)localStorage.setItem('planer.doneDays',JSON.stringify(v.doneDays))}}
};
async function readLocal(){const o={};for(const k in SLOTS){try{const v=await SLOTS[k].get();if(v!==undefined)o[k]=v}catch(e){}}return o}

/* ---------- GitHub ---------- */
function api(path){return cfg.api.replace(/\/$/,'')+'/repos/'+encodeURIComponent(cfg.owner)+'/'+encodeURIComponent(cfg.repo)+path}
async function gh(method,path,body){
  let r;
  try{r=await fetch(api(path),{method,cache:'no-store',headers:Object.assign({Authorization:'Bearer '+cfg.token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},body?{'Content-Type':'application/json'}:{}),body:body?JSON.stringify(body):undefined})}
  catch(e){throw{code:'offline'}}
  if(r.status===404)return null;
  if(r.status===401)throw{code:'token'};
  if(r.status===403){const t=await r.text();throw{code:/rate limit/i.test(t)?'rate':'rechte'}}
  if(r.status===409||r.status===422)throw{code:'konflikt'};
  if(!r.ok)throw{code:'http',status:r.status};
  return r.status===204?{}:r.json();
}
async function getFile(p){
  const j=await gh('GET','/contents/'+p);if(!j)return null;
  if(Array.isArray(j))throw{code:'http'};
  let text;
  if(j.content&&j.encoding==='base64')text=b64d(j.content);
  else{const bl=await gh('GET','/git/blobs/'+j.sha);text=bl?b64d(bl.content):''}
  return{text,sha:j.sha};
}
async function putFile(p,text,sha,msg){
  const j=await gh('PUT','/contents/'+p,Object.assign({message:msg,content:b64e(text)},sha?{sha}:{}));
  return j&&j.content&&j.content.sha;
}
const dataPath=()=>(cfg.dir?cfg.dir.replace(/^\/|\/$/g,'')+'/':'')+FILE;
const imgPath=id=>(cfg.dir?cfg.dir.replace(/^\/|\/$/g,'')+'/':'')+'fotos/'+encodeURIComponent(id)+'.txt';

/* ---------- Ist ein Bereich gerade in Bearbeitung? Dann warten wir kurz. ---------- */
function busy(t){
  try{const f=document.getElementById('f-'+t);const w=f&&f.contentWindow;if(!w||!w.document||!f.getAttribute('src'))return false;
    const d=w.document,a=d.activeElement;
    if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable)&&a.type!=='checkbox')return true;
    return !!d.querySelector('.sheet.on,.sheet.show,.editor.on,.editor.show,.dlg.on,.dlg.show,.layer.on,.dragging,#search:not(.hidden)');
  }catch(e){return false}
}
function refreshFrames(list){
  for(const t of list){
    const f=document.getElementById('f-'+t);if(!f||!f.getAttribute('src'))continue;
    const w=f.contentWindow;
    if(w&&typeof w.reloadData==='function'){try{w.reloadData()}catch(e){}}
    else if(t==='start'){try{w.onResumeApp&&w.onResumeApp()}catch(e){}}
  }
}

/* ---------- Abgleich ---------- */
let running=false,again=false,timer=0,lastErr='',lastSnap='';
const listeners=[];
function status(){return{on:cfg.on&&!!cfg.token,last:cfg.last||0,by:cfg.by||'',err:lastErr,running}}
function emit(){for(const f of listeners)try{f(status())}catch(e){}try{sh('start','onSync',status())}catch(e){}}
function schedule(ms){clearTimeout(timer);timer=setTimeout(()=>sync('auto'),ms)}

async function sync(reason,mode){
  if(!cfg.on||!cfg.token)return status();
  if(running){again=true;return status()}
  running=true;emit();
  try{
    if(PLAT==='android')try{sh('kalender','gMirror')}catch(e){}
    for(let tries=0;tries<4;tries++){
      const L=await readLocal();
      const rf=await getFile(dataPath());
      const remote=rf?parse(rf.text,null):null;
      const R=remote&&remote.slots?remote.slots:undefined;
      let B=loadBase();
      let res;
      if(!B||mode){
        const m=mode||'pull';
        if(!R)res=L;
        else if(m==='push')res=L;
        else if(m==='merge')res=merge({},L,R);
        else res=R;
      }else if(!R)res=L;               /* Datei auf GitHub fehlt: neu anlegen, nichts löschen */
      else res=merge(B,L,R);
      /* nur das Handy darf die Google-Termine schreiben */
      if(SLOTS.google.readonly){if(R&&R.google!==undefined)res.google=R.google;else delete res.google}
      /* Bereiche, die sich hier ändern würden, aber gerade bearbeitet werden → später */
      const touch=Object.keys(SLOTS).filter(k=>!eq(res[k],L[k]));
      const frames=[...new Set(touch.flatMap(k=>SLOTS[k].frames))];
      if(touch.some(k=>SLOTS[k].frames.some(busy))){lastErr='';running=false;schedule(4000);emit();return status()}
      if(!R||!eq(res,R)){
        try{const sha=await putFile(dataPath(),JSON.stringify({app:'assistent',v:1,updated:new Date().toISOString(),by:DEVICE,slots:res}),rf&&rf.sha,'Abgleich von '+DEVICE);if(!sha)throw{code:'http'}}
        catch(e){if(e&&e.code==='konflikt'){continue}throw e}
        cfg.by=DEVICE;
      }else cfg.by=remote&&remote.by||cfg.by;
      for(const k of touch){try{await SLOTS[k].set(res[k])}catch(e){}}
      saveBase(res);mode=undefined;
      lastSnap=stable(await readLocal());
      if(touch.length)refreshFrames(frames);
      await syncImages(res);
      cfg.last=Date.now();saveCfg();lastErr='';
      break;
    }
  }catch(e){lastErr=(e&&e.code)||'fehler'}
  running=false;emit();
  if(again){again=false;schedule(1500)}
  return status();
}

/* Fotos der Pinnwand: fehlende hochladen, fehlende herunterladen */
async function syncImages(res){
  const ids=new Set();
  try{for(const b of (res.pinnwand&&res.pinnwand.boards)||[])for(const c of b.cards||[])if(c.photo)ids.add(String(c.photo))}catch(e){}
  if(!ids.size)return;
  let up=parse(localStorage.getItem(IK),[]);const upS=new Set(up);
  let have=[];try{have=(await dkeys('img')).map(String)}catch(e){}
  const haveS=new Set(have);let got=false;
  for(const id of ids){
    if(haveS.has(id)&&!upS.has(id)){
      try{const data=await dget('img',id);if(typeof data==='string'){try{await putFile(imgPath(id),data,null,'Foto '+id)}catch(e){if(!(e&&e.code==='konflikt'))throw e}upS.add(id)}}catch(e){if(e&&e.code==='offline')break}
    }else if(!haveS.has(id)){
      try{const f=await getFile(imgPath(id));if(f&&f.text){await dput('img',id,f.text);upS.add(id);got=true}}catch(e){if(e&&e.code==='offline')break}
    }
  }
  try{localStorage.setItem(IK,JSON.stringify([...upS]))}catch(e){}
  if(got)refreshFrames(['pinnwand']);
}

/* Änderungen auf diesem Gerät erkennen */
async function watch(){
  if(!cfg.on||!cfg.token||running||document.hidden)return;
  try{const s=stable(await readLocal());if(s!==lastSnap){const first=!lastSnap;lastSnap=s;const B=loadBase();if(!first&&B)schedule(2500)}}catch(e){}
}
setInterval(watch,3000);
setInterval(()=>{if(!document.hidden)sync('pull')},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(800)});
window.addEventListener('online',()=>schedule(500));
setTimeout(()=>{watch();sync('start')},1500);

/* ---------- Verbinden / Trennen ---------- */
async function check(owner,repo,token){
  const old=cfg;cfg=Object.assign({},cfg,{owner,repo,token});
  try{
    const r=await fetch(cfg.api.replace(/\/$/,'')+'/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo),{cache:'no-store',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'}});
    if(r.status===401)throw{code:'token'};
    if(r.status===404)throw{code:'repo'};
    if(!r.ok)throw{code:'http'};
    const j=await r.json();
    if(j.permissions&&!j.permissions.push)throw{code:'rechte'};
    const f=await getFile(dataPath());
    return{priv:!!j.private,exists:!!f,remote:f?parse(f.text,null):null};
  }finally{cfg=old}
}
async function connect(owner,repo,token,mode){
  cfg.owner=owner;cfg.repo=repo;cfg.token=token;cfg.on=true;saveCfg();
  localStorage.removeItem(BK);localStorage.removeItem(IK);lastSnap='';
  return sync('connect',mode);
}
function disconnect(){cfg.on=false;cfg.token='';saveCfg();localStorage.removeItem(BK);lastErr='';emit()}

const ERR={offline:'Keine Internetverbindung',token:'Der Token ist ungültig oder abgelaufen',repo:'Repo nicht gefunden – Name prüfen und ob der Token Zugriff darauf hat',rechte:'Der Token darf nicht schreiben (Contents: Read and write)',rate:'GitHub-Limit erreicht – gleich noch einmal',http:'GitHub antwortet gerade nicht',konflikt:'Gleichzeitige Änderung – wird gleich wiederholt',fehler:'Unbekannter Fehler'};
function ago(t){if(!t)return'noch nie';const m=Math.round((Date.now()-t)/60000);return m<1?'gerade eben':m<60?'vor '+m+' Min.':m<1440?'vor '+Math.round(m/60)+' Std.':new Date(t).toLocaleDateString('de-DE')}

/* ---------- Oberfläche ---------- */
const css=`
.syn{position:fixed;inset:0;z-index:60;background:var(--bg,#fff);overflow-y:auto;padding:22px 16px 40px;transform:translateY(100%);transition:transform .28s cubic-bezier(.2,.8,.2,1)}
.syn.on{transform:none}
.syn .in{max-width:560px;margin:0 auto}
.syn .hd{display:flex;align-items:center;gap:10px}.syn .hd .t{flex:1}
.syn .x{width:44px;height:44px;border-radius:50%;background:var(--soft,#F2F2F7);display:grid;place-items:center;flex:none}
.syn .lead{color:var(--mute);font-size:15px;line-height:1.5;margin:10px 2px 16px}
.syn .box{background:#fff;border:1px solid var(--line,#E5E5EA);border-radius:18px;padding:16px;margin-bottom:12px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 6px 18px rgba(0,0,0,.05)}
.syn label{display:block;font-size:12.5px;font-weight:700;color:var(--mute);margin:10px 2px 5px;letter-spacing:.02em}
.syn input{width:100%;padding:13px 14px;border-radius:14px;border:0;background:var(--soft,#F2F2F7);font-size:16px;outline:none;font-family:var(--font);color:var(--ink)}
.syn input:focus{box-shadow:0 0 0 2px var(--v,#FF3B30) inset}
.syn .row{display:flex;gap:10px}.syn .row>div{flex:1;min-width:0}
.syn .d-btn{width:100%;margin-top:12px}
.syn .msg{font-size:14px;margin-top:10px;line-height:1.45;min-height:1em}
.syn .msg.err{color:var(--danger,#E5484D)}
.syn .ss{display:flex;align-items:center;gap:12px}
.syn .dot{width:12px;height:12px;border-radius:50%;background:#C7C7CC;flex:none}
.syn .dot.ok{background:#34C759}.syn .dot.bad{background:var(--danger,#E5484D)}.syn .dot.run{background:var(--v,#FF3B30);animation:synp 1s infinite}
@keyframes synp{50%{opacity:.35}}
.syn .ss b{display:block;font-size:16px}.syn .ss small{display:block;color:var(--mute);font-size:13.5px;margin-top:1px}
.syn ol{margin:6px 0 0;padding-left:20px;font-size:14.5px;line-height:1.55}.syn ol li{margin:4px 0}
.syn code{background:var(--soft,#F2F2F7);padding:1px 6px;border-radius:6px;font-size:13.5px}
.syn .ch{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.syn .ch button{text-align:left;padding:13px 14px;border-radius:16px;background:var(--soft,#F2F2F7);font-size:15px}
.syn .ch button b{display:block}.syn .ch button small{display:block;color:var(--mute);font-size:13px;margin-top:2px}
.syn .ch button.rec{background:var(--lav,#FFF0EF)}
.syn .foot{text-align:center;color:var(--mute);font-size:12.5px;margin-top:22px;line-height:1.5}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const el=document.createElement('section');el.className='syn';el.id='sync';el.setAttribute('aria-label','Synchronisation');
document.body.appendChild(el);

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function render(){
  const s=status();
  const head='<div class="in"><div class="hd"><div class="t"><div class="h-eyebrow">Handy · Windows · Web</div><h1 class="h-big">Synchro&shy;nisation</h1></div><button class="x" id="synX" aria-label="Schließen"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>';
  let h=head;
  if(s.on){
    const cls=s.running?'run':s.err?'bad':'ok';
    h+='<p class="lead">Aufgaben, Termine, Pinnwand mit Fotos und dein Name werden über dein privates GitHub-Repo zwischen allen Geräten abgeglichen – automatisch, sobald du etwas änderst, und jede Minute.</p>'+
      '<div class="box"><div class="ss"><span class="dot '+cls+'"></span><div><b>'+(s.running?'Gleiche ab …':s.err?'Abgleich hakt':'Alles abgeglichen')+'</b><small>'+(s.err?esc(ERR[s.err]||s.err):'Zuletzt '+ago(s.last)+(s.by?' · letzte Änderung von '+esc(s.by):''))+'</small></div></div>'+
      '<button class="d-btn primary" id="synNow">Jetzt abgleichen</button></div>'+
      '<div class="box"><div class="ss"><div><b>'+esc(cfg.owner)+' / '+esc(cfg.repo)+'</b><small>Dieses Gerät: '+DEVICE+'</small></div></div>'+
      '<button class="d-btn ghost" id="synOff">Abgleich auf diesem Gerät beenden</button></div>'+
      '<div class="box"><b>Was nicht mitreist</b><ol><li>Gmail bleibt auf dem Handy – Zugangsdaten verlassen das Handy nie.</li><li>Google-Kalender: das Handy schickt eine Kopie der Termine mit, am PC sind sie zum Ansehen da.</li><li>Wetter holt jedes Gerät für seinen eigenen Standort.</li></ol></div>';
  }else{
    h+='<p class="lead">Verbinde dieses Gerät mit deinem privaten GitHub-Repo. Danach haben Handy, Windows-App und Web-App denselben Stand.</p>'+
      '<div class="box"><div class="row"><div><label for="synO">GitHub-Konto</label><input id="synO" value="'+esc(cfg.owner)+'" autocapitalize="off" autocomplete="off" spellcheck="false"></div><div><label for="synR">Daten-Repo (privat)</label><input id="synR" value="'+esc(cfg.repo)+'" autocapitalize="off" autocomplete="off" spellcheck="false"></div></div>'+
      '<label for="synT">Token</label><input id="synT" type="password" placeholder="github_pat_…" autocapitalize="off" autocomplete="off" spellcheck="false">'+
      '<button class="d-btn primary" id="synGo">Verbinden</button><div class="msg" id="synMsg"></div><div id="synCh"></div></div>'+
      '<div class="box"><b>So bekommst du den Token</b><ol><li>Auf github.com: <b>Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token</b></li><li>Repository access: <b>Only select repositories</b> → <code>'+esc(cfg.repo)+'</code></li><li>Permissions → <b>Contents: Read and write</b></li><li>Token kopieren und oben einfügen. Er bleibt nur auf diesem Gerät gespeichert.</li></ol></div>';
  }
  h+='<p class="foot">Assistent · '+DEVICE+'<br>Entwickelt von Thorsten von Plotho-Kettner</p></div>';
  el.innerHTML=h;
  $('synX').onclick=close;
  if(s.on){
    $('synNow').onclick=()=>{lastErr='';sync('manual')};
    $('synOff').onclick=()=>{disconnect();render()};
  }else{
    $('synGo').onclick=async()=>{
      const o=$('synO').value.trim(),r=$('synR').value.trim(),t=$('synT').value.trim();const m=$('synMsg');
      m.className='msg';$('synCh').innerHTML='';
      if(!o||!r||t.length<20){m.className='msg err';m.textContent='Bitte Konto, Repo und Token eintragen.';return}
      m.textContent='Prüfe den Zugang …';$('synGo').disabled=true;
      try{
        const c=await check(o,r,t);
        if(!c.priv){m.className='msg err';m.innerHTML='Achtung: <b>'+esc(r)+'</b> ist öffentlich. Bitte stelle das Repo auf <b>Private</b>, damit deine Daten nicht sichtbar sind.';$('synGo').disabled=false;return}
        if(!c.exists){m.textContent='Verbunden. Lade den Stand dieses Geräts hoch …';await connect(o,r,t,'push');render();toast('Synchronisation eingerichtet');return}
        const by=c.remote&&c.remote.by?c.remote.by:'einem anderen Gerät',when=c.remote&&c.remote.updated?new Date(c.remote.updated).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}):'';
        m.innerHTML='Im Repo liegt schon ein Stand von <b>'+esc(by)+'</b>'+(when?' ('+esc(when)+')':'')+'. Wie soll es weitergehen?';
        $('synCh').innerHTML='<div class="ch"><button class="rec" data-m="pull"><b>Stand von GitHub übernehmen</b><small>Empfohlen für ein neues Gerät – ersetzt, was hier gespeichert ist</small></button><button data-m="merge"><b>Zusammenführen</b><small>Behält beides – kann doppelte Einträge ergeben</small></button><button data-m="push"><b>Dieses Gerät hochladen</b><small>Ersetzt den Stand auf GitHub</small></button></div>';
        $('synCh').onclick=async e=>{const b=e.target.closest('button[data-m]');if(!b)return;m.textContent='Gleiche ab …';$('synCh').innerHTML='';await connect(o,r,t,b.dataset.m);render();toast(status().err?'Abgleich hakt':'Synchronisation eingerichtet')};
      }catch(e){m.className='msg err';m.textContent=ERR[(e&&e.code)||'fehler']||'Fehler'}
      $('synGo').disabled=false;
    };
  }
}
function toast(t){try{const x=$('toast');x.textContent=t;x.classList.add('on');setTimeout(()=>x.classList.remove('on'),3000)}catch(e){}}
function open(){render();el.classList.add('on');el.scrollTop=0}
function close(){el.classList.remove('on');try{sh('start','onShow')}catch(e){}}
listeners.push(()=>{if(el.classList.contains('on')&&status().on){const a=document.activeElement;if(!(a&&a.tagName==='INPUT'&&el.contains(a)))render()}});

window.AssistentSync={sync,open,close,status,isOpen:()=>el.classList.contains('on'),merge,platform:PLAT,device:DEVICE,_cfg:()=>cfg};
window.openSync=open;
})();
