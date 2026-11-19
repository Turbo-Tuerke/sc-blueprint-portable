"use strict";
/* Layout variants share the existing catalogue, ownership, collection and OBS actions. */
Object.assign(ArchiveLayouts, {
  theme: '', views: {}, selectedMission: '',
  setTheme(theme) {
    if(this.theme===theme&&this.active===['aurum','polaris','sentinel','meridian','halo','nocturne'].includes(theme))return;
    if(this.active){this.views[this.theme]=bp.view;this.setActive(false);}
    this.theme=theme;
    if(!['aurum','polaris','sentinel','meridian','halo','nocturne'].includes(theme))return;
    const configured=bp.config?.settings.appearance;
    bp.view=this.views[theme]||(configured?.theme===theme?configured.view:theme==='sentinel'?'missions':'gallery');
    const requested=new URLSearchParams(location.search).get('view');
    if(!this.hasStarted&&['gallery','table','missions','all-missions'].includes(requested)){bp.missionScope=requested==='all-missions'?'all':'blueprints';bp.view=requested==='all-missions'?'missions':requested;}
    this.hasStarted=true;this.setActive(true);
  },
  initVariants() {
    this.navLabels=[...document.querySelectorAll('.app-nav [data-nav]')].map(n=>[n,n.innerHTML]);
    document.querySelector('.app-nav').insertAdjacentHTML('beforeend',`<button class="variant-only" id="layoutCompareNav" type="button">${SCUI.icon('compare')}Vergleich</button>`);
    document.getElementById('layoutCompareNav').onclick=()=>{if(bp.compare.size<2){showToast('Wähle mindestens zwei Items für den Vergleich.');return;}showComparison();};
    document.getElementById('obsidianTools').insertAdjacentHTML('afterbegin',`<label class="variant-maker"><span class="sr-only">Hersteller</span><select id="layoutMaker"><option value="">Hersteller</option></select></label><button type="button" class="quiet-button variant-properties" id="layoutProperties">Eigenschaften ${SCUI.icon('chevron')}</button>`);
    document.getElementById('layoutMaker').onchange=e=>{state.filters.manufacturer=e.target.value;resetVisibleAndRender();syncFacetControls();};
    document.getElementById('layoutProperties').onclick=()=>document.getElementById('obsidianMore').click();
    document.getElementById('obsidianSearch').insertAdjacentHTML('afterend',`<div class="sentinel-quick variant-only" id="sentinelQuick"><button class="quiet-button" data-system="Stanton" type="button">${SCUI.icon('target')}Stanton</button><button class="quiet-button" data-system="Pyro" type="button">${SCUI.icon('target')}Pyro</button><button class="quiet-button" id="layoutShowPools" type="button">${SCUI.icon('grid')}Belohnungspools</button><button class="quiet-button" id="layoutActiveMissions" type="button" aria-pressed="true">${SCUI.icon('list')}Aktive Aufträge</button></div>`);
    document.querySelectorAll('[data-system]').forEach(b=>b.onclick=()=>{const s=b.dataset.system;if(state.filters.systems.has(s))state.filters.systems.delete(s);else state.filters.systems.add(s);resetVisibleAndRender();syncFacetControls();});
    document.getElementById('layoutActiveMissions').onclick=()=>{bp.activeOnly=!bp.activeOnly;resetVisibleAndRender();syncFacetControls();};
    document.getElementById('layoutShowPools').onclick=()=>{this.setTab('missions');if(bp.detailItem&&!elements.detailDialog.open)openDetails(bp.detailItem.id);this.tabs.querySelector('[aria-selected=true]')?.focus();};
    document.querySelector('.filter-console').insertAdjacentHTML('beforeend',`<div class="sentinel-status variant-only" role="group" aria-label="Auftragsauswahl"><button data-plan-filter="all" type="button">Alle</button><button data-plan-filter="open" type="button">Offen</button><button data-plan-filter="goals" type="button">Ziele</button></div>`);
    document.querySelectorAll('[data-plan-filter]').forEach(b=>b.onclick=()=>{const mode=b.dataset.planFilter;bp.goalsOnly=mode==='goals';state.filters.status=mode==='open'?'open':'all';elements.statusTabs.forEach(t=>{t.classList.toggle('is-active',t.dataset.status===state.filters.status);t.setAttribute('aria-pressed',String(t.dataset.status===state.filters.status));});resetVisibleAndRender();syncFacetControls();});
    document.querySelector('.obsidian-rail-bottom').insertAdjacentHTML('afterbegin',`<div class="variant-saved variant-only"><p>GESPEICHERTE ANSICHTEN</p><button type="button" id="layoutOpenItems">${SCUI.icon('target')}Offene Baupläne <span id="layoutOpenCount"></span></button><button type="button" id="layoutFavorites">${SCUI.icon('star')}Meine Favoriten <span id="layoutFavoriteCount"></span></button></div>`);
    document.getElementById('layoutOpenItems').onclick=()=>{resetFilters();state.filters.status='open';elements.statusTabs.forEach(t=>{t.classList.toggle('is-active',t.dataset.status==='open');t.setAttribute('aria-pressed',String(t.dataset.status==='open'));});setView('gallery');syncFacetControls();};
    document.getElementById('layoutFavorites').onclick=()=>{bp.only=bp.only==='favorites'?'all':'favorites';setView('gallery');syncFacetControls();};
    document.getElementById('obsidianRail').insertAdjacentHTML('beforeend',`<a class="variant-settings variant-only" href="/settings.html">${SCUI.icon('settings')}Design & Einstellungen</a>`);
    document.getElementById('obsidianCenter').insertAdjacentHTML('beforeend',`<section class="sentinel-goals variant-only" id="sentinelGoals" aria-label="Deine Einsatzziele"></section>`);
    document.getElementById('sentinelGoals').onclick=e=>{if(e.target.closest('[data-add-goal]')){setView('gallery');elements.searchInput.focus();return;}const b=e.target.closest('[data-target-item]');if(b)openDetails(Number(b.dataset.targetItem));};
    document.getElementById('compareDock').insertAdjacentHTML('afterbegin','<div class="layout-compare-items variant-only" id="layoutCompareItems"></div>');
    document.getElementById('layoutCompareItems').onclick=handleItemAction;
    elements.detailDialog.querySelector('.dialog-header>div').insertAdjacentHTML('beforeend','<p class="variant-dossier-caption variant-only" id="layoutDossierCaption"></p>');
    this.missionChoice=document.createElement('label');this.missionChoice.className='variant-mission-choice';this.missionChoice.innerHTML='<span class="sr-only">Fundweg auswählen</span><select id="layoutMissionChoice" aria-label="Fundweg auswählen"></select>';
    this.missionChoice.querySelector('select').onchange=e=>{this.selectedMission=e.target.value;if(bp.detailItem)openDetails(bp.detailItem.id);if(bp.view==='missions')renderTable();};
    document.getElementById('missionPlanner').addEventListener('click',e=>{const b=e.target.closest('[data-plan-select]');if(b){this.selectMission(b.dataset.planSelect);return;}if(e.target.closest('[data-plan-reset]'))resetFilters();if(e.target.closest('[data-plan-compare]'))this.compareMissions();if(e.target.closest('[data-plan-missing]')){state.filters.status='open';setView('gallery');syncFacetControls();}});
  },
  configureVariant() {
    const t=this.theme,isTactical=t==='sentinel';
    document.body.dataset.layout=t;
    const nav=document.querySelector('.app-nav');
    if(t!=='aurum')document.querySelector('.topbar').insertBefore(nav,document.querySelector('.topbar-actions'));
    this.navLabels.forEach(([b,label])=>{b.innerHTML=SCUI.icon({archive:'grid',missions:'list','all-missions':'list',goals:'target'}[b.dataset.nav])+ (isTactical&&b.dataset.nav==='goals'?'Einsatzziele':label);});
    const hero=document.querySelector('.obsidian-hero');
    document.getElementById('archiveTitle').textContent=t==='polaris'?'Alles im Blick.':isTactical?'Dein nächster Einsatz.':'Dein nächster Fund.';
    hero.querySelector('p').textContent=isTactical?'Finde Aufträge für deine fehlenden Baupläne.':'Baupläne entdecken. Sammlung vervollständigen.';
    document.querySelector('.obsidian-overline').innerHTML=`<span>${isTactical?'C / SENTINEL':'A / AURUM'}<i></i> DEIN BAUPLANARCHIV</span><span>STREAME GRÖẞER. SAMMLE WEITER.</span>`;
    elements.searchInput.placeholder=isTactical?'Baupläne oder Aufträge suchen …':'Baupläne durchsuchen';
    const tabs=isTactical?[['details','Bauplan'],['briefing','Auftrag'],['missions','Pools']]:t==='polaris'?[['details','Übersicht'],['missions','Fundwege'],['materials','Materialien']]:[['details','Details'],['missions','Aufträge'],['materials','Materialien']];
    this.tabs.innerHTML=tabs.map(([id,label])=>`<button type="button" role="tab" id="dossier-tab-${id}" data-dossier-tab="${id}" aria-controls="dossierPane">${label}</button>`).join('');
    if(!tabs.some(([id])=>id===this.tab))this.tab='missions';
    if(t==='polaris'||t==='sentinel')this.move(document.getElementById('compareDock'),document.getElementById('obsidianCenter'));
    this.pane.before(this.missionChoice);this.missionChoice.hidden=!isTactical;
    document.getElementById('obsidianMyCollection').querySelector('strong').textContent=isTactical?'SAMMLUNGSFORTSCHRITT':'Meine Sammlung';
  },
  clearVariant() {
    delete document.body.dataset.layout;this.missionChoice.remove();
    this.navLabels.forEach(([b,label])=>b.innerHTML=label);
    elements.statusTabs.forEach(b=>b.textContent={all:'Alle',done:'Erhalten',open:'Offen'}[b.dataset.status]);
  },
  syncVariant() {
    if(!this.active)return;
    document.body.dataset.archiveView=bp.view;
    const maker=document.getElementById('layoutMaker');
    const makers=[...new Set(state.items.map(i=>i.manufacturer).filter(v=>v&&v!=='—'))].sort((a,b)=>a.localeCompare(b,'de'));
    if(this.makersSignature!==makers.join('|')){maker.innerHTML='<option value="">Hersteller</option>'+makers.map(m=>`<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');this.makersSignature=makers.join('|');}
    maker.value=state.filters.manufacturer;
    document.getElementById('layoutOpenCount').textContent=state.items.filter(i=>!i.isDone).length;
    document.getElementById('layoutFavoriteCount').textContent=bp.collection.favorites.length;
    const counts={all:state.items.length,done:state.items.filter(i=>i.isDone).length};counts.open=counts.all-counts.done;
    elements.statusTabs.forEach(b=>b.textContent={all:'Alle',done:'Erhalten',open:'Offen'}[b.dataset.status]+(this.theme==='polaris'?` (${counts[b.dataset.status]})`:''));
    document.querySelectorAll('[data-system]').forEach(b=>{const selected=state.filters.systems.has(b.dataset.system);b.classList.toggle('is-active',selected);b.setAttribute('aria-pressed',String(selected));});
    const active=document.getElementById('layoutActiveMissions');active.classList.toggle('is-active',bp.activeOnly);active.setAttribute('aria-pressed',String(bp.activeOnly));
    document.querySelectorAll('[data-plan-filter]').forEach(b=>{const selected=b.dataset.planFilter===(bp.goalsOnly?'goals':state.filters.status==='open'?'open':'all');b.classList.toggle('is-active',selected);b.setAttribute('aria-pressed',String(selected));});
    this.renderGoals();this.syncCompare();
  },
  presentVariant(item) {
    document.getElementById('layoutDossierCaption').textContent=`${categoryLabel(item.subCategory)}${item.size==='—'?'':' · Größe '+item.size}`;
    this.missionChoice.hidden=this.theme!=='sentinel'||(item.scmdb?.missions?.length||0)<2;
  },
  detailMissions(item,missions) {
    if(this.theme!=='sentinel')return missions;
    const chosen=missions.find(m=>(m.id||m.debugName)===this.selectedMission)||missions[0];
    this.selectedMission=chosen?.id||chosen?.debugName||'';
    const select=this.missionChoice.querySelector('select');
    select.innerHTML=missions.map(m=>`<option value="${escapeHtml(m.id||m.debugName)}">${escapeHtml(m.title)}</option>`).join('');select.value=this.selectedMission;
    return chosen?[chosen]:[];
  },
  listHeading() {
    return '<div class="polaris-list-heading" aria-hidden="true"><span>NAME ↕</span><span>HERSTELLER</span><span>STATUS</span><span>FAVORIT</span><span>VERGLEICH</span></div>';
  },
  listRow(item) {
    const key=itemKey(item),fav=bp.collection.favorites.includes(key),comp=bp.compare.has(key);
    return `<article class="blueprint-card polaris-row ${key===this.selectedKey?'is-selected':''}" data-item-id="${item.id}">
      <button class="card-visual" data-action="detail" data-id="${item.id}" type="button" aria-label="Details: ${escapeHtml(item.name)}">${SCUI.icon(item.mainCategory)}<span class="image-note">${bp.config?.settings.sources.maxImages===0?'BILDER AUS':'BILD WIRD GEPRÜFT'}</span></button>
      <div class="polaris-row-name"><button class="card-title" data-action="detail" data-id="${item.id}" type="button" title="${escapeHtml(item.name)}">${escapeHtml(this.displayName(item))}</button><span><span class="row-category">${escapeHtml(categoryLabel(item.subCategory))}</span>${item.size==='—'?'':' · <span class="row-size">Größe '+escapeHtml(item.size)+'</span>'}${armorClassLabel(item)?` · <b class="armor-class">${armorClassLabel(item)}</b>`:''}</span></div>
      <span class="polaris-manufacturer" title="${escapeHtml(item.manufacturer)}">${escapeHtml(item.manufacturer)}</span>
      <span class="status-pill ${item.isDone?'done':'open'}">${item.isDone?'Erhalten':'Offen'}</span>
      <button class="quiet-button row-favorite ${fav?'is-active':''}" data-action="favorite" data-id="${item.id}" type="button" aria-label="${fav?'Favorit entfernen':'Als Favorit merken'}: ${escapeHtml(item.name)}" aria-pressed="${fav}">${SCUI.icon('star')}</button>
      <button class="row-compare ${comp?'is-active':''}" data-action="compare" data-id="${item.id}" type="button" aria-label="${comp?'Aus Vergleich entfernen':'Vergleichen'}: ${escapeHtml(item.name)}" aria-pressed="${comp}">${comp?'✓':''}</button>
    </article>`;
  },
  syncCompare() {
    const host=document.getElementById('layoutCompareItems');if(!host)return;
    host.innerHTML=state.items.filter(i=>bp.compare.has(itemKey(i))).map(i=>`<button type="button" class="quiet-button" data-action="compare" data-id="${i.id}" aria-label="${escapeHtml(i.name)} aus Vergleich entfernen">${SCUI.icon(i.mainCategory)}<span>${escapeHtml(this.displayName(i))}</span>×</button>`).join('');
  },
  renderGoals() {
    if(this.theme!=='sentinel')return;
    const goals=state.items.filter(i=>bp.collection.goals.includes(itemKey(i)));
    document.getElementById('sentinelGoals').innerHTML=`<header>DEINE ZIELE <span>${goals.length} / ∞</span></header><div>${goals.slice(0,6).map(i=>`<button class="goal-tile ${itemKey(i)===this.selectedKey?'is-selected':''}" type="button" data-target-item="${i.id}">${SCUI.icon(i.mainCategory)}<span><strong>${escapeHtml(this.displayName(i))}</strong><small>${escapeHtml(mainCategoryLabel(i.mainCategory))} · ${i.isDone?'Erhalten':'Offen'}</small></span>${SCUI.icon('star')}</button>`).join('')}<button class="goal-add" data-add-goal type="button"><strong>+</strong>Ziel hinzufügen</button></div>`;
  },
  selectMission(key) {
    const plan=planMissions().find(p=>(p.mission.id||p.mission.debugName)===key);if(!plan)return;
    this.selectedMission=key;
    const target=plan.missing.find(i=>bp.collection.goals.includes(itemKey(i)))||plan.missing[0];
    if(target)openDetails(target.id);
    this.setTab('missions');renderTable();
  },
  compareMissions() {
    const plans=planMissions().slice(0,3);if(!plans.length){showToast('Keine passenden Aufträge für den Vergleich.');return;}
    const rows=[['Belohnung',p=>p.mission.rewardUEC==null?'—':formatNumber(p.mission.rewardUEC)+' aUEC'],['System',p=>p.mission.systems?.join(' · ')||'—'],['Fehlende Baupläne',p=>p.missing.length],['Passende Ziele',p=>p.goals],['Unabhängige Pools',p=>p.pools.length],['Mindestrang',p=>p.mission.minStanding||'Ohne Rangvorgabe'],['Voraussetzungen',p=>p.mission.prerequisites?.join(' · ')||'Keine weiteren Angaben']];
    document.querySelector('#compareDialog h2').textContent='Aufträge vergleichen';
    document.getElementById('compareContent').innerHTML=`<p class="planner-note">Die ersten ${plans.length} passenden Fundwege aus deiner aktuellen Auswahl.</p><table class="compare-table"><thead><tr><th>Eigenschaft</th>${plans.map(p=>`<th>${escapeHtml(p.mission.title)}</th>`).join('')}</tr></thead><tbody>${rows.map(([name,fn])=>`<tr><td>${name}</td>${plans.map(p=>`<td>${escapeHtml(fn(p))}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="planner-note">Belohnungen und Voraussetzungen stammen aus SCMDB. Gleiche Pool-Chance bedeutet keine gleiche Chance auf ein bestimmtes Item.</p>`;
    document.getElementById('compareDialog').showModal();
  },
  renderTacticalPlanner() {
    const plans=planMissions(),visible=plans.slice(0,state.visibleCount);
    elements.pagination.hidden=plans.length<=state.visibleCount;elements.emptyState.hidden=true;
    elements.resultCount.textContent=`${plans.length} AUFTRÄGE`;
    const selected=visible.some(p=>(p.mission.id||p.mission.debugName)===this.selectedMission)?this.selectedMission:visible[0]?.mission.id||visible[0]?.mission.debugName;
    document.getElementById('missionPlanner').innerHTML=visible.map(({mission:m,pools,missing,goals},index)=>{
      const key=m.id||m.debugName,isSelected=key===selected;
      return `<article class="planner-card tactical-mission ${isSelected?'is-selected':''}" data-plan-id="${escapeHtml(key)}"><button type="button" class="mission-scenery" data-plan-select="${escapeHtml(key)}" aria-label="Auftrag ${escapeHtml(m.title)} auswählen"><img src="/assets/mission-landscape.svg" alt=""/><span>${isSelected?'AUSGEWÄHLT':String(index+1).padStart(2,'0')}</span><small>AUFTRAGSILLUSTRATION</small></button><div class="tactical-copy"><button type="button" class="tactical-title" data-plan-select="${escapeHtml(key)}">${escapeHtml(m.title)}</button><p class="tactical-contractor">${SCUI.icon('target')}${escapeHtml(m.contractor||'Unbekannter Auftraggeber')}</p><p class="tactical-description">${MissionText.render(m,'description')}</p><span class="tactical-system">${escapeHtml((m.systems||[]).join(' · ')||'System unbekannt')} · ${missing.length} fehlende Baupläne</span></div><div class="tactical-reward"><strong>${m.rewardUEC==null?'—':formatNumber(m.rewardUEC)+' aUEC'}</strong><span>Auftragsbelohnung</span><button class="quiet-button" type="button" data-plan-select="${escapeHtml(key)}">${SCUI.icon('grid')}${pools.length} Bauplan-Pools</button><small>${goals?goals+' passende Sammelziele':'Fundwege prüfen'}</small><button type="button" class="quiet-button tactical-obs" data-send-mission="${escapeHtml(key)}" data-title="${escapeHtml(m.title)}">${SCUI.icon('broadcast')}In OBS anzeigen</button></div><div class="tactical-steps"><span><b>1</b>Zugang prüfen</span><i>→</i><span><b>2</b>Auftrag im Spiel annehmen</span><i>→</i><span><b>3</b>${m.trigger==='accept'?'Bauplan prüfen':'Auftrag abschließen'}</span></div></article>`;
    }).join('')+(plans.length?'':'<div class="empty-state"><h3>Keine passenden Fundwege</h3><p>Prüfe Filter, Systeme und Sammelziele.</p><button class="quiet-button" data-plan-reset type="button">Filter zurücksetzen</button></div>');
    if(plans.length)document.querySelector('#missionPlanner .tactical-mission').insertAdjacentHTML('afterend',`<article class="tactical-alternatives"><img src="/assets/mission-landscape.svg" alt=""/><div><h3>Weitere Fundwege</h3><p>Verschiedene Auftraggeber</p><span>Entdecke passende Aufträge und vergleiche Belohnungen, Voraussetzungen und fehlende Baupläne.</span></div><div><button type="button" class="quiet-button" data-plan-missing>${SCUI.icon('target')}Deine fehlenden Baupläne</button><button type="button" class="quiet-button" data-plan-compare>${SCUI.icon('compare')}Aufträge vergleichen</button></div></article>`);
    if(this.media.matches&&visible.length&&!visible.some(p=>(p.mission.id||p.mission.debugName)===this.selectedMission)){
      this.selectedMission=selected;const target=visible[0].missing.find(i=>bp.collection.goals.includes(itemKey(i)))||visible[0].missing[0];if(target)openDetails(target.id);
    }
  }
});
