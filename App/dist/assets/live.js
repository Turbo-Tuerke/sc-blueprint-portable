"use strict";
/* Live-Aufträge. 4.1.7: bis zu 50 Einträge, Auswahl per Häkchen, „Auswahl schließen“ und „Alle schließen“.
   Die Auswahl bleibt über die automatische Aktualisierung (alle 3 s) erhalten.
   6.0.3: Jeder Auftrag erscheint als Miniatur-Akte; ein Klick öffnet die große Akte zum Blättern (akte.js). */
let liveRows=[],liveChannel='',liveBusy=false,liveTotal=0,liveUpTo='';
const liveSelected=new Set();
let liveConfirm=null,liveConfirmTimer=0,liveHtml='',livePage=0,liveOffset=0;
// 6.0.5: schlanke Liste mit Revision; volle Aufträge erst beim Öffnen einer Akte; Katalog nur bei neuer Revision
let liveRev='',catalogSig='';const fullMissions=new Map();
async function fullMission(guid){if(!fullMissions.has(guid))fullMissions.set(guid,SCUI.api('/api/missions/instance/'+encodeURIComponent(guid)).then(r=>r.mission).catch(err=>{fullMissions.delete(guid);throw err;}));return fullMissions.get(guid);}
async function openAkte(row,n){try{const m=await fullMission(row.guid);if(m)Akte.open(row,m,n,liveRows,()=>LogDetails.show(LogDetails.mission(m)));}catch(err){$live('liveStatus').textContent=err.message;}}
// 6.0.4: Akten pro Seite statt fester Obergrenze; Auswahl gilt für die aktuelle Seite
const LIVE_SIZES=[10,20,50,100,150,200];
let liveSize=(()=>{try{const v=+localStorage.getItem('scbp-live-size');return LIVE_SIZES.includes(v)?v:20;}catch{return 20;}})();
const $live=id=>document.getElementById(id);
document.addEventListener('DOMContentLoaded',async()=>{
 try{const config=await SCUI.api('/api/config');SCUI.apply(config.settings.appearance);const catalog=await SCUI.api('/api/catalog'),items=catalog.items;catalogSig=catalog.signature||'';Akte.setItems(items);await LogDetails.init(items);await refreshLive();
  // Nur für Tests und Bildschirmfotos: #akte-zu, #akte-auf, #akte-s2 … #akte-s4 öffnet die neueste Akte
  if(/^#akte-/.test(location.hash)&&liveRows[0]?.mission)await openAkte(liveRows[0],liveTotal-liveOffset);}catch(err){$live('liveStatus').textContent=err.message;}
 $live('liveList').onclick=async event=>{const close=event.target.closest('[data-live-close]'),open=event.target.closest('[data-live-open]');
  if(open){event.preventDefault();const r=liveRows.find(m=>m.guid===open.dataset.liveOpen);if(r?.mission)fullMission(r.guid).then(m=>m&&LogDetails.show(LogDetails.mission(m)));}
  const akte=event.target.closest('[data-akte-open]');
  if(akte){const i=liveRows.findIndex(r=>r.guid===akte.dataset.akteOpen),row=liveRows[i];if(row?.mission)openAkte(row,liveTotal-liveOffset-i);}
  if(close&&!liveBusy){close.disabled=true;await closeLive({guid:close.dataset.liveClose},close);}
 };
 $live('liveList').onchange=event=>{const box=event.target.closest('[data-live-select]');if(!box)return;
  if(box.checked)liveSelected.add(box.dataset.liveSelect);else liveSelected.delete(box.dataset.liveSelect);
  box.closest('.scan-card')?.classList.toggle('is-selected',box.checked);resetConfirm();updateLiveTools();};
 $live('liveSelectAll').onchange=event=>{for(const row of liveRows){if(event.target.checked)liveSelected.add(row.guid);else liveSelected.delete(row.guid);}resetConfirm();renderLive();};
 $live('liveCloseSelected').onclick=()=>armOrRun('selected',$live('liveCloseSelected'),()=>closeLive({guids:[...liveSelected]}));
 $live('liveCloseAll').onclick=()=>armOrRun('all',$live('liveCloseAll'),()=>closeLive({all:true,upTo:liveUpTo}));
 const size=$live('liveSize');size.value=String(liveSize);
 size.onchange=async()=>{liveSize=+size.value;try{localStorage.setItem('scbp-live-size',String(liveSize));}catch{}
  // Den ersten Eintrag der bisherigen Seite auf der neuen Seite behalten
  livePage=Math.floor(liveOffset/liveSize);liveSelected.clear();resetConfirm();await refreshLive().catch(err=>$live('liveStatus').textContent=err.message);};
 document.querySelectorAll('[data-live-page]').forEach(b=>b.onclick=async()=>{const pages=Math.max(1,Math.ceil(liveTotal/liveSize));const next=b.dataset.livePage==='prev'?livePage-1:livePage+1;if(next<0||next>=pages||liveBusy)return;
  livePage=next;liveSelected.clear();resetConfirm();await refreshLive().catch(err=>$live('liveStatus').textContent=err.message);if(b.closest('.live-pager-bottom'))$live('liveTools').scrollIntoView({block:'start'});});
 setInterval(()=>{if(!document.hidden&&!liveBusy)refreshLive().catch(err=>$live('liveStatus').textContent=err.message);},3000);
 // Besitzstand für die Akten (erhalten/offen) jede Minute auffrischen
 setInterval(async()=>{if(document.hidden)return;try{const rev=(await SCUI.api('/api/catalog/revision')).signature;if(rev&&rev===catalogSig)return;
  const catalog=await SCUI.api('/api/catalog');catalogSig=catalog.signature||rev||'';Akte.setItems(catalog.items);fullMissions.clear();liveRev='';await refreshLive();}catch{}},60000);
});
/* Erster Klick fragt nach, zweiter Klick innerhalb von 6 s führt aus. Keine Browser-Dialoge. */
function armOrRun(kind,button,run){
 if(liveBusy)return;
 if(liveConfirm===kind){resetConfirm();run();return;}
 resetConfirm();liveConfirm=kind;button.classList.add('is-armed');updateLiveTools();
 liveConfirmTimer=setTimeout(()=>{resetConfirm();updateLiveTools();},6000);
}
function resetConfirm(){liveConfirm=null;clearTimeout(liveConfirmTimer);document.querySelectorAll('.live-tools .is-armed').forEach(b=>b.classList.remove('is-armed'));}
async function closeLive(payload,button){
 liveBusy=true;updateLiveTools();
 try{const r=await SCUI.api('/api/missions/close',{...payload,channel:liveChannel});liveRev='';
  if(payload.guid)liveSelected.delete(payload.guid);else if(payload.guids)payload.guids.forEach(g=>liveSelected.delete(g));else liveSelected.clear();
  await refreshLive();
  if(!payload.guid)$live('liveStatus').textContent+=` · ${r.closed} ${r.closed===1?'Eintrag':'Einträge'} geschlossen.`;
 }catch(err){$live('liveStatus').textContent=err.message;if(button)button.disabled=false;}
 finally{liveBusy=false;updateLiveTools();}
}
async function refreshLive(){const url=()=>`/api/missions/active?view=mini&limit=${liveSize}&offset=${livePage*liveSize}`;
 let data=await SCUI.api(url()+(liveRev?'&since='+liveRev:''));
 if(data.unchanged){updateLiveTools();return;}
 // Nach dem Schließen kann die letzte Seite leer sein: auf die nun letzte Seite springen
 if(!data.missions.length&&data.total&&livePage>0){livePage=Math.max(0,Math.ceil(data.total/liveSize)-1);data=await SCUI.api(url());}
 liveRev=data.revision||'';
 liveRows=data.missions;liveChannel=data.channel;liveTotal=data.total;liveOffset=data.offset||0;liveUpTo=data.newest||(liveRows.length?liveRows[0].start:'');
 const visible=new Set(liveRows.map(r=>r.guid));for(const g of [...liveSelected])if(!visible.has(g))liveSelected.delete(g);
 const pages=Math.max(1,Math.ceil(liveTotal/liveSize));
 $live('liveStatus').textContent=liveTotal?`${data.channel} · Einträge ${liveOffset+1}–${liveOffset+liveRows.length} von ${liveTotal} · Seite ${livePage+1} von ${pages}.`:`${data.channel} · keine offenen Einträge.`;
 document.querySelectorAll('.live-pager').forEach(p=>{p.hidden=pages<2;p.querySelector('[data-live-page="prev"]').disabled=livePage<=0;p.querySelector('[data-live-page="next"]').disabled=livePage>=pages-1;p.querySelector('.live-page-no').textContent=`Seite ${livePage+1} von ${pages}`;});
 renderLive();
}
function renderLive(){const e=SCUI.escape;
 // Heft-Nummer: ältester sichtbarer Eintrag = Heft 1
 const html=liveRows.map((row,i)=>{const m=row.mission,sel=liveSelected.has(row.guid);return `<article class="scan-card live-card akte-card${sel?' is-selected':''}"><label class="live-check"><input type="checkbox" data-live-select="${e(row.guid)}"${sel?' checked':''}/><span>Auswählen</span></label>${m?Akte.mini(row,m,liveTotal-liveOffset-i):`<small>${e(row.status)} · ${e(new Date(row.start).toLocaleString('de-DE'))}</small><h2>${e(row.debug||row.guid)}</h2><p class="am-nomatch">Keine eindeutige Katalogzuordnung. Details werden nicht geraten.</p>`}<button class="quiet-button" type="button" data-live-close="${e(row.guid)}">Eintrag schließen</button></article>`;}).join('')||'<p>Keine offenen Live-Aufträge. Neue Annahmen erscheinen nach dem Logscan hier.</p>';
 // Nur neu zeichnen, wenn sich etwas geändert hat (Fokus und Hover bleiben stehen)
 if(html!==liveHtml){liveHtml=html;$live('liveList').innerHTML=html;}
 updateLiveTools();
}
function updateLiveTools(){
 const tools=$live('liveTools');tools.hidden=!liveTotal;
 const n=liveSelected.size,all=$live('liveSelectAll');
 all.checked=n>0&&n===liveRows.length;all.indeterminate=n>0&&n<liveRows.length;
 const sel=$live('liveCloseSelected'),every=$live('liveCloseAll');
 sel.disabled=liveBusy||!n;every.disabled=liveBusy||!liveTotal;
 sel.textContent=liveConfirm==='selected'?`Wirklich ${n} schließen?`:`Auswahl schließen (${n})`;
 every.textContent=liveConfirm==='all'?`Wirklich alle ${liveTotal} schließen?`:`Alle schließen (${liveTotal})`;
 $live('liveSelectedCount').textContent=n?`${n} ausgewählt`:'Keine Auswahl';
}
