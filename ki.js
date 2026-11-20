/* Assistent – KI auf dem Gerät (6.8)
   Schnelleingabe in Alltagssprache, Aufgaben zerlegen, Tag und Woche planen, Begleiter-Chat.
   Alles läuft lokal mit Regeln und Wissen über deinen Alltag: kein Internet, kein Konto, keine Daten verlassen das Gerät.
   Akkuschonend: rechnet nur, wenn du fragst – keine Timer, kein Hintergrund. */
(function(){
"use strict";
if(window.KI)return;

/* ================= Grundlagen ================= */
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseD=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addS=(s,n)=>{const d=parseD(s);d.setDate(d.getDate()+n);return ymd(d)};
const dd=(a,b)=>Math.round((parseD(b)-parseD(a))/864e5);
const dow=s=>parseD(s).getDay();
const today=()=>ymd(new Date());
const toM=s=>{if(!s)return null;const[h,m]=String(s).split(':').map(Number);return h*60+(m||0)};
const hm=m=>pad(Math.floor(m/60)%24)+':'+pad(Math.round(m%60));
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const WD=['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag'];
const WDS=['so','mo','di','mi','do','fr','sa'];
const WDN=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const WDK=['So','Mo','Di','Mi','Do','Fr','Sa'];
const MONK={jan:1,januar:1,feb:2,februar:2,'mär':3,'märz':3,maerz:3,apr:4,april:4,mai:5,jun:6,juni:6,jul:7,juli:7,aug:8,august:8,sep:9,sept:9,september:9,okt:10,oktober:10,nov:11,november:11,dez:12,dezember:12};
const NUM={ein:1,eins:1,einem:1,einer:1,eine:1,zwei:2,drei:3,vier:4,'fünf':5,sechs:6,sieben:7,acht:8,neun:9,zehn:10,elf:11,'zwölf':12,vierzehn:14};
const L='[\\wäöüßÄÖÜ]';
const B='(?<!'+L+')',E='(?!'+L+')';
const R=(src,f)=>new RegExp(src.replace(/\\B</g,B).replace(/\\E>/g,E),f||'i');
const relDay=s=>{const n=dd(today(),s);if(n===0)return'heute';if(n===1)return'morgen';if(n===2)return'übermorgen';if(n===-1)return'gestern';
  const d=parseD(s);return WDK[d.getDay()]+' '+d.getDate()+'.'+(d.getMonth()+1)+'.'};
const relDayL=s=>{const n=dd(today(),s);if(n===0)return'Heute';if(n===1)return'Morgen';const d=parseD(s);return WDN[d.getDay()]+', '+d.getDate()+'.'+(d.getMonth()+1)+'.'};
const nextDow=(base,w,allowSame)=>{let n=(w-dow(base)+7)%7;if(n===0&&!allowSame)n=7;return addS(base,n)};
const fri=base=>{const w=dow(base);return w===6||w===0?base:addS(base,5-w)};
const mondayNext=base=>nextDow(base,1,false);
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const plural=(n,a,b)=>n+' '+(n===1?a:b);
const durL=m=>m<60?m+' Min':(m%60?Math.floor(m/60)+' Std '+m%60+' Min':Math.floor(m/60)+' Std');

/* Wörter, an denen die KI erkennt, was gemeint ist */
const TASKVERB=R('\\B<(anrufen|anruf|zurückrufen|kaufen|einkaufen|besorgen|bestellen|drucken|ausdrucken|kopieren|schreiben|schicken|senden|verschicken|mailen|beantworten|korrigieren|vorbereiten|erledigen|bezahlen|überweisen|abholen|zurückgeben|abgeben|ausfüllen|unterschreiben|buchen|reservieren|organisieren|planen|aufräumen|putzen|waschen|bügeln|lesen|lernen|nachfragen|klären|prüfen|checken|reparieren|kündigen|beantragen|verlängern|eintragen|hochladen|scannen|sortieren|ausmisten|vorbereiten|fertig ?machen|machen|erstellen|basteln|backen|kochen|packen|einpacken|wegbringen|mitbringen|mitnehmen|abschicken|abschließen|überarbeiten|recherchieren|nachschauen|suchen|aufhängen|zusammenstellen|aktualisieren|sichern|installieren|einrichten|vereinbaren|ausmachen|absagen|verschieben)\\E>');
const EVENTWORD=R('\\B<(termin|arzt|zahnarzt|kinderarzt|ärztin|hausarzt|augenarzt|frauenarzt|physio|friseur|konferenz|gesamtlehrerkonferenz|glk|dienstbesprechung|elternabend|elterngespräch|elternsprechtag|standortgespräch|sprechstunde|besprechung|sitzung|treffen|meeting|geburtstag|feier|party|fest|konzert|training|turnier|spiel|ausflug|wandertag|klassenfahrt|exkursion|urlaub|ferien|fortbildung|gottesdienst|messe|hochzeit|beerdigung|abendessen|mittagessen|frühstück|kino|theater|prüfung|abschlussprüfung|klassenarbeit schreiben|probe|chor|verabredung|date|besuch|werkstatt|tüv|inspektion|abholung|lieferung|vorstellungsgespräch|infoabend|tag der offenen tür|schulfest|zeugnisausgabe)\\E>');
const SCHOOL=R('\\B<(klasse|klassen|\\d{1,2}[a-e]|schule|schul\\w*|unterricht\\w*|konferenz|glk|elternabend|elterngespräch|elternbrief\\w*|elternsprechtag|standortgespräch|korrigier\\w*|korrektur\\w*|klassenarbeit\\w*|klausur\\w*|test|lehrer\\w*|kollegium|fachschaft|zeugnis\\w*|pags|schüler\\w*|arbeitsblatt|arbeitsblätter|kopien|stundenplan|vertretung|aufsicht|pausenaufsicht|praktikum|wandertag|klassenfahrt|exkursion|sprechstunde|referat|noten|notenliste|ib|il|schulleitung|sekretariat|rektor\\w*|vertrauenslehrer)\\E>');
const FAMILY=R('\\B<(leon|tanja|familie|familien\\w*|oma|opa|mama|papa|mutter|vater|schwiegereltern|kind|kinder|sohn|elternhaus|onkel|tante|cousin\\w*)\\E>');
const PRIVATE=R('\\B<(arzt|zahnarzt|ärztin|physio|friseur|kino|theater|konzert|freunde|freund|essen|abendessen|sport|joggen|fitness|urlaub|werkstatt|tüv|bank|versicherung)\\E>');
const SZ_L=/(putz|aufräum|ausmist|keller|garage|dachboden|steuer|papierkram|korrigier|korrektur|klassenarbeit|klausur|unterricht|einheit|umzug|renovier|streichen|bewerbung|präsentation|projekt|zeugnis|garten|elternabend vorbereit|ausflug|klassenfahrt|wandertag|feier|party|urlaub planen|reise)/i;
const SZ_S=/(anruf|anrufen|schick|senden|bestell|kopier|überweis|bezahl|unterschreib|druck|termin|nachfrag|antworten|erinner|buchen|abhol|müll|kurz|zettel|nachricht|kündig|eintragen|zurückgeben|abgeben)/i;
const SZ_M=/(einkauf|wäsche|waschen|bügeln|küche|bad|kochen|elternbrief|e-?mail|mails|vorbereit|schreiben|planen|planung|staubsaug|wischen|lesen|sport|joggen|training|arbeitsblatt|test|formular|antrag|geschenk)/i;
function guessSize(t){t=String(t||'');if(SZ_L.test(t))return'L';if(SZ_S.test(t))return'S';if(SZ_M.test(t))return'M';return t.trim().split(/\s+/).length<=3?'S':'M'}
function guessCtx(t){
  if(/anruf|telefon|zurückruf|\banrufen/i.test(t))return'telefon';
  if(/kaufen|besorg|einkauf|abholen|apotheke|bäcker|baumarkt|drogerie|tanken|wegbringen|\bpost\b|paket/i.test(t))return'besorgung';
  if(SCHOOL.test(t))return'schule';
  if(/e-?mail|mails|drucken|online|bestellen|überweis|scannen|hochladen|webseite|homepage|\bapp\b|excel|computer|laptop|tippen|recherch|installier|einricht|sicher|update/i.test(t))return'computer';
  if(/putz|aufräum|wäsche|küche|\bbad\b|garten|kochen|staubsaug|reparier|müll|keller|bügeln|backen|ausmist|zuhause|haushalt/i.test(t))return'zuhause';
  return'';
}
function guessCat(t,prio){
  if(/geburtstag/i.test(t))return'geburtstag';
  if(SCHOOL.test(t))return'schule';
  if(prio)return'wichtig';
  if(FAMILY.test(t))return'familie';
  if(PRIVATE.test(t))return'privat';
  return'sonst';
}
function evLen(t){
  if(/konferenz|glk|elternabend|infoabend/i.test(t))return 120;
  if(/training|kino|theater|konzert|abendessen|fortbildung/i.test(t))return 90;
  if(/arzt|ärztin|physio|friseur|elterngespräch|standortgespräch|sprechstunde/i.test(t))return 30;
  return 60;
}

/* ================= 1. Schnelleingabe: Alltagssprache → Termine und Aufgaben ================= */
function parseOne(raw,base){
  base=base||today();
  let s=' '+String(raw).replace(/\s+/g,' ').trim()+' ';
  const o={raw:String(raw).trim(),date:null,tStart:'',tEnd:'',dur:0,repeat:'none',interval:1,prio:false,deadline:false,loc:'',force:'',hint:''};
  const cut=(re,fn)=>{s=s.replace(re,function(){const r=fn.apply(null,arguments);return r===false?arguments[0]:' '})};
  /* Einleitungen */
  if(/^\s*termin\b.*\s(machen|vereinbaren|ausmachen|absagen|verschieben|buchen|holen)\s*[!.]*\s*$/i.test(s))o.force='task';
  else cut(/^\s*(termin|neuer termin)\s*:?\s+/i,()=>{o.force='event'});
  cut(/^\s*(aufgabe|todo|to-do|neue aufgabe)\s*:?\s+/i,()=>{o.force='task'});
  cut(/^\s*(bitte\s+)?(erinnere|erinner)\s+mich\s+(bitte\s+)?(daran\s*,?\s*)?((dass|das)\s+ich\s+)?/i,(m,a1,a2,a3,a4,a5)=>{o.force=o.force||'task';if(a5)o.ich=true});
  cut(/^\s*(ich\s+)?(muss|sollte|will|möchte)\s+(noch\s+)?/i,()=>{});
  cut(/^\s*(nicht\s+vergessen|denk\s+dran|merken)\s*:?\s*/i,()=>{o.force=o.force||'task'});
  /* Wichtigkeit */
  cut(/\s*!{1,3}\s*$/,()=>{o.prio=true});
  cut(R('\\B<(sehr\\s+)?(wichtig|dringend|unbedingt|asap|prio|priorität)\\E>[:!]?'),()=>{o.prio=true});
  /* Wiederholung */
  cut(R('\\B<(jeden|jede|jedes)\\s+(tag|morgen|abend)\\E>|\\B<täglich\\E>'),()=>{o.repeat='daily'});
  cut(R('\\B<(werktags|wochentags|mo\\s*[-–]\\s*fr)\\E>'),()=>{o.repeat='weekdays'});
  cut(R('\\B<(alle\\s+(2|zwei)\\s+wochen|14-?tägig|zweiwöchentlich|vierzehntägig)\\E>'),()=>{o.repeat='weekly';o.interval=2});
  cut(R('\\B<(jeden|jede|immer)\\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)s?\\E>'),(m,a,w)=>{o.repeat='weekly';o.date=nextDow(base,WD.indexOf(w.toLowerCase()),true)});
  cut(R('\\B<(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)s\\E>'),(m,w)=>{o.repeat='weekly';o.date=nextDow(base,WD.indexOf(w.toLowerCase()),true)});
  cut(R('\\B<(wöchentlich|jede\\s+woche)\\E>'),()=>{if(o.repeat==='none')o.repeat='weekly'});
  cut(R('\\B<(monatlich|jeden\\s+monat)\\E>'),()=>{o.repeat='monthly'});
  cut(R('\\B<(jährlich|jedes\\s+jahr)\\E>'),()=>{o.repeat='yearly'});
  /* Datum (vor der Uhrzeit, damit „24.11.“ keine Uhrzeit wird) */
  const pre='(?:(am|bis|ab|vom|zum|bis\\s+zum|spätestens(?:\\s+am)?)\\s+)?';
  const setD=(d,p)=>{o.date=d;if(p&&/bis|spätestens/i.test(p))o.deadline=true};
  cut(R('\\B<'+pre+'(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2,4})?\\E>'),(m,p,d,mo,y)=>{d=+d;mo=+mo;if(d<1||d>31||mo<1||mo>12)return false;
    let yr=y?(+y<100?2000+ +y:+y):parseD(base).getFullYear();let r=yr+'-'+pad(mo)+'-'+pad(d);if(!y&&dd(base,r)<-60)r=(yr+1)+'-'+pad(mo)+'-'+pad(d);setD(r,p)});
  cut(R('\\B<'+pre+'(\\d{1,2})\\.?\\s*('+Object.keys(MONK).join('|')+')\\.?(?:\\s+(\\d{4}))?\\E>'),(m,p,d,mo,y)=>{d=+d;const mn=MONK[mo.toLowerCase()];if(!mn||d<1||d>31)return false;
    let yr=y?+y:parseD(base).getFullYear();let r=yr+'-'+pad(mn)+'-'+pad(d);if(!y&&dd(base,r)<-60)r=(yr+1)+'-'+pad(mn)+'-'+pad(d);setD(r,p)});
  cut(R('\\B<'+pre+'übermorgen\\E>'),(m,p)=>setD(addS(base,2),p));
  cut(R('\\B<'+pre+'morgen\\E>(?!\\s*(früh|vormittag|mittag|nachmittag|abend))'),(m,p)=>setD(addS(base,1),p));
  cut(R('\\B<morgen\\s+(früh|vormittag|mittag|nachmittag|abend)\\E>'),(m,t)=>{o.date=addS(base,1);o.hint=t.toLowerCase()});
  cut(R('\\B<'+pre+'heute\\E>'),(m,p)=>setD(base,p));
  cut(R('\\B<(?:in|innerhalb)\\s+(\\d+|ein|einem|einer|zwei|drei|vier|fünf|sechs|sieben|acht|zehn|vierzehn)\\s+(tag|tagen|woche|wochen|monat|monaten)\\E>'),(m,n,u)=>{n=NUM[n.toLowerCase()]||+n;
    const k=u.toLowerCase();if(k.startsWith('tag'))o.date=addS(base,n);else if(k.startsWith('woche'))o.date=addS(base,7*n);else{const d=parseD(base);d.setMonth(d.getMonth()+n);o.date=ymd(d)}});
  cut(R('\\B<(?:(bis)\\s+)?(?:ende\\s+(?:der|dieser)\\s+woche|diese\\s+woche|zum\\s+wochenende)\\E>'),(m,p)=>{setD(fri(base),'bis')});
  cut(R('\\B<(?:(bis|in\\s+der|ab)\\s+)?(?:nächste|nächsten|kommende|kommenden)\\s+woche\\E>'),(m,p)=>setD(mondayNext(base),p));
  cut(R('\\B<(?:(am|bis\\s+zum|übers?)\\s+)?wochenende\\E>'),(m,p)=>setD(dow(base)===6?base:dow(base)===0?addS(base,-1)<base?base:base:nextDow(base,6,true),p));
  cut(R('\\B<(?:(am|bis|ab|nächsten|nächster|kommenden|diesen|diesem)\\s+)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\\E>'),(m,p,w)=>{const wi=WD.indexOf(w.toLowerCase());
    let d=nextDow(base,wi,false);if(p&&/nächst/i.test(p)&&dd(base,d)<=2&&dow(base)>=4)d=addS(d,0);setD(d,p)});
  cut(R('\\B<(am|bis|ab)\\s+(mo|di|mi|do|fr|sa|so)\\.?\\E>'),(m,p,w)=>{setD(nextDow(base,WDS.indexOf(w.toLowerCase()),false),p)});
  cut(R('\\B<ende\\s+(?:des\\s+)?(?:monats|monat)\\E>'),()=>{const d=parseD(base);o.date=ymd(new Date(d.getFullYear(),d.getMonth()+1,0));o.deadline=true});
  /* Uhrzeit */
  const H=(h,m,expl)=>{h=+h;m=+(m||0);if(h>24||m>59)return null;if(!expl&&h>=1&&h<=6)h+=12;if(h===24)h=0;return h*60+m};
  cut(R('\\B<(?:von\\s+)?(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:uhr\\s*)?(?:-|–|bis)\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*(uhr)?\\E>'),(m,h1,m1,h2,m2,u)=>{
    if(!u&&!m1&&!m2)return false;let a=H(h1,m1,!!m1),b=H(h2,m2,!!m2);if(a==null||b==null)return false;if(b<=a&&b+720>a)b+=720;if(b<=a)return false;o.tStart=hm(a);o.tEnd=hm(b)});
  if(!o.tStart){
    cut(R('\\B<(?:um\\s+|ab\\s+|gegen\\s+)?halb\\s+(\\d{1,2})\\E>'),(m,h)=>{const v=H(h-1,30,false);if(v==null)return false;o.tStart=hm(v)});
    cut(R('\\B<(?:um\\s+|ab\\s+|gegen\\s+)?viertel\\s+(nach|vor)\\s+(\\d{1,2})\\E>'),(m,k,h)=>{let v=H(h,0,false);if(v==null)return false;v+=k.toLowerCase()==='nach'?15:-15;o.tStart=hm(v)});
    cut(R('\\B<(?:um\\s+|ab\\s+|gegen\\s+)?(\\d{1,2}):(\\d{2})(?:\\s*uhr)?\\E>'),(m,h,mi)=>{const v=H(h,mi,true);if(v==null)return false;o.tStart=hm(v)});
    cut(R('\\B<(?:um\\s+|ab\\s+|gegen\\s+)?(\\d{1,2})(?:\\.(\\d{2}))?\\s*uhr\\E>'),(m,h,mi)=>{const v=H(h,mi,+h>6||!!mi&&+h>6);if(v==null)return false;o.tStart=hm(v)});
    cut(R('\\B<(?:um|gegen)\\s+(\\d{1,2})(?:[.:](\\d{2}))?\\E>'),(m,h,mi)=>{const v=H(h,mi,false);if(v==null)return false;o.tStart=hm(v)});
  }
  cut(R('\\B<(?:für\\s+|dauer\\s*:?\\s*)?(\\d+(?:[.,]\\d+)?)\\s*(h|std\\.?|stunden?|min\\.?|minuten)\\E>'),(m,n,u)=>{n=parseFloat(n.replace(',','.'));o.dur=Math.round(/^m/i.test(u)?n:n*60)});
  cut(R('\\B<(?:für\\s+)?(?:eine|1)\\s+stunde\\E>'),()=>{o.dur=60});
  cut(R('\\B<(?:für\\s+)?(?:eine\\s+)?halbe\\s+stunde\\E>'),()=>{o.dur=30});
  cut(R('\\B<(?:für\\s+)?anderthalb\\s+stunden\\E>'),()=>{o.dur=90});
  cut(R('\\B<(morgens|früh|vormittags?|mittags?|nachmittags?|abends?|nachts?)\\E>'),(m,t)=>{o.hint=o.hint||t.toLowerCase()});
  cut(R('\\B<(ganztägig|ganztags|den ganzen tag)\\E>'),()=>{o.allDayHint=true});
  /* Ort */
  cut(/\s@\s*([^,;@]+?)\s*$/,(m,l)=>{o.loc=l.trim()});
  /* Aufräumen des Titels */
  let t=s;
  for(let i=0;i<3;i++){
    t=t.replace(R('^\\s*(am|um|bis|ab|von|vom|zum|zur|für|an|dann|und|noch|bitte|spätestens|den|ab)\\E>\\s*'),' ')
       .replace(R('\\s+(am|um|bis|ab|von|vom|zum|zur|für|an|und|noch|bitte|spätestens|den|uhr)\\s*$'),' ')
       .replace(/\s+[,.;:]+(?=\s|$)/g,' ').replace(/\s{2,}/g,' ').replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g,'');
  }
  t=t.replace(R('\\s+(am|um)\\s+(?=(am|um)\\E>)'),' ').trim();
  if(o.ich)t=t.replace(/([a-zäöüß]+[^n])e$/i,'$1en').replace(/([a-zäöüß]+)e$/i,'$1en');
  o.title=cap(t);
  /* Termin oder Aufgabe? */
  const hasTV=TASKVERB.test(o.title),hasEW=EVENTWORD.test(o.title);
  let kind='task';
  if(o.force)kind=o.force;
  else if(o.tStart&&!(o.deadline&&hasTV))kind='event';
  else if(o.date&&hasEW&&!hasTV)kind='event';
  o.kind=kind;
  if(kind==='event'){
    if(!o.date)o.date=base;
    if(o.tStart&&!o.tEnd){const a=toM(o.tStart);o.tEnd=hm(Math.min(23*60+59,a+(o.dur||evLen(o.title))))}
    o.allDay=!o.tStart;
    if(!o.loc){const m=o.title.match(/\s(?:in|im|bei|beim)\s+((?:der|dem|den)\s+)?((?:Dr\.\s*)?[A-ZÄÖÜ][\wäöüß.-]*(?:\s+[A-ZÄÖÜ][\wäöüß.-]*){0,2})$/);
      if(m&&!FAMILY.test(m[2])){o.loc=m[2];o.title=o.title.slice(0,m.index).trim()}}
    o.cat=guessCat(o.title+' '+o.raw,o.prio);
    if(o.repeat==='weekdays')o.repeat='none';
  }else{
    o.ctx=guessCtx(o.title);o.size=guessSize(o.title);
    if(o.repeat==='monthly'||o.repeat==='yearly'){o.note='Wiederholung '+(o.repeat==='monthly'?'monatlich':'jährlich')+' gibt es nur bei Terminen';o.repeat='none'}
    if(o.repeat!=='none'&&!o.date)o.date=base;
  }
  return o.title?o:null;
}
function splitInput(text){
  let parts=String(text||'').split(/\n+|;\s*|,\s+(?=[^\d\s])(?!(?:dass|das|ob|weil|wenn|aber|sondern|denn|damit|bevor|nachdem)\s)/i).map(x=>x.replace(/^[-•*\d.)\s]+(?=\D)/,'').trim()).filter(Boolean);
  const out=[];
  for(const p of parts){
    /* „Brot kaufen und Leon abholen“ → zwei Aufgaben, „Essen mit Tanja und Leon“ bleibt eins */
    const und=p.split(/\s+und\s+(?:dann\s+)?/i);
    if(und.length>1&&und.every(x=>TASKVERB.test(x)||EVENTWORD.test(x))){out.push(...und);continue}
    /* Bruchstücke wie „15 Uhr“ hängen am Vorgänger */
    const probe=parseOne(p);
    if(out.length&&(!probe||probe.title.replace(/[^a-zäöüß]/gi,'').length<2))out[out.length-1]+=' '+p;else out.push(p);
  }
  return out;
}
function parse(text,base){
  const segs=splitInput(text);const items=[];
  for(const s of segs){const o=parseOne(s,base);if(o)items.push(o)}
  /* „Elternabend vorbereiten bis Montag“ mit Termin „Elternabend Mo 19 Uhr“: bleibt zwei Einträge – Absicht */
  return items;
}

/* ================= 2. Aufgaben zerlegen ================= */
const STEPLIB=[
 [/korrig|korrektur|klassenarbeit|klausur|aufsätze|hefte|tests?\b/i,c=>{const n=c.count||0,ch=n?Math.max(1,Math.ceil(n/6)):3,out=['Stapel'+(c.klasse?' der '+c.klasse:'')+' und Erwartungshorizont bereitlegen'];
   if(n)for(let i=0;i<ch;i++){const a=i*6+1,b=Math.min(n,(i+1)*6);out.push('Arbeiten '+a+'–'+b+' korrigieren')}
   else out.push('Erste 5 Arbeiten korrigieren','Nächste 5 Arbeiten korrigieren','Restliche Arbeiten korrigieren');
   out.push('Punkte in die Korrekturtabelle eintragen','Notenschlüssel prüfen und Noten festlegen','Kurze Rückmeldung je Arbeit schreiben','Notenliste aktualisieren');return out}],
 [/elternabend/i,c=>['Termin und Raum festlegen','Einladung'+(c.klasse?' für die '+c.klasse:'')+' schreiben und verteilen','Tagesordnung aufstellen','Infos und Folien zusammenstellen','Wahl Elternvertreter vorbereiten (falls nötig)','Raum herrichten, Namensschilder','Protokoll schreiben und verschicken']],
 [/elterngespräch|standortgespräch|gespräch mit/i,c=>['Termin bestätigen','Noten und Beobachtungen zusammentragen','Drei Stärken und ein Ziel notieren','Gesprächsbogen ausdrucken','Gespräch führen','Vereinbarungen notieren und ablegen']],
 [/unterricht|stunde|einheit|reihe|vorbereit.*(deutsch|geo|gk|gemeinschaftskunde|wbs|kunst|bk|religion|reli)/i,c=>['Lernziel'+(c.klasse?' für die '+c.klasse:'')+' festlegen','Bildungsplanbezug prüfen','Einstieg überlegen','Material und Buchseiten raussuchen','Arbeitsblatt erstellen oder anpassen','Differenzierung für schwächere und stärkere Schüler','Ablauf mit Zeiten notieren','Kopien machen']],
 [/zeugnis|noten(?!schlüssel)|notenliste|notenkonferenz/i,c=>['Alle Noten sammeln','Notenliste auf Lücken prüfen','Fehlende Noten nachfordern','Bemerkungen formulieren','Noten eintragen','Für die Konferenz ausdrucken','Nach der Konferenz kontrollieren']],
 [/ausflug|wandertag|exkursion|klassenfahrt|lerngang/i,c=>['Ziel und Datum festlegen','Genehmigung bei der Schulleitung einholen','Kosten und Anfahrt klären','Elternbrief mit Einverständniserklärung schreiben','Rückläufer und Geld einsammeln','Bus oder Bahn buchen','Teilnehmerliste mit Notfallnummern','Erste-Hilfe-Set einpacken']],
 [/elternbrief|rundbrief|brief|anschreiben/i,c=>['Stichpunkte sammeln: Was, wann, was müssen Eltern tun?','Ersten Entwurf schreiben','Fristen und Kosten prüfen','Gegenlesen (lassen)','Kopieren oder per Mail verschicken','Rückläufer abhaken']],
 [/e-?mail|mails|posteingang|postfach/i,c=>['Posteingang 10 Minuten sichten','Dringendes markieren','Drei kurze Antworten schreiben','Newsletter und Erledigtes archivieren']],
 [/präsentation|folien|vortrag|referat|keynote|powerpoint/i,c=>['Ziel und Publikum klären','Gliederung in 5 Punkten','Folien grob anlegen','Inhalte und Beispiele einfügen','Einmal laut durchsprechen','Technik und Adapter prüfen']],
 [/bewerbung/i,c=>['Stellenanzeige genau lesen','Lebenslauf aktualisieren','Anschreiben entwerfen','Zeugnisse als PDF zusammenstellen','Gegenlesen lassen','Abschicken und Datum notieren']],
 [/umzug|umziehen/i,c=>['Termin festlegen','Kartons besorgen','Zimmer für Zimmer packen','Adresse ummelden','Helfer und Transporter organisieren','Zählerstände notieren']],
 [/geschenk/i,c=>['Ideen sammeln','Budget festlegen','Eins auswählen','Kaufen oder bestellen','Einpacken','Karte schreiben']],
 [/geburtstag|party|feier|fest\b|grillen/i,c=>['Datum und Gästeliste','Einladungen verschicken','Essen und Getränke planen','Einkaufsliste schreiben','Einkaufen','Deko und Musik','Am Vortag vorbereiten']],
 [/urlaub|reise|ferien planen|kurztrip/i,c=>['Ziel und Zeitraum festlegen','Unterkunft buchen','Anreise klären (ID. Buzz laden oder Bahn)','Packliste schreiben','Haus vorbereiten: Pflanzen, Post, Müll','Packen']],
 [/arzt|zahnarzt|termin vereinbaren|termin machen/i,c=>['Nummer raussuchen','Freie Zeiten im Kalender prüfen','Anrufen','Termin eintragen','Unterlagen bereitlegen (Karte, Überweisung)']],
 [/auto|werkstatt|tüv|reifen|inspektion/i,c=>['Problem oder Anlass notieren','Werkstatt anrufen','Termin eintragen','Auto hinbringen','Abholen und Rechnung ablegen']],
 [/steuer|papierkram|unterlagen|belege|formular|antrag|versicherung|kündig/i,c=>['Alle Unterlagen an einem Ort sammeln','Belege sortieren','Fehlendes notieren und anfordern','Formular ausfüllen','Kopie ablegen','Abschicken']],
 [/küche|spül|geschirr/i,c=>['Spülmaschine ausräumen','Arbeitsflächen frei räumen','Geschirr spülen oder einräumen','Oberflächen abwischen','Herd und Spüle reinigen','Boden fegen','Müll rausbringen']],
 [/bad\b|toilette|dusche/i,c=>['Waschbecken putzen','Spiegel abwischen','Toilette reinigen','Dusche oder Wanne putzen','Handtücher wechseln','Boden wischen']],
 [/wäsche|waschen|bügeln/i,c=>['Wäsche sortieren','Maschine anstellen','Wäsche aufhängen','Trockene Wäsche abnehmen','Zusammenlegen','Wegräumen']],
 [/aufräum|zimmer|schreibtisch|keller|ausmist|garage|dachboden|schrank/i,c=>['Müll einsammeln','Eine Fläche frei räumen','Alles an seinen Platz bringen','Eine Kiste ausmisten','Spenden oder Wegwerfen trennen','Staubsaugen']],
 [/garten|rasen|hecke|beet/i,c=>['Werkzeug rausholen','Rasen mähen oder Unkraut jäten','Hecke oder Sträucher schneiden','Grünschnitt wegbringen','Werkzeug wegräumen']],
 [/einkauf|einkaufen|wocheneinkauf/i,c=>['Vorräte prüfen','Einkaufsliste nach Abteilungen schreiben','Taschen und Gläser einpacken (plastikfrei)','Einkaufen','Einräumen']],
 [/bestell/i,c=>['Was genau? Maße und Menge notieren','Zwei Angebote vergleichen','Bestellen','Lieferung prüfen']],
 [/app|webseite|homepage|programm|website|tool/i,c=>['Ziel in einem Satz aufschreiben','Wichtigste Funktionen auflisten','Grobe Skizze der Oberfläche','Erste Version bauen','Testen (Handy und PC)','Veröffentlichen und Link verschicken']],
 [/lernen|üben|wiederholen|vokabeln/i,c=>['Stoff eingrenzen','Material bereitlegen','25 Minuten lernen','5 Minuten Pause','Selbst abfragen','Offene Fragen notieren']],
 [/lesen|buch|artikel/i,c=>['Ruhigen Platz suchen','Handy weglegen','20 Minuten lesen','Wichtigste Gedanken notieren']],
 [/plan|organis/i,c=>['Ziel festlegen','Alle Beteiligten notieren','Termine und Fristen sammeln','Aufgaben verteilen','Ersten Schritt heute erledigen']],
 [/schreib|text|bericht|konzept|protokoll/i,c=>['Stichpunkte sammeln','Gliederung festlegen','Ersten Entwurf schreiben (unperfekt ist okay)','Überarbeiten','Gegenlesen','Abschicken oder ablegen']]];
const STEP_DEF=['Ersten kleinen Schritt festlegen','Material bereitlegen','10 Minuten anfangen','Weitermachen bis zur nächsten Pause','Zum Schluss prüfen und abhaken'];
function steps(text){
  const t=String(text||'');
  const km=t.match(/\b(\d{1,2}[a-e])\b/i),nm=t.match(/(\d{1,3})\s*(arbeiten|hefte|tests|klausuren|aufsätze|klassenarbeiten|schüler)/i);
  const c={klasse:km?km[1].toLowerCase():'',count:nm?+nm[1]:0};
  let list=null,why='';
  for(const [re,f] of STEPLIB)if(re.test(t)){list=f(c);why=t.match(re)[0];break}
  if(!list)list=STEP_DEF.slice();
  const per=/korrig|korrektur/i.test(t)?(c.count?20:25):12;
  const min=Math.max(10,Math.round(list.length*per/5)*5);
  const size=min<=20?'S':min<=50?'M':'L';
  return{steps:list,size,min,why};
}

/* ================= Daten aus den Bereichen ================= */
async function from(tab,fn,...a){try{await window.ensure(tab);const r=window.call(tab,fn,...a);return r&&typeof r.then==='function'?await r:r}catch(e){return undefined}}
async function eventsRange(a,b){const r=await from('kalender','rangeBrief',a,b);return r||{}}
function evMin(e){if(e.allDay||!e.tStart)return 0;const a=toM(e.tStart),b=e.tEnd?toM(e.tEnd):a+60;return Math.max(15,b>a?b-a:60)}
function estTask(x){const open=typeof x.steps==='number'?x.steps:(x.steps||[]).filter(s=>!s.done).length;if(open)return Math.min(120,Math.max(15,open*12));return {S:15,M:30,L:60}[x.size||guessSize(x.text)]||20}
function energy(){try{const e=JSON.parse(localStorage.getItem('planer.energy')||'null');if(e&&e.d===today())return e.v}catch(_){}return null}

/* ================= 3a. Tag planen ================= */
async function planDay(day){
  day=day||today();const isT=day===today();
  const ev=((await eventsRange(day,day))[day]||[]).slice();
  const b=isT?await from('woche','briefing'):null;
  const g=await from('woche','gtdList')||{next:[],someday:[]};
  let tasks=[];
  if(isT&&b&&b.open)tasks=b.open.map(x=>Object.assign({},x,{date:day}));
  else tasks=g.next.filter(x=>x.date===day);
  const over=isT?g.next.filter(x=>x.date&&x.date<day):[];
  for(const x of over)if(!tasks.some(t=>t.id===x.id))tasks.push(Object.assign({},x,{overdue:true}));
  const en=energy(),budget=en==='wenig'?40:en==='mittel'?90:Infinity;
  const now=new Date(),nowM=now.getHours()*60+now.getMinutes();
  let start=Math.max(7*60,isT?Math.ceil((nowM+5)/15)*15:7*60),end=21*60+30;
  const busy=ev.filter(e=>!e.allDay&&e.tStart).map(e=>{const a=toM(e.tStart),z=e.tEnd?toM(e.tEnd):a+60;return{a:a-5,z:Math.max(z,a+15)+5,e}}).sort((x,y)=>x.a-y.a);
  const gaps=[];let c=start;
  for(const k of busy){if(k.a-c>=15)gaps.push({a:c,z:k.a});c=Math.max(c,k.z)}
  if(end-c>=15)gaps.push({a:c,z:end});
  const rank=x=>(x.prio?0:10)+(x.overdue?0:3)+(x.carried?1:2)+(en==='wenig'?{S:0,M:1,L:2}[x.size||guessSize(x.text)]:0);
  tasks.sort((a,b)=>rank(a)-rank(b));
  const blocks=[],rest=[];let used=0,streak=0,last=-1;
  for(const x of tasks){
    let dur=estTask(x);const big=dur>50;if(big)dur=50;
    if(used+dur>budget){rest.push(x);continue}
    const ctx=x.ctx||guessCtx(x.text);
    let placed=false;
    for(const gp of gaps){
      let a=gp.a;
      if(ctx==='telefon')a=Math.max(a,8*60+30);
      if(streak>=90&&a===last){a+=10;streak=0}
      const lim=ctx==='telefon'?Math.min(gp.z,18*60):ctx==='besorgung'?Math.min(gp.z,19*60):gp.z;
      if(lim-a>=dur){blocks.push({a,z:a+dur,x,big});if(a===last)streak+=dur;else streak=dur;last=a+dur;gp.a=a+dur;placed=true;break}
    }
    if(placed)used+=dur;else rest.push(x);
  }
  const all=blocks.map(k=>({a:k.a,z:k.z,kind:'t',x:k.x,big:k.big})).concat(busy.map(k=>({a:k.a+5,z:k.z-5,kind:'e',e:k.e}))).sort((p,q)=>p.a-q.a);
  return{day,isT,blocks,all,rest,allDay:ev.filter(e=>e.allDay||!e.tStart),used,budget,en,late:isT&&nowM>end-30,freeMin:gaps.reduce((s,gp)=>s+Math.max(0,gp.z-gp.a),0),tasks};
}
/* ================= 3b. Woche planen ================= */
async function planWeek(){
  const t=today(),w=dow(t);
  const first=w===6||w===0?mondayNext(t):t;
  const last=addS(first,(7-dow(first))%7);
  const days=[];for(let d=first;d<=last;d=addS(d,1))days.push(d);
  const ev=await eventsRange(first,last);
  const g=await from('woche','gtdList')||{next:[],someday:[]};
  const load={};for(const d of days){load[d]=(ev[d]||[]).reduce((s,e)=>s+(e.allDay?(SCHOOL.test(e.title)?120:30):evMin(e)),0)}
  const dated=g.next.filter(x=>x.date&&x.date>=first&&x.date<=last);
  for(const x of dated)load[x.date]=(load[x.date]||0)+estTask(x);
  const cand=g.next.filter(x=>!x.date||x.date<t).map(x=>Object.assign({},x,{overdue:!!x.date}));
  cand.sort((a,b)=>(b.prio?1:0)-(a.prio?1:0)||(b.overdue?1:0)-(a.overdue?1:0)||estTask(b)-estTask(a));
  const moves=[];
  for(const x of cand){
    const est=estTask(x),ctx=x.ctx||guessCtx(x.text);let best=null,bs=Infinity;
    days.forEach((d,i)=>{const wd=dow(d);let sc=load[d]+est;
      if(x.prio)sc+=i*90;
      if(ctx==='schule'&&(wd===0||wd===6))sc+=600;
      if(ctx==='besorgung'&&wd===0)sc+=900;
      if(ctx==='telefon'&&(wd===0||wd===6))sc+=300;
      if(est>=50&&load[d]>300)sc+=240;
      if(d===t&&new Date().getHours()>=18)sc+=400;
      if(sc<bs){bs=sc;best=d}});
    load[best]+=est;moves.push({id:x.id,text:x.text,date:best,est,prio:x.prio,overdue:x.overdue,ctx});
  }
  const total=days.reduce((s,d)=>s+load[d],0);
  return{first,last,days,load,moves,ev,dated,total,someday:g.someday.length};
}

/* ================= 4. Begleiter: Fragen verstehen und beantworten ================= */
function rangeOf(q){
  const t=today(),s=q.toLowerCase();
  if(/übermorgen/.test(s))return[addS(t,2),addS(t,2)];
  if(/\bmorgen\b/.test(s))return[addS(t,1),addS(t,1)];
  if(/nächste[nr]?\s+woche|kommende\s+woche/.test(s)){const m=mondayNext(t);return[m,addS(m,6)]}
  if(/diese[rn]?\s+woche|\bwoche\b/.test(s)){const n=(7-dow(t))%7;return[t,addS(t,n)]}
  if(/wochenende/.test(s)){const sa=dow(t)===6?t:dow(t)===0?addS(t,-1):nextDow(t,6,true);return[sa<t?t:sa,addS(sa,1)]}
  const m=s.match(R('\\B<(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\\E>'));
  if(m){const d=nextDow(t,WD.indexOf(m[1]),true);return[d,d]}
  const p=parseOne(q);if(p&&p.date)return[p.date,p.date];
  return[t,t];
}
const STOP=new Set(['wann','ist','sind','habe','hab','ich','der','die','das','den','dem','mein','meine','meinen','nächste','nächsten','nächster','termin','termine','wieder','eigentlich','denn','noch','mal','bitte','zum','zur','beim','bei','am','um','mit','ein','eine','einen','gibt','es','steht','an','was','wo','wer','haben','wir']);
function draftReplies(m,form){
  const first=String(m.from||'').replace(/".*?"/,'').split(/[\s,<@]/).filter(Boolean)[0]||'';
  const du=form!=='sie';
  const hi=du?'Hallo'+(first?' '+first:'')+',':'Guten Tag'+(m.from?' '+String(m.from).replace(/<.*?>|"/g,'').trim():'')+',';
  const sub=m.subject?'„'+m.subject.replace(/^(re|aw|fwd?|wg):\s*/i,'')+'“':'deine Nachricht';
  const t0=today(),w0=dow(t0),fd=w0>=4||w0===0?addS(t0,(8-w0)%7||7):fri(t0),frist=WDN[dow(fd)]+(fd===t0?'':'');
  const D=(body)=>hi+'\n\n'+body+'\n\nViele Grüße\nThorsten';
  return du?[
    ['Zusagen',D('danke für deine Mail zu '+sub+'. Das passt für mich. Ich bin dabei.')],
    ['Später melden',D('danke, ist angekommen. Ich schaue es mir in Ruhe an und melde mich bis '+frist+'.')],
    ['Rückfrage',D('danke für deine Mail zu '+sub+'. Kurze Rückfrage: Bis wann brauchst du eine Antwort?')],
    ['Absagen',D('danke für die Anfrage. Das schaffe ich diesmal leider nicht. Beim nächsten Mal gern wieder.')]]
  :[
    ['Zusagen',D('vielen Dank für Ihre Nachricht zu '+sub.replace('deine','Ihre')+'. Der Termin passt mir. Ich komme gern.')],
    ['Später melden',D('vielen Dank, Ihre Nachricht ist angekommen. Ich melde mich bis '+frist+' bei Ihnen.')],
    ['Rückfrage',D('vielen Dank für Ihre Nachricht. Eine kurze Rückfrage: Bis wann benötigen Sie eine Antwort?')],
    ['Absagen',D('vielen Dank für die Anfrage. Leider schaffe ich es diesmal nicht.')]];
}
function triage(m){
  const s=(m.subject||'')+' '+(m.from||'');
  if(m.vip||/dringend|heute|frist|bis morgen|asap|eilt|wichtig|mahnung|erinnerung|krank|ausfall|vertretung/i.test(s))return['[!]','Dringend','#D81E1E'];
  if(/newsletter|angebot|rabatt|sale|deal|news|digest|gutschein|% |prozent|aktion|webinar|no-?reply|noreply/i.test(s))return['[x]','Archivieren','#8E8E93'];
  if(/termin|einladung|anfrage|frage|bitte|rückmeldung|abgabe|elternabend|konferenz/i.test(s))return['[>]','Wichtig','#E8890C'];
  return['[~]','Zur Info','#2F6FDE'];
}
function weatherNow(){try{const w=JSON.parse(localStorage.getItem('planer.weather')||'null');if(w&&w.data&&Date.now()-w.t<36*3600000)return w.data}catch(_){}return null}

/* ================= Oberfläche ================= */
const NAMES=['Klementine','Bit','Olli'];
const css=document.createElement('style');
css.textContent=`
.ki{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.28);display:flex;align-items:flex-end;justify-content:center;animation:kiF .18s ease-out}
.ki[hidden]{display:none}
.kiS{width:100%;max-width:560px;height:min(88vh,88dvh,760px);background:#F2F2F7;border-radius:22px 22px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -10px 40px rgba(0,0,0,.18);animation:kiU .24s cubic-bezier(.2,.9,.3,1);font:15px/1.4 -apple-system,system-ui,"Segoe UI",Roboto,sans-serif;color:#1C1C1E}
@media (min-width:900px){.ki{align-items:center}.kiS{border-radius:22px;height:min(80vh,720px)}}
@keyframes kiF{from{opacity:0}to{opacity:1}}@keyframes kiU{from{transform:translateY(40px);opacity:.6}to{transform:none;opacity:1}}
.kiH{display:flex;align-items:center;gap:10px;padding:12px 12px 10px 14px;background:#fff;border-bottom:1px solid rgba(60,60,67,.12)}
.kiH .av{width:40px;height:40px;flex:none}.kiH .av svg{width:100%;height:100%}
.kiH b{display:block;font-size:16px}.kiH small{display:block;font-size:12px;color:#8A8A8E}
.kiH .x{margin-left:auto;width:34px;height:34px;border-radius:50%;border:0;background:rgba(118,118,128,.12);font-size:15px;color:#3A3A3C;cursor:pointer}
.kiL{flex:1;overflow-y:auto;padding:14px 12px 6px;-webkit-overflow-scrolling:touch}
.kiM{display:flex;margin:0 0 10px}.kiM.u{justify-content:flex-end}
.kiM .b{max-width:88%;padding:9px 12px;border-radius:18px;background:#fff;box-shadow:0 1px 1px rgba(0,0,0,.04);white-space:pre-line}
.kiM.u .b{background:#007AFF;color:#fff;border-bottom-right-radius:6px}
.kiM.a .b{border-bottom-left-radius:6px}
.kiM .b b{font-weight:650}
.kiM .card{margin-top:8px;border-radius:12px;background:#F7F7FA;padding:4px 10px;white-space:normal}
.kiR{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px solid rgba(60,60,67,.08);font-size:14px}
.kiR:first-child{border-top:0}
.kiR .tm{font:600 13px/1.5 ui-monospace,"SF Mono",Menlo,monospace;flex:none;min-width:44px;color:#3A3A3C}
.kiR .dot{flex:none;width:9px;height:9px;border-radius:50%;margin-top:6px}
.kiR .tx{flex:1;min-width:0}.kiR .tx small{display:block;color:#8A8A8E;font-size:12px}
.kiR.ev .tx{color:#6E6E73}
.kiR .ck{flex:none;width:20px;height:20px;margin-top:1px;accent-color:#007AFF}
.kiR .ty{flex:none;border:0;background:rgba(118,118,128,.12);border-radius:8px;font-size:12px;padding:2px 7px;cursor:pointer;margin-top:1px}
body.kiopen .bud,body.kiopen .bub{display:none!important}
.kiR .rm{flex:none;border:0;background:none;color:#AEAEB2;font-size:16px;cursor:pointer;padding:0 4px}
.kiR input.ed{flex:1;min-width:0;border:0;background:none;font:inherit;color:inherit;padding:0;border-bottom:1px dashed transparent}
.kiR input.ed:focus{outline:0;border-bottom-color:#007AFF}
.kiD{font:600 12px/1.4 -apple-system,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8A8A8E;margin:10px 0 2px}
.kiA{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.kiA button{border:0;border-radius:16px;padding:7px 12px;font:600 13.5px/1.2 inherit;font-family:inherit;background:#007AFF;color:#fff;cursor:pointer}
.kiA button.g{background:rgba(118,118,128,.14);color:#1C1C1E}
.kiA button:disabled{opacity:.5}
.kiC{display:flex;gap:6px;overflow-x:auto;padding:8px 12px 4px;scrollbar-width:none}.kiC::-webkit-scrollbar{display:none}
.kiC button{flex:none;border:1px solid rgba(60,60,67,.14);background:#fff;border-radius:16px;padding:7px 12px;font:500 13.5px/1.2 inherit;font-family:inherit;color:#1C1C1E;cursor:pointer;white-space:nowrap}
.kiF{display:flex;gap:8px;align-items:flex-end;padding:8px 12px calc(10px + env(safe-area-inset-bottom));background:#F2F2F7}
.kiF textarea{flex:1;resize:none;border:1px solid rgba(60,60,67,.18);border-radius:20px;padding:9px 14px;font:16px/1.35 inherit;font-family:inherit;max-height:120px;background:#fff;color:#1C1C1E}
.kiF textarea:focus{outline:0;border-color:#007AFF}
.kiF button{flex:none;width:40px;height:40px;border-radius:50%;border:0;background:#007AFF;color:#fff;font-size:18px;cursor:pointer}
.kiPre{white-space:pre-wrap;font-size:13.5px;background:#fff;border-radius:10px;padding:8px 10px;margin:6px 0;border:1px solid rgba(60,60,67,.1)}
.kiTy{display:inline-flex;gap:4px;align-items:center}.kiTy i{width:6px;height:6px;border-radius:50%;background:#AEAEB2;animation:kiT 1s infinite}.kiTy i:nth-child(2){animation-delay:.15s}.kiTy i:nth-child(3){animation-delay:.3s}
@keyframes kiT{0%,100%{opacity:.3}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.ki,.kiS,.kiTy i{animation:none}}
`;
document.head.appendChild(css);
const root=document.createElement('div');root.className='ki';root.hidden=true;
root.innerHTML='<div class="kiS" role="dialog" aria-modal="true" aria-label="Assistent"><div class="kiH"><span class="av" id="kiAv"></span><div><b id="kiNm">Klementine</b><small>KI auf deinem Gerät · ohne Internet</small></div><button class="x" id="kiX" aria-label="Schließen">✕</button></div>'+
  '<div class="kiL" id="kiL" aria-live="polite"></div><div class="kiC" id="kiC"></div>'+
  '<form class="kiF" id="kiFm"><textarea id="kiI" rows="1" placeholder="Frag mich – oder: „Morgen 15 Uhr Zahnarzt“" enterkeyhint="send" autocomplete="off"></textarea><button aria-label="Senden">↑</button></form></div>';
document.body.appendChild(root);
const $k=id=>root.querySelector('#'+id);
const log=$k('kiL'),inp=$k('kiI');
let area='start';
function haptic(){try{window.Native&&Native.haptic&&Native.haptic()}catch(_){}}
function scroll(){requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight})}
function user(t){const d=document.createElement('div');d.className='kiM u';d.innerHTML='<div class="b"></div>';d.firstChild.textContent=t;log.appendChild(d);scroll()}
function bot(html,acts){
  const d=document.createElement('div');d.className='kiM a';
  d.innerHTML='<div class="b">'+html+(acts&&acts.length?'<div class="kiA">'+acts.map((a,i)=>'<button type="button" data-a="'+i+'"'+(a.g?' class="g"':'')+'>'+esc(a.l)+'</button>').join('')+'</div>':'')+'</div>';
  log.appendChild(d);
  if(acts)d.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{haptic();const a=acts[+b.dataset.a];if(a.once!==false)d.querySelectorAll('.kiA button').forEach(x=>x.disabled=true);try{a.f(d)}catch(e){console.error(e)}});
  scroll();return d;
}
function typing(){const d=document.createElement('div');d.className='kiM a';d.innerHTML='<div class="b"><span class="kiTy"><i></i><i></i><i></i></span></div>';log.appendChild(d);scroll();return()=>d.remove()}
function chips(){
  const base=area==='woche'?[['Plane meine Woche','Plane meine Woche'],['Aufgabe zerlegen','Aufgabe zerlegen'],['Was ist überfällig?','Was ist überfällig?'],['Plane meinen Tag','Plane meinen Tag']]
    :area==='mail'?[['Mails zusammenfassen','Fasse meine Mails zusammen'],['Plane meinen Tag','Plane meinen Tag']]
    :area==='kalender'?[['Was steht diese Woche an?','Was steht diese Woche an?'],['Wann habe ich morgen Zeit?','Wann habe ich morgen Zeit?'],['Plane meine Woche','Plane meine Woche']]
    :[['Was steht heute an?','Was steht heute an?'],['Plane meinen Tag','Plane meinen Tag'],['Plane meine Woche','Plane meine Woche'],['Aufgabe zerlegen','Aufgabe zerlegen'],['Mails zusammenfassen','Fasse meine Mails zusammen']];
  const all=base.concat([['Schnelleingabe',null],['Was kannst du?','Was kannst du?']]);
  $k('kiC').innerHTML=all.map((c,i)=>'<button type="button" data-c="'+i+'">'+esc(c[0])+'</button>').join('');
  $k('kiC').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const c=all[+b.dataset.c];haptic();
    if(!c[1]){bot('Schreib einfach los, eine Sache pro Zeile oder mit Komma getrennt. Zum Beispiel:\n<i>Morgen 15 Uhr Zahnarzt Leon\nElternbriefe 9a bis Freitag drucken!\nJeden Dienstag 17 Uhr Training\nBrot kaufen und Paket abholen</i>\nIch erkenne Datum, Uhrzeit, Ort, Wiederholung und Wichtigkeit – und ob es ein Termin oder eine Aufgabe ist.');inp.focus();return}
    handle(c[1])});
}
function open(a,q){
  area=a||'start';
  const k=window.buddyKind?buddyKind():0;
  $k('kiNm').textContent=k>=0?NAMES[k]||'Assistent':'Assistent';
  try{$k('kiAv').innerHTML=window.buddySVG?buddySVG('happy',k<0?0:k):''}catch(_){}
  chips();root.hidden=false;document.body.classList.add('kiopen');
  if(!log.children.length){const h=new Date().getHours();
    bot((h<11?'Guten Morgen!':h<17?'Hallo!':'Guten Abend!')+' Ich helfe dir beim Planen. Frag mich etwas, tipp unten auf einen Vorschlag oder schreib Termine und Aufgaben einfach so auf, wie du sie sagen würdest.\n<small style="color:#8A8A8E">Alles wird hier auf dem Gerät berechnet. Nichts geht ins Internet.</small>')}
  if(q)handle(q);
  else if(matchMedia('(min-width:900px)').matches)setTimeout(()=>inp.focus(),200);
}
function close(){root.hidden=true;document.body.classList.remove('kiopen');inp.blur()}
$k('kiX').onclick=close;
root.addEventListener('click',e=>{if(e.target===root)close()});
$k('kiFm').onsubmit=e=>{e.preventDefault();const v=inp.value.trim();if(!v)return;inp.value='';fit();handle(v)};
inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$k('kiFm').requestSubmit?$k('kiFm').requestSubmit():$k('kiFm').onsubmit(e)}});
function fit(){inp.style.height='auto';inp.style.height=Math.min(120,inp.scrollHeight)+'px'}
inp.addEventListener('input',fit);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!root.hidden)close()});
const hb=window.handleBack;window.handleBack=function(){if(!root.hidden){close();return true}return hb?hb.apply(this,arguments):false};

/* ---------- Antworten ---------- */
async function handle(q){
  user(q);const done=typing();
  await new Promise(r=>setTimeout(r,180));
  try{await route(q)}catch(e){console.error(e);bot('Da ist mir etwas durcheinandergeraten. Versuch es bitte noch einmal anders.')}
  finally{done();const last=log.lastElementChild;if(last&&last.querySelector('.kiTy'))last.remove();scroll()}
}
async function route(q){
  const s=q.toLowerCase().trim();
  if(/^(hilfe|help|\?|was kannst du|wie funktioniert|was geht)/.test(s))return help();
  if(/zerleg|in (kleine )?schritte|schritte für|wie fange ich|wie gehe ich .* an/.test(s))return breakdown(q.replace(/^.*?(zerleg\w*|in (kleine )?schritte( zerlegen)?|schritte für|wie fange ich( mit)?|wie gehe ich)\s*(die|den|das|mit|bei)?\s*/i,'').replace(/\s*(an\??|zerlegen|bitte)\s*$/i,'').replace(/[?.!]+$/,''));
  if(/^(bitte\s+)?(plan|organisier|strukturier|verteil)\w*\s+(mir\s+)?(bitte\s+)?(meine|die|diese|nächste|unsere)?\s*(woche|wochenaufgaben|aufgaben)|wochenplanung|wochenplan/.test(s))return weekPlan();
  if(/^(bitte\s+)?(plan|organisier|strukturier)\w*\s+(mir\s+)?(bitte\s+)?(meinen|den|mein)?\s*(tag|heute|morgen)|tagesplan|wie schaffe ich|in welcher reihenfolge/.test(s))return dayPlan(/morgen/.test(s)?addS(today(),1):today());
  if(/(fass|zusammen|zeig|lies|was gibt|neue|ungelesen|antwort|check|sortier|triage|habe ich).*(mail|mails|e-mail|posteingang)|^(mails|posteingang|e-mails)\b/.test(s))return mails(/antwort|entw[uü]rf|antworten/.test(s));
  if(/wetter|regnet es|wird es (regnen|warm|kalt|schneien)|brauche? ich (einen |eine )?(schirm|jacke|regenjacke)|wie (warm|kalt) (wird|ist)|wie viel grad/.test(s))return weather(q);
  if(/überfällig|liegen geblieben|was habe ich vergessen|was hab ich vergessen|hänge ich hinterher/.test(s))return overdue();
  if(/^wann\s+(ist|sind|habe ich|hab ich|hat|findet|kommt|war)|^wann\b.*\?$/.test(s)&&!/zeit|frei/.test(s))return when(q);
  if(/(wann|wo).*(zeit|frei|luft)|freie zeit|zeit für|habe ich zeit|bin ich frei/.test(s))return free(rangeOf(q)[0]);
  if(/wie ?viele?|anzahl|wie viel/.test(s))return counts();
  if(/^(was|welche|zeig|habe ich|hab ich|gibt es|steht|stehen|termine|aufgaben|agenda|überblick|heute|morgen|übermorgen|diese woche|nächste woche)\b/.test(s)&&!/(^|\s)(um \d|\d{1,2}[:.]\d{2}|\d+ ?uhr)/.test(s))return agenda(rangeOf(q));
  if(/^(danke|super|toll|cool|prima|klasse|merci)/.test(s)){bot(['Gern geschehen!','Immer gern.','Dafür bin ich da.'][Math.floor(Math.random()*3)]);return}
  if(/^(hallo|hi|hey|moin|guten (morgen|tag|abend)|servus)/.test(s)){bot('Hallo! Womit fangen wir an? Tipp unten auf einen Vorschlag oder schreib mir einfach.');return}
  const items=parse(q);
  if(items.length&&(items.some(x=>x.date||x.tStart||x.prio||x.repeat!=='none')||items.some(x=>TASKVERB.test(x.title)||EVENTWORD.test(x.title))||items.length>1||!/\?$/.test(q)))return quick(items);
  bot('Das verstehe ich noch nicht ganz. Ich kann Termine und Aufgaben eintragen, deinen Tag oder deine Woche planen, Aufgaben zerlegen, Mails zusammenfassen und sagen, was ansteht.',[{l:'Was kannst du?',f:()=>handle('Was kannst du?'),g:true}]);
}
function help(){
  bot('<b>Das kann ich – ganz ohne Internet:</b>\n\n<b>Schnelleingabe</b> – „Morgen 15 Uhr Zahnarzt, Elternbriefe bis Fr drucken!“ wird zu Termin und Aufgabe.\n<b>Aufgaben zerlegen</b> – „Zerlege Klassenarbeiten 9a korrigieren (26 Arbeiten)“.\n<b>Tag planen</b> – ich lege deine Aufgaben in die Lücken zwischen den Terminen, passend zu deiner Energie.\n<b>Woche planen</b> – ich verteile Wochenaufgaben auf die Tage, an denen Luft ist.\n<b>Fragen</b> – „Was steht morgen an?“, „Wann ist der Elternabend?“, „Wann habe ich Freitag Zeit?“, „Was ist überfällig?“, „Brauche ich einen Schirm?“\n<b>Mails</b> – Posteingang nach Dringend, Wichtig, Zur Info und Archivieren sortieren und Antwortentwürfe vorschlagen.');
}
/* Schnelleingabe-Vorschau */
function itemRow(x,i){
  const meta=[];
  if(x.kind==='event'){meta.push(relDay(x.date)+(x.allDay?' · ganztägig':' · '+x.tStart+(x.tEnd?'–'+x.tEnd:'')));if(x.loc)meta.push('📍 '+x.loc);
    meta.push({schule:'Schule',familie:'Familie',privat:'Privat',wichtig:'Wichtig',geburtstag:'Geburtstag',sonst:'Sonstiges'}[x.cat]);}
  else{meta.push(x.date?(x.deadline?'bis ':'')+relDay(x.date):'ohne Datum');if(x.prio)meta.push('❗ Priorität');if(x.ctx)meta.push({schule:'Schule',zuhause:'Zuhause',telefon:'Telefon',computer:'Computer',besorgung:'Besorgung'}[x.ctx]);meta.push('Größe '+x.size)}
  if(x.repeat!=='none')meta.push('🔁 '+({daily:'täglich',weekdays:'Mo–Fr',weekly:x.interval===2?'alle 2 Wochen':'wöchentlich',monthly:'monatlich',yearly:'jährlich'}[x.repeat]||''));
  if(x.note)meta.push(x.note);
  return '<div class="kiR"><input type="checkbox" class="ck" data-i="'+i+'" checked aria-label="Übernehmen"><button type="button" class="ty" data-t="'+i+'" title="Termin oder Aufgabe">'+(x.kind==='event'?'📅 Termin':'○ Aufgabe')+'</button><span class="tx"><input class="ed" data-e="'+i+'" value="'+esc(x.title)+'" aria-label="Titel"><small>'+esc(meta.filter(Boolean).join(' · '))+'</small></span></div>';
}
function quick(items){
  const box=bot((items.length===1?'Das habe ich verstanden:':'Das sind '+items.length+' Einträge:')+'<div class="card">'+items.map(itemRow).join('')+'</div><small style="color:#8A8A8E">Titel antippen zum Ändern · „Termin/Aufgabe“ zum Umschalten</small>',
    [{l:'Eintragen',f:d=>commit(items,d)},{l:'Verwerfen',g:true,f:()=>bot('Okay, nichts eingetragen.')}]);
  const redraw=()=>{box.querySelector('.card').innerHTML=items.map(itemRow).join('');bind()};
  const bind=()=>{
    box.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{const x=items[+b.dataset.t];const re=parseOne((x.kind==='event'?'Aufgabe: ':'Termin: ')+x.raw);if(re){re.title=x.title;Object.assign(x,re)}if(x.kind==='event'&&!x.date)x.date=today();redraw()});
    box.querySelectorAll('[data-e]').forEach(e=>e.oninput=()=>{items[+e.dataset.e].title=e.value});
    box.querySelectorAll('[data-i]').forEach(c=>c.onchange=()=>{items[+c.dataset.i].skip=!c.checked});
  };bind();
}
async function commit(items,box){
  const use=items.filter(x=>!x.skip&&x.title.trim());
  const ev=use.filter(x=>x.kind==='event'),tk=use.filter(x=>x.kind!=='event');
  let ne=0,nt=0;
  if(ev.length){ne=await from('kalender','addEvents',ev.map(x=>({title:x.title,cat:x.cat,allDay:x.allDay,start:x.date,end:x.date,tStart:x.tStart,tEnd:x.tEnd,repeat:x.repeat,interval:x.interval,loc:x.loc,note:''})))||0}
  if(tk.length){const r=await from('woche','kiAddTasks',tk.map(x=>({text:x.title,date:x.date,ctx:x.ctx,size:x.size,prio:x.prio,repeat:x.repeat==='monthly'||x.repeat==='yearly'?'none':x.repeat})));
    nt=Array.isArray(r)?r.length:(await from('woche','addTasks',tk.map(x=>({text:x.title,date:x.date,ctx:x.ctx,size:x.size})))||0)}
  const parts=[];if(ne)parts.push(plural(ne,'Termin','Termine')+' im Kalender');if(nt)parts.push(plural(nt,'Aufgabe','Aufgaben')+' in der Woche');
  if(!parts.length){bot('Hm, das hat nicht geklappt. Ist der Bereich schon geladen? Versuch es bitte noch einmal.');return}
  try{window.avUpdate&&avUpdate()}catch(_){}
  const big=tk.filter(x=>x.size==='L');
  const acts=[];
  if(ne)acts.push({l:'Kalender öffnen',g:true,f:()=>{close();showTab('kalender')}});
  if(nt)acts.push({l:'Woche öffnen',g:true,f:()=>{close();showTab('woche')}});
  if(big.length)acts.push({l:'„'+big[0].title.slice(0,24)+'“ zerlegen',f:()=>breakdown(big[0].title)});
  bot('Erledigt: '+parts.join(' und ')+'.'+(big.length?' '+(big.length===1?'Eine Aufgabe ist':big.length+' Aufgaben sind')+' groß. Soll ich sie in kleine Schritte zerlegen?':''),acts);
}
/* Zerlegen */
async function breakdown(text){
  const g=await from('woche','gtdList')||{next:[],someday:[]};
  const all=g.next.concat(g.someday);
  text=(text||'').trim();
  if(!text){
    const cand=all.filter(x=>!x.steps).sort((a,b)=>({L:0,M:1,S:2}[a.size||guessSize(a.text)])-({L:0,M:1,S:2}[b.size||guessSize(b.text)])).slice(0,8);
    if(!cand.length){bot('Schreib mir, was du zerlegen möchtest – z. B. „Zerlege Steuererklärung“.');return}
    bot('Welche Aufgabe soll ich zerlegen?',cand.map(x=>({l:x.text.length>34?x.text.slice(0,32)+'…':x.text,g:true,f:()=>showSteps(x.text,x)})));return;
  }
  const low=text.toLowerCase();
  const hit=all.find(x=>x.text.toLowerCase()===low)||all.find(x=>x.text.toLowerCase().includes(low)||low.includes(x.text.toLowerCase()));
  showSteps(text,hit||null);
}
function showSteps(text,task){
  const r=steps(text);let list=r.steps.slice();
  const rows=()=>list.map((s,i)=>'<div class="kiR"><span class="tm">'+(i+1)+'.</span><span class="tx"><input class="ed" data-s="'+i+'" value="'+esc(s)+'" aria-label="Schritt"></span><button type="button" class="rm" data-r="'+i+'" aria-label="Entfernen">×</button></div>').join('');
  const acts=task?[{l:'Bei der Aufgabe speichern',f:async()=>{const ok=await from('woche','setSteps',task.id,list.filter(Boolean).map(t=>({text:t})));await from('woche','setSize',task.id,'L');bot(ok?'Gespeichert: '+plural(list.length,'Schritt','Schritte')+'. Fang einfach mit dem ersten an – nur der zählt jetzt.':'Das hat nicht geklappt.',ok?[{l:'Woche öffnen',g:true,f:()=>{close();showTab('woche')}}]:null)}}]
    :[{l:'Als Aufgabe für heute anlegen',f:async()=>{const r2=await from('woche','kiAddTasks',[{text:cap(text),date:today(),size:'L',ctx:guessCtx(text),steps:list.filter(Boolean)}]);bot(r2&&r2.length?'Angelegt – mit '+plural(list.length,'Schritt','Schritten')+'.':'Das hat nicht geklappt.')}},
      {l:'Ohne Datum anlegen',g:true,f:async()=>{const r2=await from('woche','kiAddTasks',[{text:cap(text),date:null,size:'L',ctx:guessCtx(text),steps:list.filter(Boolean)}]);bot(r2&&r2.length?'Liegt bei „Irgendwann“.':'Das hat nicht geklappt.')}}];
  acts.push({l:'Andere Idee',g:true,once:false,f:d=>{const alt=STEP_DEF.slice();list=alt;d.querySelector('.card').innerHTML=rows();bindS(d)}});
  const d=bot('„'+esc(task?task.text:cap(text))+'“ in kleinen Schritten – zusammen etwa <b>'+durL(r.min)+'</b>'+(r.min>50?', also besser auf zwei Tage verteilen':'')+':<div class="card">'+rows()+'</div><small style="color:#8A8A8E">Schritte antippen zum Ändern, × zum Entfernen.</small>',acts);
  const bindS=d=>{d.querySelectorAll('[data-s]').forEach(e=>e.oninput=()=>{list[+e.dataset.s]=e.value.trim()});
    d.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{list.splice(+b.dataset.r,1);d.querySelector('.card').innerHTML=rows();bindS(d)})};
  bindS(d);
}
/* Tag planen */
async function dayPlan(day){
  const p=await planDay(day);
  if(p.late&&p.isT){bot('Es ist schon spät – heute plane ich nichts mehr. Soll ich morgen planen?',[{l:'Morgen planen',f:()=>dayPlan(addS(today(),1))},{l:'Nein danke',g:true,f:()=>bot('Gute Idee. Feierabend!')}]);return}
  if(!p.tasks.length&&!p.all.length){bot((p.isT?'Heute':'Morgen')+' ist nichts eingetragen – weder Termine noch Aufgaben. Genieß die Luft oder schreib mir, was ansteht.');return}
  let h='';
  if(p.en===null&&p.isT)h+='<small style="color:#8A8A8E">Tipp: Sag mir auf dem Startbildschirm, wie viel Kraft du heute hast – dann plane ich passender.</small>\n';
  else if(p.en)h+='Deine Energie heute: <b>'+({wenig:'wenig',mittel:'mittel',viel:'viel'}[p.en])+'</b>'+(p.budget<Infinity?' – ich plane höchstens '+durL(p.budget)+' Arbeit ein.':'.')+'\n';
  h+='<div class="card">';
  if(p.allDay.length)h+=p.allDay.map(e=>'<div class="kiR ev"><span class="tm">ganzt.</span><span class="tx">'+esc(e.title)+'</span></div>').join('');
  for(const k of p.all){
    if(k.kind==='e')h+='<div class="kiR ev"><span class="tm">'+hm(k.a)+'</span><span class="dot" style="background:#C7C7CC"></span><span class="tx">'+esc(k.e.title)+'<small>Termin bis '+hm(k.z)+'</small></span></div>';
    else h+='<div class="kiR"><span class="tm">'+hm(k.a)+'</span><span class="dot" style="background:'+(k.x.prio?'#D81E1E':k.x.overdue?'#8B5A2B':'#007AFF')+'"></span><span class="tx">'+esc(k.x.text)+'<small>'+durL(k.z-k.a)+(k.big?' · erster Block, Rest später':'')+(k.x.overdue?' · überfällig':'')+(k.x.prio?' · Priorität':'')+'</small></span></div>';
  }
  h+='</div>';
  if(p.rest.length)h+='\nNicht mehr drin: '+p.rest.map(x=>'„'+esc(x.text)+'“').join(', ')+'.';
  const tot=p.blocks.reduce((s,b)=>s+b.z-b.a,0);
  let say=p.blocks.length?'So würde ich '+(p.isT?'heute':'morgen')+' vorgehen – '+durL(tot)+' Aufgaben zwischen deinen Terminen:':'Zwischen deinen Terminen ist kaum Platz für Aufgaben.';
  if(p.rest.length>=3&&p.budget===Infinity)say+=' Ehrlich gesagt: Das ist mehr, als in den Tag passt.';
  const acts=[];
  if(p.blocks.length)acts.push({l:'Reihenfolge übernehmen',f:async()=>{
    for(const b of p.blocks)if(b.x.overdue)await from('woche','moveTask',b.x.id,p.day);
    await from('woche','kiOrder',p.blocks.map(b=>b.x.id));bot('Übernommen. Deine Woche zeigt die Aufgaben jetzt in dieser Reihenfolge. Fang mit „'+esc(p.blocks[0].x.text)+'“ an.',[{l:'Woche öffnen',g:true,f:()=>{close();showTab('woche')}}])}});
  if(p.rest.length)acts.push({l:'Rest auf morgen',g:true,f:async()=>{const t=addS(p.day,1);for(const x of p.rest)await from('woche','moveTask',x.id,t);bot(plural(p.rest.length,'Aufgabe','Aufgaben')+' auf morgen verschoben. Weniger ist heute mehr.')}});
  bot(say+'\n'+h,acts);
}
/* Woche planen */
async function weekPlan(){
  const w=await planWeek();
  const dl=d=>WDN[dow(d)]+(d===today()?' (heute)':'');
  if(!w.moves.length){
    let h='Für die Woche gibt es nichts zu verteilen – alle Wochenaufgaben haben schon einen Tag.\n<div class="card">'+w.days.map(d=>'<div class="kiR"><span class="tm">'+WDK[dow(d)]+'</span><span class="tx">'+((w.ev[d]||[]).length?plural((w.ev[d]||[]).length,'Termin','Termine'):'keine Termine')+' · '+plural(w.dated.filter(x=>x.date===d).length,'Aufgabe','Aufgaben')+'<small>etwa '+durL(Math.round(w.load[d]/15)*15||0)+' verplant</small></span></div>').join('')+'</div>';
    bot(h,[{l:'Wochenplanung öffnen',g:true,f:()=>{close();showTab('woche',{plan:true})}}]);return}
  let h='Ich habe '+plural(w.moves.length,'Aufgabe','Aufgaben')+' auf die Tage verteilt, an denen am meisten Luft ist:';
  h+='<div class="card">';
  for(const d of w.days){const m=w.moves.filter(x=>x.date===d);if(!m.length)continue;
    h+='<div class="kiD">'+dl(d)+' · '+((w.ev[d]||[]).length?plural((w.ev[d]||[]).length,'Termin','Termine'):'frei')+'</div>';
    h+=m.map(x=>'<div class="kiR"><span class="dot" style="background:'+(x.prio?'#D81E1E':x.overdue?'#8B5A2B':'#34C759')+'"></span><span class="tx">'+esc(x.text)+'<small>ca. '+durL(x.est)+(x.prio?' · Priorität, darum früh':'')+(x.overdue?' · war überfällig':'')+(x.ctx==='besorgung'&&dow(d)!==0?'':'')+'</small></span></div>').join('');}
  h+='</div>';
  const heavy=w.days.filter(d=>w.load[d]>480);
  if(heavy.length)h+='\n<b>Achtung:</b> '+heavy.map(d=>WDN[dow(d)]).join(', ')+(heavy.length===1?' ist':' sind')+' schon sehr voll. Streich lieber etwas, als es mitzuschleppen.';
  if(w.someday>15)h+='\n„Irgendwann“ hat '+w.someday+' Einträge. Zeit zum Aussortieren?';
  bot(h,[{l:'So verteilen',f:async()=>{for(const x of w.moves)await from('woche','moveTask',x.id,x.date);bot('Verteilt. Jeder Tag hat jetzt seine Aufgaben.',[{l:'Woche öffnen',g:true,f:()=>{close();showTab('woche')}}])}},
    {l:'Lieber selbst planen',g:true,f:()=>{close();showTab('woche',{plan:true})}}]);
}
/* Fragen */
async function agenda(r){
  const [a,b]=r;const ev=await eventsRange(a,b);const tk=await from('woche','loadByDate',a,b)||{};
  const isT=a===b&&a===today();let br=null;if(isT)br=await from('woche','briefing');
  let h='',nE=0,nT=0;
  for(let d=a;d<=b;d=addS(d,1)){
    const es=(ev[d]||[]).slice().sort((x,y)=>(x.allDay?'0':'1'+x.tStart).localeCompare(y.allDay?'0':'1'+y.tStart));const ts=tk[d]||[];
    if(!es.length&&!ts.length&&a!==b)continue;
    nE+=es.length;nT+=ts.length;
    if(a!==b)h+='<div class="kiD">'+relDayL(d)+'</div>';
    h+=es.map(e=>'<div class="kiR ev"><span class="tm">'+(e.allDay||!e.tStart?'ganzt.':e.tStart)+'</span><span class="tx">'+esc(e.title)+'</span></div>').join('');
    h+=ts.map(t=>'<div class="kiR"><span class="tm">○</span><span class="tx">'+esc(t)+'</span></div>').join('');
  }
  const lab=a===b?relDayL(a):(a===today()?'Bis Sonntag':'Von '+relDay(a)+' bis '+relDay(b));
  if(!nE&&!nT){bot(lab+': nichts eingetragen. Freie Bahn!');return}
  let intro=lab+': '+[nE?plural(nE,'Termin','Termine'):'',nT?plural(nT,'offene Aufgabe','offene Aufgaben'):''].filter(Boolean).join(' und ')+'.';
  if(isT&&br&&br.done)intro+=' '+plural(br.done,'Aufgabe','Aufgaben')+' hast du heute schon erledigt.';
  bot(intro+'<div class="card">'+h+'</div>',[{l:'Plane '+(a===b?'den Tag':'die Woche'),g:true,f:()=>a===b?dayPlan(a):weekPlan()}]);
}
async function overdue(){
  const g=await from('woche','gtdList')||{next:[]};const t=today();
  const o=g.next.filter(x=>x.date&&x.date<t);
  if(!o.length){bot('Nichts überfällig. Sehr gut!');return}
  const long=o.filter(x=>dd(x.since||x.date,t)>=21);
  let h='Überfällig '+(o.length===1?'ist':'sind')+' '+plural(o.length,'Aufgabe','Aufgaben')+':<div class="card">'+o.map(x=>'<div class="kiR"><span class="dot" style="background:#8B5A2B"></span><span class="tx">'+esc(x.text)+'<small>seit '+relDay(x.date)+'</small></span></div>').join('')+'</div>';
  if(long.length)h+='\n<b>'+esc(long[0].text)+'</b> steht seit über 3 Wochen auf deiner Liste. Erledige sie, delegiere sie oder streiche sie.';
  bot(h,[{l:'Alle auf heute',f:async()=>{for(const x of o)await from('woche','moveTask',x.id,t);bot('Alles auf heute geholt.',[{l:'Tag planen',g:true,f:()=>dayPlan(t)}])}},{l:'Auf die Woche verteilen',g:true,f:()=>weekPlan()}]);
}
async function when(q){
  const words=q.toLowerCase().replace(/[?!.,]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));
  if(!words.length){bot('Wonach soll ich suchen? Zum Beispiel: „Wann ist der Elternabend?“');return}
  const t=today();const ev=await eventsRange(addS(t,-1),addS(t,120));
  const hits=[];for(const d of Object.keys(ev).sort())for(const e of ev[d])if(d>=t&&words.some(w=>e.title.toLowerCase().includes(w)))hits.push({d,e});
  const g=await from('woche','gtdList')||{next:[],someday:[]};const th=g.next.concat(g.someday).filter(x=>words.some(w=>x.text.toLowerCase().includes(w)));
  if(!hits.length&&!th.length){bot('Dazu finde ich in den nächsten vier Monaten nichts – weder im Kalender noch in der Woche.');return}
  let h='';
  if(hits.length){const f=hits[0];h+='<b>'+esc(f.e.title)+'</b> ist '+(dd(t,f.d)<=2?relDay(f.d):'am '+relDayL(f.d))+(f.e.tStart&&!f.e.allDay?' um '+f.e.tStart+' Uhr':'')+(dd(t,f.d)>2?' (in '+dd(t,f.d)+' Tagen)':'')+'.';
    if(hits.length>1)h+='<div class="card">'+hits.slice(1,6).map(x=>'<div class="kiR ev"><span class="tm">'+relDay(x.d)+'</span><span class="tx">'+esc(x.e.title)+(x.e.tStart?' · '+x.e.tStart:'')+'</span></div>').join('')+'</div>'}
  if(th.length)h+=(h?'\n':'')+'In deinen Aufgaben: '+th.slice(0,4).map(x=>'„'+esc(x.text)+'“'+(x.date?' ('+relDay(x.date)+')':'')).join(', ')+'.';
  bot(h);
}
async function free(day){
  const ev=((await eventsRange(day,day))[day]||[]).filter(e=>!e.allDay&&e.tStart).sort((a,b)=>a.tStart.localeCompare(b.tStart));
  const isT=day===today();const now=new Date();let c=isT?Math.max(8*60,Math.ceil((now.getHours()*60+now.getMinutes())/15)*15):8*60;const end=21*60;const gaps=[];
  for(const e of ev){const a=toM(e.tStart),z=e.tEnd?toM(e.tEnd):a+60;if(a-c>=30)gaps.push([c,a]);c=Math.max(c,z)}
  if(end-c>=30)gaps.push([c,end]);
  if(!gaps.length){bot(relDayL(day)+' ist zwischen 8 und 21 Uhr durchgehend verplant.');return}
  const big=gaps.slice().sort((x,y)=>(y[1]-y[0])-(x[1]-x[0]))[0];
  bot(relDayL(day)+' hast du Zeit:<div class="card">'+gaps.map(g=>'<div class="kiR"><span class="tm">'+hm(g[0])+'</span><span class="tx">bis '+hm(g[1])+'<small>'+durL(g[1]-g[0])+'</small></span></div>').join('')+'</div>Am meisten Luft: '+hm(big[0])+'–'+hm(big[1])+' Uhr. Gut für etwas Großes.');
}
async function counts(){
  const br=await from('woche','briefing');const g=await from('woche','gtdList')||{next:[],someday:[]};const t=today();
  const ov=g.next.filter(x=>x.date&&x.date<t).length,wk=g.next.length;
  bot('Heute: '+(br?plural(br.open.length,'offene Aufgabe','offene Aufgaben')+', '+br.done+' erledigt':'–')+'.\nDiese Woche: '+plural(wk,'Aufgabe','Aufgaben')+(ov?', davon '+ov+' überfällig':'')+'.\nIrgendwann: '+g.someday.length+'.');
}
async function mails(drafts){
  const r=await from('mail','briefing');
  if(!r||r.loggedIn===false){bot('Du bist im Posteingang noch nicht angemeldet. Melde dich dort einmal an, dann fasse ich zusammen.',[{l:'Posteingang öffnen',g:true,f:()=>{close();showTab('mail')}}]);return}
  const list=[];const seen=new Set();for(const m of (r.vip||[]).concat(r.latest||[]))if(!seen.has(m.msgid)){seen.add(m.msgid);list.push(m)}
  if(!list.length){bot('Keine ungelesenen Mails. Der Posteingang ist ruhig.'+(r.error?'\n<small>('+esc(r.error)+')</small>':''));return}
  const tri=list.map(m=>({m,t:triage(m)}));
  const urgent=tri.filter(x=>x.t[0]==='[!]');
  let h=(urgent.length?'Zuerst das Dringende.':'Nichts Dringendes – gute Nachrichten.')+' '+plural(r.unread||list.length,'ungelesene Mail','ungelesene Mails')+':<div class="card">';
  for(const k of ['[!]','[>]','[~]']){const g=tri.filter(x=>x.t[0]===k);if(!g.length)continue;h+='<div class="kiD" style="color:'+g[0].t[2]+'">'+k+' '+g[0].t[1]+'</div>'+g.map(x=>'<div class="kiR"><span class="tx"><b>'+esc(x.m.from)+'</b> – '+esc(x.m.subject)+(x.m.attach?' 📎':'')+'</span></div>').join('')}
  const ar=tri.filter(x=>x.t[0]==='[x]').length;if(ar)h+='<div class="kiD">[x] Archivieren: '+ar+'</div>';
  h+='</div><small style="color:#8A8A8E">Sortiert nur nach Absender und Betreff – den Inhalt lese ich nicht.</small>';
  const acts=[{l:'Posteingang öffnen',g:true,f:()=>{close();showTab('mail')}}];
  const pick=(urgent[0]||tri.find(x=>x.t[0]==='[>]')||tri[0]).m;
  acts.unshift({l:'Antwort an '+String(pick.from).split(/\s/)[0]+' entwerfen',f:()=>replies(pick,'du')});
  bot(h,acts);
  if(drafts)replies(pick,'du');
}
function copy(t){
  const done=()=>bot('Kopiert. Füge den Text in deine Antwort ein.');
  try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(done,fb);return}}catch(_){}
  fb();function fb(){const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy');done()}catch(_){bot('Kopieren ging nicht – markiere den Text bitte selbst.')}a.remove()}
}
function replies(m,form){
  const ds=draftReplies(m,form);
  bot('Entwürfe für „'+esc(m.subject)+'“ von '+esc(m.from)+':'+ds.map(d=>'<div class="kiD">'+esc(d[0])+'</div><div class="kiPre">'+esc(d[1])+'</div>').join(''),
    ds.map(d=>({l:d[0]+' kopieren',once:false,f:()=>copy(d[1])})).concat([{l:form==='sie'?'Du-Form':'Sie-Form',g:true,f:()=>replies(m,form==='sie'?'du':'sie')},{l:'Mail öffnen',g:true,f:()=>{close();showTab('mail');setTimeout(()=>{try{call('mail','openByMsgId',m.msgid)}catch(_){}},300)}}]));
}
function weather(q){
  const w=weatherNow();
  if(!w||!w.daily){bot('Ich habe gerade keine Wetterdaten. Öffne einmal den Bereich Wetter, dann weiß ich Bescheid.',[{l:'Wetter öffnen',g:true,f:()=>{close();showTab('wetter')}}]);return}
  const d=w.daily,t=/morgen/i.test(q)?addS(today(),1):today(),i=d.time.indexOf(t);
  if(i<0){bot('Für diesen Tag habe ich keine Vorhersage.');return}
  const mx=Math.round(d.temperature_2m_max[i]),mn=Math.round(d.temperature_2m_min[i]),pp=d.precipitation_probability_max?d.precipitation_probability_max[i]:null,code=d.weather_code?d.weather_code[i]:0;
  const desc=code>=95?'Gewitter':code>=71&&code<=77||code>=85&&code<=86?'Schnee':code>=51?'Regen':code>=45&&code<=48?'Nebel':code>=2?'wolkig':'sonnig';
  let tip=[];if(pp!=null&&pp>=40)tip.push('Nimm einen Schirm mit');if(mx<=8)tip.push('zieh eine warme Jacke an');else if(mx<=15)tip.push('eine Jacke schadet nicht');if(mx>=26)tip.push('denk an Wasser und Sonnencreme');
  bot((t===today()?'Heute':'Morgen')+': '+desc+', '+mn+' bis '+mx+' °C'+(pp!=null?', Regenrisiko '+pp+' %':'')+'.'+(tip.length?' '+cap(tip.join(', '))+'.':''));
}

/* ================= Öffentliche Schnittstelle ================= */
window.KI={open,close,parse,parseOne,steps,guessSize,guessCtx,planDay,planWeek,isOpen:()=>!root.hidden,ask:q=>{open();handle(q)}};
})();
