"use strict";
const bp={config:null,collection:{revision:0,favorites:[],goals:[],presets:[]},view:"gallery",only:"all",compare:new Set(),activeOnly:true,missionScope:"blueprints",allActiveOnly:false,goalsOnly:false,observer:null,imageQueue:[],imageWorkers:0,imageGeneration:0,collectionQueue:Promise.resolve(),detailItem:null};
const itemKey=item=>item.ini||item.scmdb?.blueprint?.guid||item.name;
const $bp=id=>document.getElementById(id);

async function initializeV2(){
  try {
    [bp.config,bp.collection]=await Promise.all([SCUI.api('/api/config'),SCUI.api('/api/collection')]);
    SCUI.apply(bp.config.settings.appearance);bp.view=bp.config.settings.appearance.view;
  }catch(error){showToast('Einstellungen konnten nicht geladen werden: '+error.message,true);}
  const params=new URLSearchParams(location.search);
  if(['gallery','table','missions','all-missions'].includes(params.get('view'))){bp.missionScope=params.get('view')==='all-missions'?'all':'blueprints';bp.view=bp.missionScope==='all'?'missions':params.get('view');}
  if(['favorites','goals'].includes(params.get('collection')))bp.only=params.get('collection');
  state.pageSize=24;state.visibleCount=24;
  window.ArchiveLayouts?.mount();
  document.querySelectorAll('[data-view]').forEach(button=>{button.innerHTML=SCUI.icon({gallery:'grid',table:'list',missions:'target'}[button.dataset.view])+button.textContent;button.addEventListener('click',()=>setView(button.dataset.view));});
  $bp('favoritesFilter').innerHTML=SCUI.icon('star')+'Favoriten';
  $bp('goalsFilter').innerHTML=SCUI.icon('target')+'Sammelziele';
  $bp('favoritesFilter').onclick=()=>{bp.only=bp.only==='favorites'?'all':'favorites';resetVisibleAndRender();};
  $bp('goalsFilter').onclick=()=>{bp.only=bp.only==='goals'?'all':'goals';resetVisibleAndRender();};
  document.querySelectorAll('[data-nav]').forEach(button=>button.onclick=()=>{bp.only=button.dataset.nav==='goals'?'goals':'all';setView(['missions','all-missions'].includes(button.dataset.nav)?button.dataset.nav:'gallery');$bp('archiveTitle').scrollIntoView({behavior:'smooth',block:'start'});});
  $bp('blueprintGallery').addEventListener('click',handleItemAction);
  $bp('detailActions').addEventListener('click',handleItemAction);
  $bp('missionPlanner').addEventListener('click',async event=>{
    const item=event.target.closest('[data-reward-item-id]');if(item){openDetails(Number(item.dataset.rewardItemId));return;}
    const button=event.target.closest('[data-send-mission]');if(button){await sendObs({kind:'mission-brief',mission:button.dataset.sendMission,title:button.dataset.title});}
  });
  $bp('openCompare').onclick=showComparison;
  $bp('clearCompare').onclick=()=>{bp.compare.clear();renderTable();if(bp.detailItem)renderDetailActions(bp.detailItem);};
  document.querySelectorAll('[data-close-dialog]').forEach(button=>button.onclick=()=>button.closest('dialog').close());
  $bp('savePreset').onclick=()=>{$bp('presetName').value='';$bp('presetDialog').showModal();$bp('presetName').focus();};
  $bp('presetForm').onsubmit=async event=>{event.preventDefault();const name=$bp('presetName').value.trim();if(!name)return;const filters={...serializeFilters(),only:bp.only,activeOnly:bp.activeOnly,goalsOnly:bp.goalsOnly};const ok=await updateCollection(c=>{const index=c.presets.findIndex(x=>x.name===name);if(index<0)c.presets.push({name,filters});else c.presets[index]={name,filters};});if(ok)$bp('presetDialog').close();};
  $bp('savedFilters').onchange=()=>applyPreset($bp('savedFilters').value);
  $bp('deletePreset').onclick=async()=>{const name=$bp('savedFilters').value;await updateCollection(c=>{c.presets=c.presets.filter(p=>p.name!==name);});$bp('deletePreset').hidden=true;};
  renderPresets();
  setInterval(async()=>{
    if(document.hidden)return;
    try { const [cfg,collection]=await Promise.all([SCUI.api('/api/config'),SCUI.api('/api/collection')]);
      if(cfg.revision!==bp.config?.revision){bp.config=cfg;SCUI.apply(cfg.settings.appearance);}
      if(collection.revision!==bp.collection.revision){bp.collection=collection;renderPresets();applyFilters();renderTable();if(bp.detailItem)renderDetailActions(bp.detailItem);}
    }catch{}
  },15000);
}
function matchesCollection(item){return bp.only==='all'||bp.collection[bp.only]?.includes(itemKey(item));}
function setView(view){const route=new URL(location.href);route.searchParams.set('view',view);history.replaceState(null,'',route);const scope=view==='all-missions'?'all':'blueprints';if(view==='all-missions')view='missions';if(view==='missions')bp.missionScope=scope;MissionFilters.switchView(view);if(view==='missions'&&bp.view!=='missions'){elements.facetBody.hidden=true;elements.facetToggle.setAttribute('aria-expanded','false');elements.facetToggle.textContent='Filter ausklappen';}bp.view=view;state.visibleCount=state.pageSize;applyFilters();renderTable();syncFacetControls();}
function renderTable(){
  if(!document.getElementById('blueprintGallery'))return;
  document.body.classList.toggle('all-missions-view',bp.view==='missions'&&bp.missionScope==='all');
  $bp('tableView').hidden=bp.view!=='table';$bp('blueprintGallery').hidden=bp.view!=='gallery';$bp('missionPlanner').hidden=bp.view!=='missions';
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('is-active',b.dataset.view===bp.view&&!(bp.view==='missions'&&bp.missionScope==='all'));b.setAttribute('aria-pressed',String(b.dataset.view===bp.view&&!(bp.view==='missions'&&bp.missionScope==='all')));});
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===(bp.only==='goals'?'goals':bp.view==='missions'?(bp.missionScope==='all'?'all-missions':'missions'):'archive')));
  ['favorites','goals'].forEach(name=>{$bp(name+'Filter').classList.toggle('is-active',bp.only===name);$bp(name+'Filter').setAttribute('aria-pressed',String(bp.only===name));});
  elements.resultCount.textContent=`${formatNumber(state.filtered.length)} VON ${formatNumber(state.items.length)} BAUPLÄNEN`;
  elements.emptyState.hidden=state.filtered.length!==0;
  elements.pagination.hidden=state.filtered.length<=state.visibleCount;
  if(bp.view==='table')renderLegacyTable();else if(bp.view==='gallery')renderCards();else renderPlanner();
  renderCollectionSummary();renderCompareDock();window.ArchiveLayouts?.sync();window.FilterLayouts?.sync();window.AllMissionView?.sync();
}
function renderCards(){
  bp.observer?.disconnect();bp.imageQueue=[];bp.imageGeneration++;
  $bp('blueprintGallery').innerHTML=(window.ArchiveLayouts?.theme==='polaris'&&ArchiveLayouts.active?ArchiveLayouts.listHeading():'')+state.filtered.slice(0,state.visibleCount).map(item=>{
    if(window.ArchiveLayouts?.active)return ArchiveLayouts.card(item);
    const fav=bp.collection.favorites.includes(itemKey(item)),goal=bp.collection.goals.includes(itemKey(item)),comp=bp.compare.has(itemKey(item));
    return `<article class="blueprint-card">
      <div class="card-topline"><span class="status-pill ${item.isDone?'done':'open'}">${item.isDone?'✓ Erhalten':'Offen'}</span><button class="quiet-button ${fav?'is-active':''}" data-action="favorite" data-id="${item.id}" type="button" aria-label="${fav?'Favorit entfernen':'Als Favorit merken'}: ${escapeHtml(item.name)}" aria-pressed="${fav}">${SCUI.icon('star')}</button></div>
      <button class="card-visual" data-action="detail" data-id="${item.id}" type="button" aria-label="Details: ${escapeHtml(item.name)}">${SCUI.icon(item.mainCategory)}<span class="image-note">${bp.config?.settings.sources.maxImages===0?'BILDER AUSGEBLENDET':'BILD WIRD GEPRÜFT'}</span></button>
      <div class="card-body"><div class="card-eyebrow"><span>${escapeHtml(item.manufacturer==='—'?mainCategoryLabel(item.mainCategory):item.manufacturer)}</span><span>${item.size==='—'?'':`S${escapeHtml(item.size)}`}${armorClassLabel(item)?`${item.size==='—'?'':' · '}<b class="armor-class">${armorClassLabel(item)}</b>`:''}</span></div><button class="card-title" type="button" data-action="detail" data-id="${item.id}">${escapeHtml(item.name)}</button>
      <div class="card-bottom"><span>${item.missionCount?`${item.missionCount} Fundwege`:'Keine Auftragsquelle'}</span><div class="card-actions"><button class="quiet-button ${goal?'is-active':''}" data-action="goal" data-id="${item.id}" type="button" aria-label="Sammelziel ${goal?'entfernen':'setzen'}" title="Sammelziel" aria-pressed="${goal}">${SCUI.icon('target')}</button><button class="quiet-button ${comp?'is-active':''}" data-action="compare" data-id="${item.id}" type="button" aria-label="${comp?'Aus Vergleich entfernen':'Vergleichen'}" title="Vergleichen" aria-pressed="${comp}">${SCUI.icon('compare')}</button><button class="quiet-button" data-action="obs" data-id="${item.id}" type="button" aria-label="In OBS anzeigen" title="In OBS anzeigen">${SCUI.icon('broadcast')}</button></div></div></div></article>`;
  }).join('');
  if(bp.config?.settings.sources.maxImages===0)return;
  bp.observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){bp.observer.unobserve(entry.target);bp.imageQueue.push({element:entry.target,generation:bp.imageGeneration});}}pumpImages();},{rootMargin:'100px'});
  $bp('blueprintGallery').querySelectorAll('.card-visual').forEach(card=>bp.observer.observe(card));
}
function pumpImages(){
  while(bp.imageWorkers<3&&bp.imageQueue.length){
    const {element,generation}=bp.imageQueue.shift();bp.imageWorkers++;
    const item=state.items.find(i=>i.id===Number(element.dataset.id));
    Promise.resolve(item?loadWikiDossier(item):null).then(dossier=>{
      if(generation!==bp.imageGeneration||!element.isConnected)return;
      const image=dossier?.images?.[0];const note=element.querySelector('.image-note');
      if(image){element.querySelector('img')?.remove();const img=document.createElement('img');img.alt=item.name;img.loading='lazy';img.onload=()=>{note.textContent=image.source||'LOKAL GESPEICHERT';element.querySelector('svg')?.style.setProperty('opacity','0');};img.onerror=()=>{img.remove();note.textContent='KEIN BILD VERFÜGBAR';};img.src=image.thumbnail||image.original;element.append(img);}else note.textContent=dossier?.pending?'QUELLEN WERDEN GEPRÜFT':'KEIN BILD VERFÜGBAR';
    }).finally(()=>{bp.imageWorkers--;pumpImages();});
  }
}
async function handleItemAction(event){
  const button=event.target.closest('[data-action][data-id]');if(!button)return;
  const item=state.items.find(i=>i.id===Number(button.dataset.id));if(!item)return;
  const key=itemKey(item);
  switch(button.dataset.action){
    case 'owned':
    case 'owned-auto':
      button.disabled=true;try{await SCUI.api('/api/ownership',{item:item.ini,owned:button.dataset.action==='owned-auto'?null:button.checked});await loadDashboard(true);showToast('Besitzstatus gespeichert.');}catch(error){showToast(error.message,true);button.checked=item.isDone;}finally{button.disabled=false;}break;
    case 'detail':openDetails(item.id);break;
    case 'favorite':await updateCollection(c=>toggleArray(c.favorites,key));break;
    case 'goal':await updateCollection(c=>toggleArray(c.goals,key));break;
    case 'compare':if(bp.compare.has(key))bp.compare.delete(key);else if(bp.compare.size<3)bp.compare.add(key);else{showToast('Du kannst bis zu drei Items vergleichen.');return;}renderTable();if(bp.detailItem)renderDetailActions(bp.detailItem);break;
    case 'obs':await sendObs({kind:'item',item:item.ini||item.name,title:item.name});break;
  }
}
function toggleArray(array,value){const index=array.indexOf(value);if(index<0)array.push(value);else array.splice(index,1);}
async function updateCollection(change){
  let success=false;
  const task=async()=>{try{let next=structuredClone(bp.collection);change(next);try{bp.collection=await SCUI.api('/api/collection',next);}catch(e){if(e.status!==409)throw e;next=await SCUI.api('/api/collection');change(next);bp.collection=await SCUI.api('/api/collection',next);}success=true;renderPresets();applyFilters();renderTable();if(bp.detailItem)renderDetailActions(bp.detailItem);}catch(e){showToast(e.message,true);}};
  bp.collectionQueue=bp.collectionQueue.then(task,task);await bp.collectionQueue;return success;
}
function renderDetailActions(item){
  bp.detailItem=item;const key=itemKey(item);
  $bp('detailActions').innerHTML=[['favorite','star',bp.collection.favorites.includes(key)?'Favorit gespeichert':'Als Favorit merken',bp.collection.favorites.includes(key)],['goal','target',bp.collection.goals.includes(key)?'Sammelziel gesetzt':'Als Sammelziel setzen',bp.collection.goals.includes(key)],['compare','compare',bp.compare.has(key)?'Im Vergleich':'Vergleichen',bp.compare.has(key)],['obs','broadcast','In OBS anzeigen',false]].map(([action,icon,label,active])=>`<button class="quiet-button ${active?'is-active':''}" data-action="${action}" data-id="${item.id}" type="button" ${action==='obs'?'':`aria-pressed="${active}"`}>${SCUI.icon(icon)}${label}</button>`).join('');
  const manual=typeof item.manualOwned==='boolean',source=manual?'Manuell gesetzt':item.logConfirmed?'Spiel-Log bestätigt':'Synchronisiert';
  $bp('detailActions').insertAdjacentHTML('afterbegin',`<div class="ownership-control" data-ownership="${manual?'manual':item.logConfirmed?'log':'sync'}"><label><input type="checkbox" data-action="owned" data-id="${item.id}" ${item.isDone?'checked':''}/> Im Besitz</label><small>${source}</small>${manual?`<button type="button" class="quiet-button" data-action="owned-auto" data-id="${item.id}">${!item.isDone&&item.logConfirmed?'Logfund vorhanden · Übernehmen':'Manuelle Änderung zurücksetzen'}</button>`:''}</div>`);

  window.ArchiveLayouts?.detailActions(item);
}
function renderCollectionSummary(){
  const goals=state.items.filter(i=>bp.collection.goals.includes(itemKey(i))),done=goals.filter(i=>i.isDone).length;
  $bp('collectionSummary').innerHTML=`<span><b>${bp.collection.favorites.length}</b> Favoriten</span><span><b>${done} / ${goals.length}</b> Sammelziele erreicht <span class="goal-progress"><i style="width:${goals.length?done/goals.length*100:0}%"></i></span></span><span>Deine Auswahl wird auf der Synology gespeichert.</span>`;
}
function renderCompareDock(){const count=bp.compare.size;$bp('compareDock').hidden=!count;$bp('compareCount').textContent=`${count} / 3 Items ausgewählt`;$bp('openCompare').disabled=count<2;window.ArchiveLayouts?.syncCompare();}
function showComparison(){
  document.querySelector('#compareDialog h2').textContent='Items vergleichen';
  const items=state.items.filter(i=>bp.compare.has(itemKey(i)));
  const rows=[['Status',i=>i.isDone?'Erhalten':'Offen'],['Kategorie',i=>mainCategoryLabel(i.mainCategory)+' · '+categoryLabel(i.subCategory)],['Hersteller',i=>i.manufacturer],['Größe',i=>i.size],['Gütegrad',i=>i.grade],['Komponentenklasse',i=>i.scmdb?.profile?.componentClass||'—'],['Masse',i=>i.scmdb?.profile?.mass!=null?`${i.scmdb.profile.mass} kg`:'—'],['Fertigungszeit',i=>i.scmdb?.recipe?.tiers?.[0]?.craftTimeSeconds!=null?formatDuration(i.scmdb.recipe.tiers[0].craftTimeSeconds):'—'],['Auftragsquellen',i=>i.missionCount],['Höchste Item-Chance (Basis)',i=>{const values=(i.scmdb?.missions||[]).filter(m=>m.combinedChancePercent!=null).map(m=>Number(m.combinedChancePercent));return values.length?formatPercent(Math.max(...values)):'—';}],['Funddatum',i=>i.acquiredAt?formatDate(i.acquiredAt):'—']];
  $bp('compareContent').innerHTML=`<table class="compare-table"><thead><tr><th>Eigenschaft</th>${items.map(i=>`<th>${escapeHtml(i.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><td>${label}</td>${items.map(i=>`<td>${escapeHtml(fn(i))}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="planner-note" style="padding:18px">Chancen stammen aus dem verknüpften SCMDB-Stand. Pool-Chance und Chance auf ein bestimmtes Item sind unterschiedlich. Keine garantierte Drop-Prognose.</p>`;
  $bp('compareDialog').showModal();
}
async function sendObs(selection){try{await SCUI.api('/api/obs',selection);showToast('Zur OBS-Warteschlange hinzugefügt.');}catch(e){showToast(e.message,true);}}

function renderPresets(){const value=$bp('savedFilters').value;$bp('savedFilters').innerHTML='<option value="">Meine Filter</option>'+bp.collection.presets.map(p=>`<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');$bp('savedFilters').value=value;}
function applyPreset(name){
  const preset=bp.collection.presets.find(p=>p.name===name);$bp('deletePreset').hidden=!preset;if(!preset)return;
  const f=preset.filters,defaults=createDefaultFilters();
  for(const key of Object.keys(defaults)){if(defaults[key] instanceof Set)defaults[key]=new Set(Array.isArray(f[key])?f[key]:[...defaults[key]]);else if(typeof f[key]===typeof defaults[key])defaults[key]=f[key];}
  state.filters=defaults;bp.only=['all','favorites','goals'].includes(f.only)?f.only:'all';bp.activeOnly=f.activeOnly!==false;bp.goalsOnly=f.goalsOnly===true;
  elements.searchInput.value=defaults.query;elements.sortSelect.value=defaults.sort;elements.categorySelect.value='all';
  elements.statusTabs.forEach(b=>{b.classList.toggle('is-active',b.dataset.status===defaults.status);b.setAttribute('aria-pressed',String(b.dataset.status===defaults.status));});
  syncCategoryControls();syncFacetControls();resetVisibleAndRender();
}
function planAllMissions(){
  const seen=new Set(),list=[];
  for(const source of state.scmdb?.missions||[]){
    const key=source.id||source.debugName;if(!key||seen.has(key))continue;seen.add(key);
    const m={...source,...(getMissionDefinition(source)||{})};
    if(bp.allActiveOnly&&m.active===false)continue;
    if(!MissionFilters.matches(m))continue;
    const pools=Array.isArray(m.rewardPools)?m.rewardPools:getMissionRewardPools(m);
    list.push({mission:m,pools,missing:[],goals:0});
  }
  return list.sort((a,b)=>String(a.mission.title||a.mission.debugName).localeCompare(String(b.mission.title||b.mission.debugName),'de')||String(a.mission.id).localeCompare(String(b.mission.id)));
}
function planMissions(){
  if(bp.missionScope==='all')return planAllMissions();
  const missions=new Map(),seen=new Set(),eligible=new Set(state.filtered.map(itemKey));
  for(const item of state.filtered){for(const m of item.scmdb?.missions||[]){const key=m.id||m.debugName;if(!key||seen.has(key))continue;seen.add(key);
    if(bp.view!=='missions'&&state.filters.systems.size&&!(m.systems||[]).some(s=>state.filters.systems.has(s)))continue;
    const full={...m,...(getMissionDefinition(m)||{})};
    if(!MissionFilters.matches(full))continue;
    if(bp.activeOnly&&!m.active)continue;
    const pools=getMissionRewardPools(m),unique=new Map();
    for(const pool of pools)for(const reward of pool.items||[]){const match=resolveRewardItem(reward);if(match&&eligible.has(itemKey(match))&&!match.isDone)unique.set(itemKey(match),match);}
    const missing=[...unique.values()],goals=missing.filter(i=>bp.collection.goals.includes(itemKey(i))).length;
    if(bp.goalsOnly&&!goals)continue;if(!missing.length)continue;
    missions.set(key,{mission:m,pools,missing,goals});
  }}
  return [...missions.values()].sort((a,b)=>b.goals-a.goals||b.missing.length-a.missing.length||Number(b.mission.active)-Number(a.mission.active)||(b.mission.rewardUEC||0)-(a.mission.rewardUEC||0));
}
function renderPlanner(){
  document.body.classList.toggle('all-missions-view',bp.missionScope==='all');
  if(bp.missionScope!=='all'&&window.ArchiveLayouts?.active&&ArchiveLayouts.theme==='sentinel'){ArchiveLayouts.renderTacticalPlanner();return;}
  const all=bp.missionScope==='all',list=planMissions(),visible=list.slice(0,state.visibleCount);
  elements.pagination.hidden=list.length<=state.visibleCount;elements.emptyState.hidden=true;
  elements.resultCount.textContent=`${formatNumber(list.length)} PASSENDE AUFTRÄGE`;
  $bp('missionPlanner').innerHTML=`<header class="planner-header"><div><h3>${all?'Alle Aufträge':'Blueprint Aufträge'}</h3><p>${all?'Alle Aufträge im verfügbaren SCMDB-Katalog · alphabetisch sortiert.':'Sortiert nach offenen Sammelzielen, danach fehlenden Bauplänen.'}</p></div><div><label class="setting-toggle"><input type="checkbox" id="activeMissionsOnly" ${(all?bp.allActiveOnly:bp.activeOnly)?'checked':''}/> Nur aktive Aufträge</label><label class="setting-toggle" ${all?'hidden':''}><input type="checkbox" id="goalMissionsOnly" ${bp.goalsOnly?'checked':''}/> Nur für meine Sammelziele</label></div></header><p class="planner-note">${all?'Quelle: SCMDB · Spielversion '+escapeHtml(state.scmdb?._meta?.scmdbVersion||'unbekannt')+'. Enthält auch Aufträge ohne Bauplanbelohnungen und bereits vollständig gesammelte Belohnungspools. Der Status „aktiv“ beschreibt den Katalog, nicht deinen persönlichen Auftragsverlauf.':'Berücksichtigt die aktuelle Filterauswahl und die verfügbaren Fundwege im lokalen Snapshot. Die Rangfolge zählt passende Baupläne; sie ist keine Drop-Wahrscheinlichkeit. Voraussetzungen können weiterhin deinen Ruf oder Fortschritt einschränken.'}</p>`+visible.map(({mission:m,pools,missing,goals},index)=>{
    if(all)return AllMissionView.card(m,pools,index);
    const translated=(m.translation?.translatedFields||[]).includes('description');
    return `<article class="planner-card"><div class="planner-top"><div><span class="eyebrow">${escapeHtml(m.contractor||'AUFTRAG')} · ${m.active?'AKTIV':'EVENT / INAKTIV'}</span><h3>${MissionText.render(m,'title')}</h3><p>${escapeHtml((m.systems||[]).join(' · '))} · ${m.illegal?'Illegal':'Legal'} · ${escapeHtml(m.minStanding||'Ohne Rangvorgabe')}</p></div><span class="planner-number">${String(index+1).padStart(2,'0')}</span></div>
    <div class="planner-stats">${all?`<span><b>${escapeHtml(m.missionType||m.category||'—')}</b> Auftragsart</span><span><b>${m.timeToCompleteMinutes==null?'—':formatNumber(m.timeToCompleteMinutes)+' Min'}</b> Zeitlimit</span>`:`<span><b>${missing.length}</b> passende offene Baupläne</span><span><b>${goals}</b> offene Sammelziele</span>`}<span><b>${m.rewardUEC==null?'—':formatNumber(m.rewardUEC)+' aUEC'}</b> Auftragsprämie</span><span><b>${pools.length}</b> Bauplan-Pools</span></div>
    <div class="settings-actions"><button class="quiet-button" data-send-mission="${escapeHtml(m.id||m.debugName)}" data-title="${escapeHtml(m.title)}" type="button">${SCUI.icon('broadcast')}In OBS anzeigen</button><a class="quiet-button" href="${escapeHtml(safeExternalUrl(m.scmdbUrl,new Set(['scmdb.net']))||'https://scmdb.net/')}" target="_blank" rel="noopener noreferrer">SCMDB ↗</a></div>
    <details><summary>Beschreibung, Voraussetzungen &amp; Belohnungen</summary><p class="planner-note">${translated?'Deutsche Beschreibung · StarCitizen-Deutsch-INI':'Für diese Beschreibung liegt keine deutsche Übersetzung vor.'}</p><p class="planner-description">${MissionText.render(m)}</p>${MissionText.cargo(m)}<p class="planner-note">Voraussetzungen: ${escapeHtml(m.prerequisites?.join(' · ')||'Keine weiteren Angaben')} · Zeitlimit: ${m.timeToCompleteMinutes==null?'—':formatNumber(m.timeToCompleteMinutes)+' Min'}</p>${pools.length?`<p class="planner-note">Jeder Pool wird unabhängig ausgewertet. Die angezeigte Pool-Chance ist keine Garantie für ein bestimmtes Item. Vollständig gesammelte Pools liefern keine weiteren Baupläne.</p><div class="settings-actions"><button class="quiet-button" type="button" data-send-rewards="${escapeHtml(m.id||m.debugName)}" data-title="${escapeHtml(m.title)}">${SCUI.icon('broadcast')}Belohnungspools in OBS anzeigen</button></div><div class="planner-reward-pools">${pools.map(renderRewardPool).join('')}</div>`:'<p class="planner-note">Keine Bauplanbelohnungen für diesen Auftrag hinterlegt.</p>'}</details></article>`;
  }).join('')+(list.length?'':`<div class="empty-state"><h3>${all?'Keine passenden Aufträge':'Keine passenden offenen Baupläne'}</h3><p>${all?'Prüfe Suche und Auftragsfilter. Fehlt der Katalog, aktualisiere die SCMDB-Quelle unter Einstellungen.':'Prüfe Besitzstatus, Kategorien oder deine Sammelziele.'}</p><button class="quiet-button" type="button" id="plannerReset">Filter zurücksetzen</button></div>`);
  $bp('activeMissionsOnly').onchange=e=>{if(all)bp.allActiveOnly=e.target.checked;else bp.activeOnly=e.target.checked;state.visibleCount=24;renderPlanner();syncFacetControls();};$bp('goalMissionsOnly').onchange=e=>{bp.goalsOnly=e.target.checked;state.visibleCount=24;renderPlanner();syncFacetControls();};
  if($bp('plannerReset'))$bp('plannerReset').onclick=()=>{if(all){bp.allActiveOnly=false;for(const key in MissionFilters.values)MissionFilters.values[key]='';}else{bp.activeOnly=true;bp.goalsOnly=false;}resetFilters();};
}
