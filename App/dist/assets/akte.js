"use strict";
/* 6.0.3: Live-Aufträge als Akte. Akte.mini() liefert den Miniatur-Deckel für die Liste,
   Akte.open() zeigt die große Akte als Overlay (rechter Rand / → blättert weiter, linker Rand / ← zurück, Esc schließt).
   Nur echte Daten aus Katalog, Besitz und Spiel-Log; fehlende Angaben werden weggelassen, nicht geraten. */
window.Akte=(()=>{
 const EN=window.SCBP_LANG==='en';
 const T=(de,en)=>EN?en:de;
 const e=v=>SCUI.escape(v==null?'':String(v));
 const locale=EN?'en-GB':'de-DE';
 const OWNER='';   // Die Portable Version setzt hier '' ein (tools/build-portable.py)
 const BRAND=T('Blueprint-Archiv','Blueprint Archive')+(OWNER?' · '+OWNER:'');
 let items=[],index=null,overlay=null,keyHandler=null,resizeHandler=null;

 /* ---------- Daten ---------- */
 const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
 function setItems(list){items=Array.isArray(list)?list:[];index=null;}
 function lookup(){
  if(index)return index;
  index={uuid:new Map(),bp:new Map(),name:new Map()};
  for(const i of items){if(i.uuid)index.uuid.set(i.uuid,i);if(i.blueprint)index.bp.set(i.blueprint,i);const n=norm(i.name);index.name.set(n,index.name.has(n)?null:i);}
  return index;
 }
 function resolve(entry){const x=lookup();return (entry.entityClass&&x.uuid.get(entry.entityClass))||(entry.blueprintRecord&&x.bp.get(entry.blueprintRecord))||x.name.get(norm(entry.name))||null;}
 function blueprints(m){
  const pools=(m?.rewardPools||[]).map(p=>({...p,rows:(p.items||[]).map(entry=>({entry,item:resolve(entry)}))}));
  const unique=new Map();
  for(const p of pools)for(const r of p.rows){const k=r.item?.id||norm(r.entry.name);if(!unique.has(k))unique.set(k,r);}
  const rows=[...unique.values()];
  return {pools,total:rows.length,ok:rows.filter(r=>r.item?.isDone).length,open:rows.filter(r=>!r.item?.isDone).map(r=>r.item?.name||r.entry.name||'?'),rows};
 }
 const cleanTitle=t=>String(t||'').replace(/\s*\[BP[^\]]*\]/gi,'').replace(/\s+\d+\s*XP\s*$/i,'').trim()||String(t||'');
 const date=v=>{const d=new Date(v);return isNaN(d)?'':d.toLocaleDateString(locale,{day:'2-digit',month:'2-digit',year:'numeric'});};
 const time=v=>{const d=new Date(v);return isNaN(d)?'':d.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'});};
 const num=v=>Number(v).toLocaleString(locale,{maximumFractionDigits:0});
 function status(row){
  const s=row.status;
  if(s==='Complete')return {text:T('Abgeschlossen','Completed'),cls:'ok',stamp:'green'};
  if(s==='Fail')return {text:T('Fehlgeschlagen','Failed'),cls:'bad',stamp:''};
  if(s==='Abandon')return {text:T('Abgebrochen','Abandoned'),cls:'bad',stamp:''};
  return {text:T('Aktiv','Active'),cls:'run',stamp:'blue'};
 }
 const contractor=m=>m?.contractor||'';
 function description(m){
  const full=window.MissionText?.full?MissionText.full(m):m;
  const tpl=full.descriptionTemplate||full.description||'';
  return tpl.replace(/\[([A-Za-z][A-Za-z0-9_|]*)\]/g,(x,t)=>full.missionContext?.tokens?.[t.toUpperCase()]||x).replace(/\r/g,'');
 }
 /* Beschreibung in Kopfzeile, Einzelheiten (• Schlüssel: Wert), Text, Gruß/Unterschrift und Vertraulichkeitshinweis zerlegen. */
 function parseDescription(text){
  const out={head:'',specs:[],paras:[],greet:'',name:'',role:'',disc:''};
  let blocks=text.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  if(blocks.length&&/^[A-ZÄÖÜ][A-ZÄÖÜ \-]{4,}$/.test(blocks[0].split('\n')[0])&&blocks[0].split('\n').length===1){out.head=blocks.shift();}
  const specLine=/^(?:[•*\-]\s*)?([^:\n]{2,40}):\s*(.*)$/;
  // Einzelheiten: führende Zeilen „Schlüssel: Wert“ des ersten Blocks; was danach im selben Block steht, ist Fließtext
  if(blocks.length){
   const lines=blocks[0].split('\n').map(l=>l.trim()).filter(Boolean);
   let k=0;const specs=[];
   while(k<lines.length&&lines[k].length<120&&specLine.test(lines[k])){const mm=lines[k].match(specLine);if(mm[2])specs.push([mm[1].replace(/^[•*\-]\s*/,''),mm[2]]);k++;}
   if(k>=2){out.specs=specs;const rest=lines.slice(k).join('\n');blocks.shift();if(rest)blocks.unshift(rest);}
  }
  blocks=blocks.filter(b=>!/^-{6,}$/.test(b));
  const di=blocks.findIndex(b=>/^(Diese Mitteilung|This communication)/i.test(b));
  if(di>=0){out.disc=blocks.splice(di,1)[0];}
  const gi=blocks.findIndex(b=>/^(Viel Glück|Good luck|Viel Erfolg|Danke|Thanks|Thank you|Grüße|Regards)[,!.]?$/i.test(b));
  if(gi>=0){out.greet=blocks[gi];const sig=(blocks[gi+1]||'').split('\n').map(s=>s.trim()).filter(Boolean);
   if(sig.length&&sig.length<=4){out.name=sig[0];out.role=sig.slice(1).join(' · ');blocks.splice(gi,2);}else blocks.splice(gi,1);}
  out.paras=blocks.map(b=>b.replace(/\n+/g,' '));
  return out;
 }

 /* ---------- Miniatur ---------- */
 function mini(row,m,n){
  // 6.0.5: Die Liste liefert den Bauplan-Stand fertig (m.bp); die vollständigen Pools kommen erst mit der großen Akte
  const st=status(row),bp=m?.bp||blueprints(m),org=contractor(m);
  const has=bp.total>0,voll=has&&bp.ok===bp.total;
  const title=m?cleanTitle(m.title||m.debugName):(row.debug||row.guid);
  return `<button type="button" class="akte-mini akte-manila" data-akte-open="${e(row.guid)}" aria-label="${e(T('Akte öffnen: ','Open file: ')+title)}">
   <span class="am-hole" style="top:17%"></span><span class="am-hole" style="top:74%"></span>
   <span class="am-in">
    <span class="am-state ${st.cls}">${e(st.text)}</span>
    <span class="am-ghost">${e(BRAND)}</span>
    <span class="am-dept">${e(T('Auftragsabteilung','Contracts Division'))}</span>
    <span class="am-org">${e(org||T('Auftrag','Contract'))}</span>
    <span class="am-row"><i>${e(T('Betreff:','Subject:'))}</i><b>${e(title)}</b></span>
    <span class="am-row"><i>${e(T('Baupläne:','Blueprints:'))}</i><b class="${has?(voll?'voll':'offen'):''}">${has?e(`${bp.ok} / ${bp.total} ${T('erhalten','collected')}`):e(T('keine','none'))}</b></span>
    <span class="am-stamp ${has?(voll?'voll':'offen'):'leer'}">${e(has?(voll?T('ALLE ERHALTEN','ALL COLLECTED'):`${bp.total-bp.ok} ${T('OFFEN','OPEN')}`):T('OHNE BAUPLAN','NO BLUEPRINT'))}</span>
    <span class="am-foot"><i>${e(date(row.start))} · ${e(time(row.start))}</i><b>${e(T('Heft ','No. '))}${e(n)}</b></span>
   </span></button>`;
 }

 /* ---------- Große Akte ---------- */
 const holes='<i class="hole" style="top:150px"></i><i class="hole" style="top:700px"></i>';
 const foot=n=>`<div class="pfoot"><span>${e(T('Seite ','Page '))}${n}</span><span>${e(BRAND)}</span></div>`;
 const head=org=>`<div class="head">${e(T('Auftragsabteilung','Contracts Division'))}${org?' · '+e(org):''}</div>`;
 function page1(row,m){
  const st=status(row),org=contractor(m),rows=[];
  rows.push([T('Auftrag:','Contract:'),cleanTitle(m.title||m.debugName),'lang']);
  const region=(m.systems||[]).filter(Boolean).join(', ')||(m.prerequisites||[]).filter(p=>/system/i.test(p)).join(', ');
  if(region)rows.push([T('Region / System:','Region / system:'),region]);
  const kind=m.missionType||({story:T('Story-Auftrag','Story'),career:T('Karriere','Career'),event:T('Event','Event'),service:T('Dienstleistung','Service')})[m.category]||m.category;
  if(kind)rows.push([T('Auftragsart:','Contract type:'),kind]);
  rows.push([T('Status:','Status:'),`${st.text} · ${m.illegal?T('Illegal','Illegal'):T('Legal','Legal')}`,st.cls==='ok'?'green':'red']);
  if(m.minStanding)rows.push([T('Mindestrang:','Minimum rank:'),m.minStanding]);
  if(Number(m.timeToCompleteMinutes)>0)rows.push([T('Zeitlimit:','Time limit:'),`${num(m.timeToCompleteMinutes)} Min`]);
  if(Number(m.rewardUEC)>0)rows.push([T('Auftragsprämie:','Reward:'),`${num(m.rewardUEC)} aUEC`,'prem']);
  const rep=(m.reputationRewards||[]).filter(r=>Number(r.amount)>0).map(r=>`${num(r.amount)} XP${r.faction&&r.faction!==org?' · '+r.faction:''}`).join(', ');
  if(rep)rows.push([T('Rufpunkte:','Reputation:'),rep]);
  return `<div class="page lf rows-${rows.length}">${holes}
   <div class="dept">${e(T('Auftragsabteilung','Contracts Division'))}</div><div class="org">${e(org||T('Auftrag','Contract'))}</div><div class="orn"></div>
   <div class="title"><b>${e(T('Auftrag im Überblick','Contract overview'))}</b></div>
   ${rows.map(([l,v,c])=>`<div class="row"><span class="l">${e(l)}</span><span class="v${c?' '+c:''}">${e(v)}</span></div>`).join('')}
   ${foot(1)}<div class="stamp ${st.stamp}">${e(st.text.toUpperCase())}<small>· ${e(m.illegal?T('ILLEGAL','ILLEGAL'):T('LEGAL','LEGAL'))} ·</small></div></div>`;
 }
 function page2(m){
  const d=parseDescription(description(m)),org=contractor(m);
  const size=d.paras.join(' ').length+d.specs.length*40;
  const body=d.paras.length||d.specs.length?`
   ${d.head?`<div class="ez">${e(d.head)}</div>`:''}
   ${d.specs.map(([k,v])=>`<div class="brow"><span class="l">• ${e(k)}:</span><span class="v">${e(v)}</span></div>`).join('')}
   ${d.specs.length?'<div class="sep"></div>':''}
   ${d.paras.map(p=>`<p class="txt">${e(p)}</p>`).join('')}
   ${d.greet||d.disc?`<div class="closing">${d.greet?`<div class="sig"><span class="gl">${e(d.greet)}</span>${d.name?`<span class="nm">${e(d.name)}</span>`:''}${d.role?`<span class="fn">${e(d.role)}</span>`:''}</div>`:''}
   ${d.disc?`<p class="disc">${e(d.disc)}</p>`:''}</div>`:''}`:`<p class="empty">${e(T('Für diesen Auftrag liegt keine Beschreibung vor.','No description is available for this contract.'))}</p>`;
  return `<div class="page lf p2${size>1100?' long':''}">${holes}${head(org)}<div class="title"><b>${e(T('Auftragsbeschreibung','Contract description'))}</b></div>${body}${foot(2)}</div>`;
 }
 function page3(m){
  const bp=blueprints(m),org=contractor(m);
  const count=bp.pools.reduce((a,p)=>a+p.rows.length,0);
  const it=count>11?Math.max(30,Math.floor((640-bp.pools.length*70)/count)):52;
  const pools=bp.pools.map(p=>{
   const ok=p.rows.filter(r=>r.item?.isDone).length,size=Number(p.size)||p.rows.length,draw=Math.max(1,Number(p.drawCount)||1);
   const chance=Number(p.chancePercent);
   return `<div class="pool"><div class="ph"><span class="pn">${e(p.name||p.id||T('Bauplan-Pool','Blueprint pool'))}</span><span class="pc">${Number.isFinite(chance)?e(chance.toLocaleString(locale,{maximumFractionDigits:1}))+' % '+e(T('Chance','chance'))+' · ':''}${draw} ${e(T('von','of'))} ${size}</span></div>
    <div class="ps">${ok} / ${size} ${e(T('bereits erhalten','already collected'))}${ok===size&&size?`<span class="full">${e(T('vollständig','complete'))}</span>`:''}</div>
    ${p.rows.map(({entry,item})=>{const done=!!item?.isDone,src=done?({manual:T('Manuell','Manual'),log:T('Spiel-Log','Game log')})[item.ownershipSource]||T('Synchronisiert','Synced'):'';
     return `<div class="it${done?' ok':''}${item?'':' unk'}"><i>${done?'✓':''}</i><span class="nm" title="${e(item?.name||entry.name)}">${e(item?.name||entry.name||'?')}</span><span class="src">${e(src)}</span><span class="st">${e(done?T('erhalten','collected'):item?T('offen','open'):T('unbekannt','unknown'))}</span></div>`;}).join('')}</div>`;}).join('');
  return `<div class="page lf p3" style="--it:${it}px;--itf:${Math.min(22,Math.max(16,it*.45))}px">${holes}${head(org)}<div class="title"><b>${e(T('Bauplan-Belohnungen','Blueprint rewards'))}</b></div>
   ${pools||`<p class="empty">${e(T('SCMDB nennt für diesen Auftrag keine Bauplan-Belohnungen.','SCMDB lists no blueprint rewards for this contract.'))}</p>`}${foot(3)}</div>`;
 }
 /* Seite 4: was das Spiel-Log hergibt – Zeiten, Status, Einsatzort, in diesem Zeitraum erhaltene Baupläne, weitere Einträge derselben Sitzung. */
 function page4(row,m,all){
  const st=status(row),org=contractor(m),start=new Date(row.start),end=row.end?new Date(row.end):null;
  const mins=end&&!isNaN(end)&&!isNaN(start)?Math.max(0,Math.round((end-start)/60000)):null;
  const inst=m.logInstance||{},place=inst.location||inst.target||'';
  const from=start.getTime()-5000,to=(end?end.getTime():Date.now())+30000;
  const got=blueprints(m).rows.filter(r=>r.item?.isDone&&r.item.acquiredAt&&(t=>t>=from&&t<=to)(new Date(r.item.acquiredAt).getTime()));
  const session=(all||[]).filter(r=>r.guid!==row.guid&&Math.abs(new Date(r.start)-start)<6*3600e3).sort((a,b)=>String(a.start).localeCompare(String(b.start))).slice(-9);
  const limit=Number(m.timeToCompleteMinutes)||0;
  return `<div class="page lf p4">${holes}${head(org)}<div class="title"><b>${e(T('Sitzungsbericht','Session report'))} ${e(date(row.start))}</b></div>
   <div class="sh">${e(T('Einsatzort laut Spiel-Log','Location from the game log'))}</div>
   <div class="loc">${e(place||T('nicht im Log vermerkt','not recorded in the log'))}</div>
   ${(m.systems||[]).length||(m.prerequisites||[]).length?`<div class="sm">${e(T('Katalog: ','Catalog: '))}${e([...(m.systems||[]),...(m.prerequisites||[])].join(' · '))}</div>`:''}
   <div class="sh">${e(T('Auftragsverlauf','Contract timeline'))}</div>
   <div class="ms">
    <div class="ln"><span>✓ ${e(T('Auftrag angenommen','Contract accepted'))}</span><em>${e(time(row.start))}</em></div>
    ${end?`<div class="ln ${st.cls==='ok'?'green':'red'}"><span>${st.cls==='ok'?'✓':'✗'} ${e(st.text)}</span><em>${e(time(row.end))}</em></div>`:`<div class="ln"><span>○ ${e(T('läuft noch','still running'))}</span><em>${e(T('seit ','since '))}${e(time(row.start))}</em></div>`}
    ${mins!=null?`<div class="sm">${e(T('Dauer ','Duration '))}${mins} Min${limit?` · ${e(T('Zeitlimit ','time limit '))}${limit} Min`:''}</div>`:''}
   </div>
   <div class="sh">${e(T('In diesem Zeitraum erhalten','Collected during this contract'))}</div>
   ${got.length?got.map(r=>`<div class="ln green"><span>✓ ${e(r.item.name||r.entry.name)}</span><em>${e(time(r.item.acquiredAt))}</em></div>`).join(''):`<div class="sm">${e(T('Kein neuer Bauplan aus diesem Auftrag im Log.','No new blueprint from this contract in the log.'))}</div>`}
   <div class="sh">${e(T('Weitere Einträge dieser Sitzung','Other entries in this session'))}</div>
   ${session.length?session.map(r=>{const s=status(r);return `<div class="ln${s.cls==='bad'?' red':''}"><span>${e(cleanTitle(r.mission?.title||r.debug||r.guid))} · ${e(s.text)}</span><em>${e(time(r.start))}</em></div>`;}).join(''):`<div class="sm">${e(T('Keine weiteren offenen Einträge in dieser Sitzung.','No other open entries in this session.'))}</div>`}
   ${foot(4)}</div>`;
 }
 function cover(row,m,n){
  const bp=blueprints(m),org=contractor(m),has=bp.total>0,voll=has&&bp.ok===bp.total;
  const open=bp.open.slice(0,4).join(' · ')+(bp.open.length>4?' …':'');
  return `<div class="cover">
   <div class="face front akte-manila grain">
    <i class="hole" style="top:160px"></i><i class="thread" style="top:190px"></i><i class="hole" style="top:700px"></i><i class="thread" style="top:730px"></i>
    <div class="k">K</div><div class="ghost">${e(BRAND)}</div>
    <div class="dept">${e(T('Auftragsabteilung','Contracts Division'))}</div><div class="org">${e(org||T('Auftrag','Contract'))}</div><div class="orn" style="margin-left:120px"></div>
    <div class="f-row"><span class="l">${e(T('Rubrik:','Section:'))}</span><span class="v">${e(T('Aufträge','Contracts'))}</span></div>
    <div class="f-row"><span class="l">${e(T('Betreff:','Subject:'))}</span><span class="v lang">${e(cleanTitle(m.title||m.debugName))}</span></div>
    <div class="f-row"><span class="l">${e(T('Baupläne:','Blueprints:'))}</span><span class="v ${has?(voll?'voll':'offen'):''}">${has?e(`${bp.ok} / ${bp.total} ${T('erhalten','collected')}`):e(T('keine','none'))}</span></div>
    <div class="bpstamp ${has?(voll?'voll':'offen'):'leer'}">${e(has?(voll?T('ALLE ERHALTEN','ALL COLLECTED'):T('NICHT VOLLSTÄNDIG','INCOMPLETE')):T('OHNE BAUPLAN','NO BLUEPRINT'))}<small>${e(has?(voll?`${bp.total} ${T('von','of')} ${bp.total} ${T('Bauplänen','blueprints')}`:`${bp.open.length} ${T('offen','open')}: ${open}`):T('Dieser Auftrag vergibt keine Baupläne.','This contract awards no blueprints.'))}</small></div>
    <div class="hint">${e(T('rechten Rand klicken: Akte öffnen ›','click the right edge: open file ›'))}</div>
    <div class="f-foot"><span class="heft">${e(T('Heft:','No.:'))} <b>${e(n)}</b></span><span class="jahr">${e(T('Jahr','Year'))} <b>2956</b></span></div>
   </div>
   <div class="face inside grain"><div class="slip"><div class="h3">${e(T('Laufzettel','Routing slip'))}</div>
    <table><tr><th>${e(T('Eingang','Received'))}</th><th>${e(T('Bearbeiter','Handled by'))}</th><th>${e(T('Ablage','Filed'))}</th></tr>
     <tr><td class="h">${e(date(row.start))}</td><td class="h">${e(OWNER||T('Archiv','Archive'))}</td><td class="h">${e(T('Heft ','No. '))}${e(n)}</td></tr></table>
    <p>${e(m.minStanding?T(`Mindestrang ${m.minStanding} prüfen, bevor der Auftrag angenommen wird.`,`Check the minimum rank ${m.minStanding} before accepting the contract.`):T('Bitte Seite 1 lesen, bevor der Auftrag angenommen wird.','Please read page 1 before accepting the contract.'))}</p></div>
    <div class="pocket">${e(T('EINSTECKTASCHE · ANLAGEN','POCKET · ENCLOSURES'))}</div></div>
  </div>`;
 }
 /* Seite 5 (6.0.3): Ausgaben und Reiseverlauf aus dem Spiel-Log, Zeitraum eine Stunde vor der Annahme bis zum Auftragsende. */
 const MAKERS={behr:'Behring',crlf:'CureLife',grin:'Greycat',ksar:'Ksar',klwe:'Klaus & Werner',gats:'Gallenson',hrst:'Hurston',kast:'Kastak Arms',apar:'Apocalypse Arms',lbco:'Lightning Bolt',volt:'VOLT',sasu:'ASD',cds:'CDS',clda:'Clark Defense',rsi:'RSI',drak:'Drake',orig:'Origin',misc:'MISC',anvl:'Anvil',aegs:'Aegis',crus:'Crusader',tmbl:'Tumbril',argo:'Argo'};
 const WORDS={mag:T('Magazin','magazine'),rifle:T('Gewehr','rifle'),sniper:T('Scharfschützen','sniper'),smg:'SMG',pistol:T('Pistole','pistol'),shotgun:T('Schrotflinte','shotgun'),lmg:'LMG',ballistic:'',energy:T('Energie','energy'),laser:'Laser',medgun:'MedGun',vial:T('Ampulle','vial'),multitool:'Multitool',mining:T('Bergbau','mining'),bottle:'',drink:T('Getränk','drink'),grenade:T('Granate','grenade'),frag:T('Splitter','frag'),food:T('Essen','food'),lux:'',small:'',medium:'',large:''};
 const cap=w=>w?w[0].toUpperCase()+w.slice(1):w;
 function prettyItem(raw){
  if(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(raw||''))return T('Ware','Commodity');
  const parts=String(raw||'').split('_').filter(x=>x&&!/^\d+$/.test(x)&&!/^[a-z]$/i.test(x));
  if(!parts.length)return raw||'?';
  const out=[];const maker=MAKERS[parts[0].toLowerCase()];if(maker){out.push(maker);parts.shift();}
  for(const x of parts){const w=WORDS[x.toLowerCase()];if(w===undefined)out.push(cap(x));else if(w)out.push(w);}
  return [...new Set(out)].join(' ')||raw;
 }
 function category(raw){const r=String(raw||'').toLowerCase();
  if(/^[0-9a-f]{8}-/.test(r))return T('Waren','Commodities');
  if(/(^|_)mag($|_)/.test(r))return T('Magazine','Magazines');
  if(/grenade/.test(r))return T('Granaten','Grenades');
  if(/med|vial|pen/.test(r))return T('Medizin','Medical');
  if(/drink|food|bottle|can_|bar_/.test(r))return T('Verpflegung','Food & drink');
  if(/tool|mining|tractor|salvage/.test(r))return T('Werkzeug','Tools');
  if(/rifle|pistol|smg|sniper|shotgun|lmg/.test(r))return T('Waffen','Weapons');
  if(/armor|helmet|undersuit|backpack/.test(r))return T('Ausrüstung','Armour');
  return T('Sonstiges','Other');
 }
 const SHOPS={casaba:'Casaba Outlet',tammanyandsons:'Tammany and Sons',conscientiousobjects:'Conscientious Objects',centermass:'Centermass',commex:'CommEx',cargo:'Cargo',reststop:T('Raststation','Rest stop'),pharmacy:T('Apotheke','Pharmacy'),blackmarket:T('Schwarzmarkt','Black market'),office:T('Büro','Office'),transfers:'Transfers'};
 function prettyShop(raw){
  const parts=String(raw||'').replace(/^SC?Shop_/i,'').replace(/-\d+$/,'').split('_').filter(Boolean);
  const out=[];
  for(const x of parts){const k=x.toLowerCase();if(SHOPS[k]){out.push(SHOPS[k]);continue;}if(x.length<=2||/^[a-z]+$/.test(x))continue;out.push(x.replace(/([a-z])([A-Z])/g,'$1 $2'));}
  return [...new Set(out)].join(' · ')||raw||'?';
 }
 const kilo=v=>v>=1000?(v/1000).toLocaleString(locale,{maximumFractionDigits:v>=10000?0:1})+'k':num(v);
 function travelLabel(x){
  switch(x.kind){
   case 'jurisdiction':return {t:T('Rechtsgebiet: ','Jurisdiction: ')+(x.place||'?'),red:/unregiert|unclaimed|ungeregelt/i.test(x.place||'')};
   case 'armistice-in':return {t:T('Waffenstillstandszone betreten','Entered armistice zone')};
   case 'armistice-out':return {t:T('Waffenstillstandszone verlassen','Left armistice zone')};
   case 'private-in':return {t:T('Privatgelände betreten','Entered private property')};
   case 'private-out':return {t:T('Privatgelände verlassen','Left private property')};
   case 'controlled-in':return {t:T('Kontrollierten Raum betreten','Entered controlled space')};
   case 'controlled-out':return {t:T('Kontrollierten Raum verlassen','Left controlled space'),red:true};
   case 'hangar':return {t:T('Hangaranfrage genehmigt','Hangar request approved')};
   case 'ship':return {t:T('Schiff: ','Ship: ')+(x.ship||'?')};
   case 'quantum':return {t:T('Quantum-Sprung angekommen','Quantum jump arrived'),q:true};
   default:return null;
  }
 }
 function page5(m,data,row){
  const org=contractor(m),top=`${holes}${head(org)}<div class="title"><b>${e(T('Ausgaben und Reiseverlauf','Spending and travel log'))}</b></div>`;
  if(!data)return `<div class="page p5">${top}<p class="empty">${e(T('Spiel-Log wird gelesen …','Reading the game log …'))}</p>${foot(5)}</div>`;
  if(data.error)return `<div class="page p5">${top}<p class="empty">${e(data.error)}</p>${foot(5)}</div>`;
  const list=data.entries||[];
  const buys=list.filter(x=>x.kind==='buy'&&x.status!=='failed'),sells=list.filter(x=>x.kind==='sell'&&x.status!=='failed');
  let html=top+`<div class="sm">${e(T('Zeitraum ','Period '))}${e(date(data.from))} · ${e(time(data.from))}–${e(time(data.to))} ${e(T('(eine Stunde vor der Annahme bis zum Ende)','(one hour before accepting until the end)'))}</div>`;
  html+=`<div class="sh">${e(T('Ausgabenbuch','Spending ledger'))}</div>`;
  if(buys.length||sells.length){
   const shown=buys.slice(-7),sum=buys.reduce((a,x)=>a+(Number(x.price)||0),0),shops=[...new Set(buys.map(x=>prettyShop(x.shop)))];
   html+=`<table class="tb"><tr><th>${e(T('Zeit','Time'))}</th><th>${e(T('Gegenstand','Item'))}</th><th class="n">${e(T('Menge','Qty'))}</th><th class="n">aUEC</th></tr>`+
    (buys.length>shown.length?`<tr><td></td><td class="q">… ${buys.length-shown.length} ${e(T('frühere Käufe','earlier purchases'))}</td><td></td><td></td></tr>`:'')+
    shown.map(x=>`<tr><td>${e(time(x.ts))}</td><td title="${e(prettyShop(x.shop))}">${e(prettyItem(x.item))}${x.status==='pending'?' <span class="q">*</span>':''}</td><td class="n">${num(x.quantity)}</td><td class="n">${num(x.price)}</td></tr>`).join('')+
    (buys.length?`<tr class="sum"><td></td><td>${e(T('Summe','Total'))}${shops.length===1?' · '+e(shops[0]):''}</td><td></td><td class="n">${num(sum)}</td></tr>`:'')+
    (sells.length?`<tr><td></td><td class="plus">${e(T('Warenverkäufe','Commodity sales'))} (${sells.length}) <span class="q">*</span></td><td></td><td class="n plus">+${num(sells.reduce((a,x)=>a+(Number(x.price)||0),0))}</td></tr>`:'')+
    `</table>`;
   if(buys.some(x=>x.status==='pending')||sells.length)html+=`<div class="sm">* ${e(T('nur die Anfrage steht im Log, die Bestätigung des Ladens fehlt','only the request is in the log; the shop did not confirm it'))}</div>`;
   const cats=new Map();for(const x of buys)cats.set(category(x.item),(cats.get(category(x.item))||0)+(Number(x.price)||0));
   const rows=[...cats.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5),max=Math.max(1,...rows.map(r=>r[1]));
   if(rows.length){
    html+=`<div class="sh">${e(T('Ausgaben nach Posten','Spending by category'))}</div>`+rows.map(([k,v])=>`<div class="bar"><span>${e(k)}</span><i style="width:${Math.max(1,v/max*100).toFixed(1)}%"></i><em>${e(kilo(v))}</em></div>`).join('');
    if(sum>0&&rows[0][1]/sum>=.5)html+=`<div class="sm">${Math.round(rows[0][1]/sum*100)} % ${e(T('der Ausgaben gingen in','of the spending went to'))} ${e(rows[0][0])}.</div>`;
   }
  }else html+=`<div class="sm">${e(T('Keine Ladenkäufe in diesem Zeitraum.','No shop purchases in this period.'))}</div>`;
  // Reiseverlauf: Meldungen in Zeitfolge, gleiche aufeinanderfolgende Meldungen zusammengefasst, Annahme und Ende des Auftrags eingereiht
  // Kurzes Hin und Her (z. B. Privatgelände betreten/verlassen innerhalb von 3 Minuten) fällt weg
  const PAIR={'private-in':'private-out','private-out':'private-in','armistice-in':'armistice-out','armistice-out':'armistice-in','controlled-in':'controlled-out','controlled-out':'controlled-in'};
  const drop=new Set();
  list.forEach((x,i)=>{if(drop.has(i)||!PAIR[x.kind])return;for(let j=i+1;j<list.length;j++){const y=list[j];if(new Date(y.ts)-new Date(x.ts)>180e3)break;if(!drop.has(j)&&y.kind===PAIR[x.kind]){drop.add(i);drop.add(j);break;}}});
  const trip=[];
  list.forEach((x,i)=>{if(drop.has(i))return;const l=travelLabel(x);if(!l)return;const last=trip[trip.length-1];if(last&&last.t===l.t)return;trip.push({...l,ts:x.ts});});
  const travel=trip.length;
  if(row){trip.push({t:T('Auftrag angenommen','Contract accepted'),m:true,ts:row.start});if(row.end)trip.push({t:status(row).text,m:true,ts:row.end});trip.sort((a,b)=>String(a.ts).localeCompare(String(b.ts)));}
  // Platz auf der Seite: mit Ausgabenbuch und Balken bleiben etwa 9 Zeilen, sonst 21
  const room=buys.length?Math.max(4,9-Math.max(0,Math.min(buys.length,7)-4)):sells.length?15:21;
  const tail=trip.slice(-room);
  html+=`<div class="sh">${e(T('Reiseverlauf','Travel log'))}</div>`;
  html+=travel?`<div class="trip">${trip.length>tail.length?`<div><em>…</em><b>${trip.length-tail.length} ${e(T('frühere Meldungen','earlier entries'))}</b></div>`:''}${tail.map(x=>`<div class="${x.q?'q':''}${x.m?'m':''}${x.red?' red':''}"><em>${e(time(x.ts))}</em><b>${e(x.t)}</b></div>`).join('')}</div>`
   :`<div class="sm">${e(T('Keine Reise-Meldungen in diesem Zeitraum. Erfasst werden sie ab Version 6.0.3 mit dem aktualisierten Windows-Helfer.','No travel entries in this period. They are recorded from version 6.0.3 with the updated Windows helper.'))}</div>`;
  return `<div class="page p5">${html}${foot(5)}</div>`;
 }
 async function loadJournal(stage,row,m){
  const from=new Date(new Date(row.start).getTime()-3600e3).toISOString(),to=new Date((row.end?new Date(row.end).getTime():Date.now())+300e3).toISOString();
  let data;
  try{data=await SCUI.api('/api/journal?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to));}
  catch(err){data={error:T('Spiel-Log nicht erreichbar: ','Game log unavailable: ')+err.message};}
  const old=stage.querySelector('.back > .p5');if(old)old.outerHTML=page5(m,data,row);
  // Seite 4: Einsatzort aus dem letzten Rechtsgebiet während des Auftrags, wenn das Log keinen Ort nennt
  const end=row.end||new Date().toISOString();
  const last=(data.entries||[]).filter(x=>x.kind==='jurisdiction'&&x.ts<=end).pop();
  if(last&&!(m.logInstance?.location||m.logInstance?.target))stage.querySelectorAll('.p4 .loc').forEach(el=>{el.textContent=T('Rechtsgebiet ','Jurisdiction ')+last.place;el.insertAdjacentHTML('afterend',`<div class="sm">${e(T('zuletzt gemeldet um ','last reported at '))}${e(time(last.ts))}</div>`);});
 }

 function close(){
  if(!overlay)return;
  overlay.remove();overlay=null;document.body.classList.remove('akte-lock');
  document.removeEventListener('keydown',keyHandler,true);window.removeEventListener('resize',resizeHandler);
  const back=document.querySelector(`[data-akte-open="${CSS.escape(lastGuid)}"]`);back?.focus();
 }
 let lastGuid='';
 /* opts.obs (6.0.7): Darstellung für die OBS-Quelle /obs-akte.html – ohne Knöpfe, Ränder und Tastatur, durchsichtiger Hintergrund;
    geblättert wird über den zurückgegebenen Regler (set). Im Dashboard meldet die Akte jede aufgeschlagene Seite an die Quelle,
    solange „OBS-Ausblenden“ angezeigt wird. */
 function open(row,m,n,all,onDetails,opts={}){
  if(!m)return null;close();lastGuid=row.guid;
  const obsMode=!!opts.obs;
  const leaves=[page1(row,m),page2(m),page3(m),page4(row,m,all)];
  overlay=document.createElement('div');overlay.className='akte-overlay'+(obsMode?' akte-obsmode':'');
  if(!obsMode){overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');}
  overlay.setAttribute('aria-label',T('Akte: ','File: ')+cleanTitle(m.title||m.debugName));
  overlay.innerHTML=`${obsMode?'':`<div class="akte-bar">${onDetails?`<button type="button" class="quiet-button" data-akte-details>${e(T('Auftragsdetails','Contract details'))}</button>`:''}<button type="button" class="quiet-button" data-akte-close>${e(T('Schließen ×','Close ×'))}</button></div>`}
   <div class="akte-fit"><div class="akte-stage"><div class="book"><div class="blue"></div>
    <div class="back akte-manila grain"><div class="stack"></div>${page5(m,null)}
     ${leaves.map((html,i)=>({html,n:i+1})).reverse().map(({html,n})=>`<div class="leaf" data-n="${n}" style="--z:${leaves.length-n+1}px;--a:${-177+2*n}deg">${html}<div class="page lb"></div></div>`).join('')}
    </div>${cover(row,m,n)}</div>
    ${obsMode?'':`<button type="button" class="quiet-button akte-obs" data-akte-obs hidden></button>
    <div class="edge l" role="button" tabindex="0" aria-label="${e(T('Zurückblättern / Akte schließen','Page back / close file'))}">‹</div>
    <div class="edge r" role="button" tabindex="0" aria-label="${e(T('Weiterblättern / Akte öffnen','Page forward / open file'))}">›</div>
    <div class="replay">${e(T('‹ linker Rand: zurückblättern · schließen  |  rechter Rand: weiterblättern · öffnen ›  (auch mit den Pfeiltasten, Esc schließt)','‹ left edge: page back · close  |  right edge: page forward · open ›  (arrow keys work too, Esc closes)'))}</div>`}
   </div></div>`;
  document.body.append(overlay);if(!obsMode)document.body.classList.add('akte-lock');
  void loadJournal(overlay.querySelector('.akte-stage'),row,m);
  const stage=overlay.querySelector('.akte-stage'),fit=overlay.querySelector('.akte-fit');
  const leafs=[...stage.querySelectorAll('.leaf')];
  // Rückseite jedes Blatts identisch bedrucken (wie in der Vorlage)
  leafs.forEach(l=>{const f=l.querySelector('.lf'),b=l.querySelector('.lb');b.innerHTML=f.innerHTML;b.className='page lb '+f.className.replace(/\bpage\b|\blf\b/g,'').trim();b.setAttribute('style',f.getAttribute('style')||'');b.setAttribute('aria-hidden','true');});
  const MAX=leafs.length+1;let state=0;
  const L=stage.querySelector('.edge.l'),R=stage.querySelector('.edge.r');
  const obsButton=overlay.querySelector('[data-akte-obs]');
  let obsOn=false,sent=-1;
  const sendState=()=>{if(!obsOn||obsMode||sent===state)return;sent=state;SCUI.api('/api/obs/akte',{guid:row.guid,state}).catch(()=>{sent=-1;});};
  const show=()=>{stage.classList.toggle('open',state>0);if(obsButton)obsButton.hidden=state<=0;leafs.forEach(l=>l.classList.toggle('flipped',state>=+l.dataset.n+1));R?.classList.toggle('off',state>=MAX);L?.classList.toggle('off',state<=0);sendState();};
  const nudge=c=>{stage.classList.remove('nudge-l','nudge-r');void stage.offsetWidth;stage.classList.add(c);};
  const vor=()=>{if(state<MAX){state++;show();}else nudge('nudge-r');};
  const zurueck=()=>{if(state>0){state--;show();}else nudge('nudge-l');};
  resizeHandler=()=>{const pad=obsMode?0:16;const s=Math.min(obsMode?4:1,(fit.clientWidth-pad)/1400,(fit.clientHeight-(obsMode?0:8))/1060);stage.style.setProperty('--akte-scale',String(Math.max(.2,s)));};
  window.addEventListener('resize',resizeHandler);resizeHandler();
  if(obsMode){
   stage.style.animation='none';
   state=Math.max(0,Math.min(MAX,opts.state|0));
   if(opts.instant)stage.querySelectorAll('.book,.cover,.blue,.leaf').forEach(x=>{x.style.transition='none';});
   show();
   if(opts.instant)requestAnimationFrame(()=>requestAnimationFrame(()=>stage.querySelectorAll('.book,.cover,.blue,.leaf').forEach(x=>{x.style.transition='';})));
   return {set(s){s=Math.max(0,Math.min(MAX,s|0));if(s!==state){state=s;show();}},close};
  }
  R.onclick=vor;L.onclick=zurueck;
  [L,R].forEach(x=>{x.addEventListener('pointerup',()=>x.blur());x.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();x.click();}});});
  overlay.querySelector('[data-akte-close]').onclick=close;
  // 6.0.7: „OBS-Einblenden“ zeigt diese Akte in der eigenen OBS-Quelle (/obs-akte.html), bis „OBS-Ausblenden“ gedrückt wird.
  // Kein Abfragen im Hintergrund: der Stand wird nur beim Öffnen einmal geholt; danach meldet jedes Blättern die Seite.
  const obsLabel=()=>{obsButton.textContent=obsOn?T('OBS-Ausblenden','Hide in OBS'):T('OBS-Einblenden','Show in OBS');obsButton.classList.toggle('is-on',obsOn);};
  obsLabel();
  const session=()=>(all||[]).slice(0,40).map(r=>({guid:r.guid,start:r.start,status:r.status,mission:{title:r.mission?.title||r.debug||''}}));
  obsButton.onclick=async()=>{obsButton.disabled=true;obsButton.title='';
   try{
    if(obsOn){await SCUI.api('/api/obs/akte',{visible:false});obsOn=false;}
    else{await SCUI.api('/api/obs/akte',{guid:row.guid,visible:true,state,heft:Number(n)||0,row:{guid:row.guid,start:row.start,end:row.end,status:row.status},session:session()});obsOn=true;sent=state;}
   }catch(err){obsButton.title=err.message;}
   finally{obsButton.disabled=false;obsLabel();}};
  overlay.querySelector('[data-akte-details]')?.addEventListener('click',()=>{close();onDetails();});
  fit.addEventListener('click',ev=>{if(ev.target===fit)close();});
  keyHandler=ev=>{if(ev.key==='Escape'){ev.preventDefault();close();}else if(ev.key==='ArrowRight'){ev.preventDefault();vor();}else if(ev.key==='ArrowLeft'){ev.preventDefault();zurueck();}};
  document.addEventListener('keydown',keyHandler,true);
  const start=({'#akte-zu':0,'#akte-auf':1,'#akte-s2':2,'#akte-s3':3,'#akte-s4':4,'#akte-s5':5})[location.hash];   // nur für Tests und Bildschirmfotos
  if(start!==undefined){stage.querySelectorAll('.book,.cover,.blue,.edge,.leaf').forEach(x=>x.style.transition='none');stage.style.animation='none';overlay.style.animation='none';state=start;}
  show();overlay.querySelector('[data-akte-close]').focus();
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const mine=overlay;
  let autoOpen=start===undefined;
  // Zeigt OBS gerade diese Akte, übernimmt das Dashboard die dort aufgeschlagene Seite (statt sie zurückzusetzen)
  SCUI.api('/api/obs/akte').then(d=>{if(overlay!==mine)return;if(d.visible&&d.guid===row.guid){obsOn=true;obsLabel();if(Number.isInteger(d.state)){autoOpen=false;state=d.state;sent=state;show();}}}).catch(()=>{});
  setTimeout(()=>{if(overlay===mine&&autoOpen&&state===0){state=1;show();}},reduce?0:650);
 }
 return {setItems,mini,open,close,blueprints,parseDescription,cleanTitle,prettyItem,prettyShop,category};
})();
