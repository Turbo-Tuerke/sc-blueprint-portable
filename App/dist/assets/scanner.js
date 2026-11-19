"use strict";
const se=id=>document.getElementById(id), sx=SCUI.escape;
let scanItems=[],scanBusy=false;
const date=v=>v?new Date(v).toLocaleString('de-DE'):'Noch kein Kontakt';
const sourceNames={logs:'Direkter Logscanner'};
document.addEventListener('DOMContentLoaded',async()=>{
 try{const c=await SCUI.api('/api/config');SCUI.apply(c.settings.appearance);scanItems=(await SCUI.api('/api/catalog')).items;await LogDetails.init(scanItems);await refreshScanner();}
 catch(e){se('scanStatus').textContent=e.message;}
 se('scanUnresolved').onclick=async e=>{const b=e.target.closest('[data-resolve]');if(!b)return;const select=document.getElementById('review-'+b.dataset.resolve);if(!select.value)return;scanBusy=true;b.disabled=true;try{await SCUI.api('/api/scanner/resolve',{event:b.dataset.resolve,item:select.value});}catch(err){se('scanStatus').textContent=err.message;}finally{scanBusy=false;await LogDetails.init(scanItems);await refreshScanner();}};
 setInterval(()=>{if(!document.hidden&&!scanBusy&&document.activeElement.tagName!=='SELECT')void refreshScanner().catch(e=>se('scanStatus').textContent=e.message);},5000);
});
async function refreshScanner(){
 const [s,c]=await Promise.all([SCUI.api('/api/scanner'),SCUI.api('/api/config')]);const a=c.agent||{},pc=a.scanner||{};
 LogDetails.events=s.events;LogDetails.archive=s.missions;
 const recent=a.receivedAt&&Date.now()-Date.parse(a.receivedAt)<120000;
 se('scanStatus').textContent=`${recent?'Windows-Helfer verbunden':'Windows-Helfer derzeit nicht verbunden'} · ${sourceNames[s.mode]} · ${s.channel}\n${pc.message||'Zum Start den aktualisierten Windows-Helfer installieren.'}\nLetzter PC-Kontakt: ${date(a.receivedAt)}${pc.lastFile?'\nZuletzt gelesen: '+pc.lastFile:''}`;
 const total=Object.values(s.counts).reduce((a,b)=>a+b,0);
 se('scanMetrics').innerHTML=`<span><b>${total}</b> Fundmeldungen gespeichert</span><span><b>${s.counts.unresolved||0}</b> ungeklärt</span><span><b>${pc.processedFiles||0}</b> Backups gelesen</span><span><b>${pc.pendingFiles||0}</b> Backups ausstehend</span>`;
 const options=scanItems.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(i=>`<option value="${sx(i.id)}">${sx(i.name)} · ${sx(i.category)} / ${sx(i.subcategory)}</option>`).join('');
 se('scanUnresolved').innerHTML=s.unresolved.slice(0,20).map(e=>`<article class="scan-card"><b>${sx(e.name)}</b><small>${date(e.ts)} · ${e.historical?'Historischer Fund':'Live-Fund'} · ${sx(e.channel)}</small><label for="review-${e.id}">Passendes Item</label><select id="review-${e.id}"><option value="">Bitte eindeutig zuordnen …</option>${options}</select><button class="quiet-button" data-resolve="${e.id}">Zuordnung speichern</button></article>`).join('')||'<p>Keine ungeklärten Funde.</p>';
 if(s.unresolved.length>20)se('scanUnresolved').insertAdjacentHTML('beforeend','<p>Die 20 neuesten offenen Funde werden angezeigt. Weitere folgen nach der Zuordnung.</p>');
 se('scanEvents').innerHTML=s.events.map(e=>`<article class="scan-card"><b>${e.ini?`<a href="#" data-log-event="${sx(e.id)}" data-log-item="${sx(scanItems.find(i=>i.ini===e.ini)?.id||e.ini)}">${sx(scanItems.find(i=>i.ini===e.ini)?.name||e.name)}</a>`:sx(e.name)}</b><small>${date(e.ts)} · ${e.historical?'Historisch · ohne OBS':'Live'} · ${e.ini?'Zugeordnet':'Ungeklärt'}</small>${e.mission?`<p>${sx(e.mission.debugName||e.mission.guid)}</p><small>Zeitliche Zuordnung · ${e.mission.deltaSeconds} Sekunden nach ${e.mission.trigger==='complete'?'Abschluss':'Annahme'}</small>`:'<small>Keine eindeutige Auftragszuordnung.</small>'}</article>`).join('')||'<p>Neue und historische Fundmeldungen erscheinen nach dem ersten Scan hier.</p>';
 document.getElementById('scanEvents').onclick=e=>{const b=e.target.closest('[data-log-item]');if(b){e.preventDefault();void LogDetails.item(b.dataset.logItem,b.dataset.logEvent);}};
 document.getElementById('scanMissions').onclick=e=>{const b=e.target.closest('[data-log-guid]');if(b){e.preventDefault();const m=s.missions.find(m=>m.guid===b.dataset.logGuid);if(m?.mission)LogDetails.show(LogDetails.mission(m.mission));}};
 const states={accepted:'Angenommen',Complete:'Erfolgreich abgeschlossen',Abandon:'Abgebrochen',Fail:'Fehlgeschlagen',Disconnect:'Verbindung beendet',Deactivate:'Deaktiviert'};
 se('scanMissions').innerHTML=s.missions.map(m=>`<article class="scan-card"><b>${m.matched?`<a href="#" data-log-guid="${sx(m.guid)}">${sx(m.title||m.debug||m.guid)}</a>`:sx(m.debug||m.guid)}</b>${m.matched?'':'<small>Keine eindeutige Katalogzuordnung.</small>'}<small>${sx(states[m.status]||m.status)} · ${date(m.end||m.start)}</small>${MissionText.rewards(m.mission||{})}${m.description?`<p>${sx(m.description.slice(0,500)).replaceAll('\\n','<br>')}</p>`:''}<small>${m.durationSeconds!=null?'Laufzeit: '+Math.round(m.durationSeconds)+' Sekunden · ':''}${m.definition?'Vertragskennung: '+sx(m.definition):'Keine Vertragskennung im Log'}</small></article>`).join('')||'<p>Noch keine Aufträge aus dem Log erfasst.</p>';
}
