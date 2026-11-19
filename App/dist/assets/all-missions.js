'use strict';
/* Move existing controls and restore their exact positions when leaving the catalogue. */
window.AllMissionView={anchors:[],mode:null,
 move(node,host){if(!node||!host)return;const marker=document.createComment('all-missions-position');node.before(marker);this.anchors.push([node,marker]);host.append(node);},
 restore(){for(const [node,marker] of this.anchors.reverse())marker.replaceWith(node);this.anchors=[];this.mode=null;document.getElementById('allMissionResults')?.remove();document.getElementById('allMissionFooter')?.remove();document.getElementById('allMissionWorkspace')?.remove();},
 sync(){
  const active=bp.view==='missions'&&bp.missionScope==='all',reference=Boolean(window.ArchiveLayouts?.active),mode=active?(reference?'reference':'classic'):null;
  if(this.mode===mode){if(!active)document.getElementById('allMissionDialog')?.close();return;}
  this.restore();if(!active){document.getElementById('allMissionDialog')?.close();return;}
  this.mode=mode;elements.detailDialog?.close();
  let left,workspace;
  if(reference){workspace=document.getElementById('obsidianWorkspace');left=document.getElementById('obsidianCenter');}
  else{workspace=document.createElement('div');workspace.id='allMissionWorkspace';left=document.createElement('section');left.className='all-mission-controls';workspace.append(left);document.getElementById('top').prepend(workspace);for(const selector of ['.hero-panel','.filter-console','.facet-console'])this.move(document.querySelector(selector),left);}
  const results=document.createElement('section');results.id='allMissionResults';results.setAttribute('aria-label','Alle Aufträge');workspace.append(results);
  this.move(document.getElementById('missionPlanner'),results);this.move(document.getElementById('pagination'),results);
  const footer=document.createElement('footer');footer.id='allMissionFooter';left.append(footer);
  if(reference){for(const selector of ['#obsidianMyCollection','.obsidian-more','.obsidian-motto'])this.move(document.querySelector(selector),footer);}
  else this.move(document.querySelector('.telemetry-panel'),footer);
  if(elements.facetBody){elements.facetBody.hidden=false;elements.facetToggle.setAttribute('aria-expanded','true');elements.facetToggle.textContent='Filter einklappen';}
 },
 card(m,pools,index){const e=SCUI.escape,key=e(m.id||m.debugName);return `<article class="planner-card all-mission-card" data-all-mission="${key}"><div class="planner-top"><div><span class="eyebrow">${e(m.contractor||'AUFTRAG')} · ${m.active?'AKTIV':'EVENT / INAKTIV'}</span><h3><button type="button" class="all-mission-open" data-open-all-mission="${key}" aria-haspopup="dialog">${e(m.title||m.debugName)}</button></h3><p>${e((m.systems||[]).join(' · '))} · ${m.illegal?'Illegal':'Legal'} · ${e(m.minStanding||'Ohne Rangvorgabe')}</p></div><span class="planner-number">${String(index+1).padStart(2,'0')}</span></div><div class="planner-stats"><span><b>${e(m.missionType||m.category||'—')}</b> Auftragsart</span><span><b>${m.timeToCompleteMinutes==null?'—':formatNumber(m.timeToCompleteMinutes)+' Min'}</b> Zeitlimit</span><span><b>${m.rewardUEC==null?'—':formatNumber(m.rewardUEC)+' aUEC'}</b> Auftragsprämie</span><span><b>${pools.length}</b> Bauplan-Pools</span></div><button class="quiet-button" type="button" data-open-all-mission="${key}" aria-haspopup="dialog">Auftrag öffnen ↗</button></article>`;},
 markup(m){const e=SCUI.escape,key=e(m.id||m.debugName),pools=Array.isArray(m.rewardPools)?m.rewardPools:getMissionRewardPools(m);const facts=[['Auftraggeber',m.contractor||'Unbekannt'],['Region / System',(m.systems||[]).join(' · ')||'Unbekannt'],['Auftragsart',m.missionType||m.category||'—'],['Status',(m.active?'Aktiv':'Event / inaktiv')+' · '+(m.illegal?'Illegal':'Legal')],['Mindestrang',m.minStanding||'Ohne Rangvorgabe'],['Zeitlimit',m.timeToCompleteMinutes==null?'—':formatNumber(m.timeToCompleteMinutes)+' Min'],['Auftragsprämie',m.rewardUEC==null?'—':formatNumber(m.rewardUEC)+' aUEC']];
  const url=safeExternalUrl(m.scmdbUrl,new Set(['scmdb.net']))||'https://scmdb.net/';
  return `<header class="all-mission-dialog-header"><div><span class="eyebrow">ALLE AUFTRÄGE · AUFTRAGSDETAILS</span><h2 id="allMissionDialogTitle">${MissionText.render(m,'title')}</h2></div><button class="quiet-button" data-close-all-mission type="button" aria-label="Auftragsdetails schließen">Schließen ×</button></header><div class="all-mission-dialog-body"><section class="all-mission-facts"><h3>Auftrag im Überblick</h3><dl>${facts.map(([k,v])=>`<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('')}</dl><h3>Voraussetzungen</h3>${m.prerequisites?.length?`<ul>${m.prerequisites.map(v=>`<li>${e(v)}</li>`).join('')}</ul>`:'<p>Keine weiteren Angaben</p>'}<div class="settings-actions"><button class="primary-button" data-send-mission="${key}" data-title="${e(m.title)}" type="button">${SCUI.icon('broadcast')}In OBS anzeigen</button><a class="quiet-button" href="${e(url)}" target="_blank" rel="noopener noreferrer">In SCMDB öffnen ↗</a></div></section><section class="all-mission-description"><h3>Auftragsbeschreibung</h3><p>${MissionText.render(m)||'Keine Beschreibung hinterlegt.'}</p>${MissionText.cargo(m)}</section><section class="all-mission-rewards"><h3>Bauplan-Belohnungen</h3>${pools.length?`<div class="settings-actions"><button type="button" class="quiet-button" data-send-rewards="${key}" data-title="${e(m.title)}">Belohnungspools in OBS anzeigen</button></div><div class="planner-reward-pools">${pools.map(renderRewardPool).join('')}</div>`:'<p>Keine Bauplanbelohnungen für diesen Auftrag hinterlegt.</p>'}</section></div>`;
 },
 open(key){const m=(state.scmdb?.missions||[]).find(m=>(m.id||m.debugName)===key);if(!m)return;let dialog=document.getElementById('allMissionDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='allMissionDialog';dialog.className='all-mission-dialog';dialog.setAttribute('aria-labelledby','allMissionDialogTitle');document.body.append(dialog);dialog.onclick=async event=>{if(event.target.closest('[data-close-all-mission]')){dialog.close();return;}const item=event.target.closest('[data-reward-item-id]');if(item){dialog.close();setView('gallery');openDetails(Number(item.dataset.rewardItemId));return;}const button=event.target.closest('[data-send-mission]');if(button){button.disabled=true;try{await sendObs({kind:'mission-brief',mission:button.dataset.sendMission,title:button.dataset.title});}finally{button.disabled=false;}}};}
  dialog.innerHTML=this.markup(m);if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
 }
};
document.addEventListener('click',event=>{const button=event.target.closest('[data-open-all-mission]');if(button){AllMissionView.open(button.dataset.openAllMission);return;}const card=event.target.closest('[data-all-mission]');if(card&&!event.target.closest('button,a,input,select,summary'))AllMissionView.open(card.dataset.allMission);});
/* 5.3.3: Ein im Spiel angenommener Auftrag öffnet sich automatisch in „Alle Aufträge“.
   Nur neue Live-Annahmen (nicht historisch nachgetragene), nur bei sichtbarer Seite. */
window.AcceptedMissionWatcher={cursor:null,channel:null,busy:false,
 async poll(){
  if(this.busy||document.hidden)return;this.busy=true;
  try{
   const response=await fetch('/api/missions/live?after='+(this.cursor??0),{cache:'no-store'});if(!response.ok)return;
   const feed=await response.json();
   // Erster Abruf und Kanalwechsel: nur den Stand merken, nichts Altes öffnen.
   if(this.cursor===null||feed.channel!==this.channel){this.channel=feed.channel;this.cursor=feed.latest;return;}
   this.cursor=feed.cursor;
   const fresh=(feed.events||[]).filter(e=>!e.historical&&e.matched&&e.mission);
   if(fresh.length)this.show(fresh[fresh.length-1]);
  }catch(error){/* Netzwerkfehler: beim nächsten Durchlauf erneut versuchen. */}
  finally{this.busy=false;}
 },
 show(event){
  const m=event.mission,key=m.id||m.debugName,known=(state.scmdb?.missions||[]).some(x=>(x.id||x.debugName)===key);
  if(!known){window.LiveDossier?.open(event);return;}
  if(!(bp.view==='missions'&&bp.missionScope==='all'))setView('all-missions');
  AllMissionView.sync();AllMissionView.open(key);
 }
};
if(typeof setInterval==='function'&&typeof fetch==='function'){
 setInterval(()=>AcceptedMissionWatcher.poll(),5000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)AcceptedMissionWatcher.poll();});
 AcceptedMissionWatcher.poll();
}
