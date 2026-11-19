"use strict";
/* Live-Aufträge. 4.1.7: bis zu 50 Einträge, Auswahl per Häkchen, „Auswahl schließen“ und „Alle schließen“.
   Die Auswahl bleibt über die automatische Aktualisierung (alle 3 s) erhalten. */
let liveRows=[],liveChannel='',liveBusy=false,liveTotal=0,liveUpTo='';
const liveSelected=new Set();
let liveConfirm=null,liveConfirmTimer=0;
const $live=id=>document.getElementById(id);
document.addEventListener('DOMContentLoaded',async()=>{
 try{const config=await SCUI.api('/api/config');SCUI.apply(config.settings.appearance);await LogDetails.init((await SCUI.api('/api/catalog')).items);await refreshLive();}catch(err){$live('liveStatus').textContent=err.message;}
 $live('liveList').onclick=async event=>{const close=event.target.closest('[data-live-close]'),open=event.target.closest('[data-live-open]');
  if(open){event.preventDefault();const m=liveRows.find(m=>m.guid===open.dataset.liveOpen);if(m?.mission)LogDetails.show(LogDetails.mission(m.mission));}
  if(close&&!liveBusy){close.disabled=true;await closeLive({guid:close.dataset.liveClose},close);}
 };
 $live('liveList').onchange=event=>{const box=event.target.closest('[data-live-select]');if(!box)return;
  if(box.checked)liveSelected.add(box.dataset.liveSelect);else liveSelected.delete(box.dataset.liveSelect);
  box.closest('.scan-card')?.classList.toggle('is-selected',box.checked);resetConfirm();updateLiveTools();};
 $live('liveSelectAll').onchange=event=>{for(const row of liveRows){if(event.target.checked)liveSelected.add(row.guid);else liveSelected.delete(row.guid);}resetConfirm();renderLive();};
 $live('liveCloseSelected').onclick=()=>armOrRun('selected',$live('liveCloseSelected'),()=>closeLive({guids:[...liveSelected]}));
 $live('liveCloseAll').onclick=()=>armOrRun('all',$live('liveCloseAll'),()=>closeLive({all:true,upTo:liveUpTo}));
 setInterval(()=>{if(!document.hidden&&!liveBusy)refreshLive().catch(err=>$live('liveStatus').textContent=err.message);},3000);
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
 try{const r=await SCUI.api('/api/missions/close',{...payload,channel:liveChannel});
  if(payload.guid)liveSelected.delete(payload.guid);else if(payload.guids)payload.guids.forEach(g=>liveSelected.delete(g));else liveSelected.clear();
  await refreshLive();
  if(!payload.guid)$live('liveStatus').textContent+=` · ${r.closed} ${r.closed===1?'Eintrag':'Einträge'} geschlossen.`;
 }catch(err){$live('liveStatus').textContent=err.message;if(button)button.disabled=false;}
 finally{liveBusy=false;updateLiveTools();}
}
async function refreshLive(){const data=await SCUI.api('/api/missions/active');
 liveRows=data.missions;liveChannel=data.channel;liveTotal=data.total;liveUpTo=liveRows.length?liveRows[0].start:'';
 const visible=new Set(liveRows.map(r=>r.guid));for(const g of [...liveSelected])if(!visible.has(g))liveSelected.delete(g);
 const limit=data.limit||50;
 $live('liveStatus').textContent=`${data.channel} · ${liveRows.length} von ${data.total} offenen Einträgen sichtbar · maximal ${limit}.`+(data.total>liveRows.length?' Weitere Einträge erscheinen nach dem Schließen.':'');
 renderLive();
}
function renderLive(){const e=SCUI.escape;
 $live('liveList').innerHTML=liveRows.map(row=>{const m=row.mission,sel=liveSelected.has(row.guid);return `<article class="scan-card live-card${sel?' is-selected':''}"><label class="live-check"><input type="checkbox" data-live-select="${e(row.guid)}"${sel?' checked':''}/><span>Auswählen</span></label><small>${e(({accepted:'Aktiv · angenommen',Complete:'Erfolgreich abgeschlossen'})[row.status]||row.status)} · ${e(new Date(row.start).toLocaleString('de-DE'))}</small><h2>${m?`<a href="#" data-live-open="${e(row.guid)}">${e(m.title||m.debugName)}</a>`:e(row.debug||row.guid)}</h2>${MissionText.rewards(m||{})}<p class="log-description">${m?MissionText.render(m):'Keine eindeutige Katalogzuordnung. Details werden nicht geraten.'}</p>${m?MissionText.cargo(m):''}<button class="quiet-button" type="button" data-live-close="${e(row.guid)}">Eintrag schließen</button></article>`;}).join('')||'<p>Keine offenen Live-Aufträge. Neue Annahmen erscheinen nach dem Logscan hier.</p>';
 updateLiveTools();
}
function updateLiveTools(){
 const tools=$live('liveTools');tools.hidden=!liveRows.length;
 const n=liveSelected.size,all=$live('liveSelectAll');
 all.checked=n>0&&n===liveRows.length;all.indeterminate=n>0&&n<liveRows.length;
 const sel=$live('liveCloseSelected'),every=$live('liveCloseAll');
 sel.disabled=liveBusy||!n;every.disabled=liveBusy||!liveTotal;
 sel.textContent=liveConfirm==='selected'?`Wirklich ${n} schließen?`:`Auswahl schließen (${n})`;
 every.textContent=liveConfirm==='all'?`Wirklich alle ${liveTotal} schließen?`:`Alle schließen (${liveTotal})`;
 $live('liveSelectedCount').textContent=n?`${n} ausgewählt`:'Keine Auswahl';
}
