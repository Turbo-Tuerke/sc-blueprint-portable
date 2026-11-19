"use strict";

/* Shared archive workspace. Existing controls and data renderers are moved, never cloned. */
window.ArchiveLayouts = {
  get desktop(){return this.media.matches&&this.theme!=='halo';},
  active: false, ready: false, anchors: [], detailAnchors: [], selectedKey: '', tab: 'missions',
  media: window.matchMedia('(min-width: 1160px)'),
  mount() {
    if (this.ready) return;
    this.ready = true;
    elements.detailActions=document.getElementById('detailActions');
    const shell = document.querySelector('.app-shell');
    shell.insertAdjacentHTML('afterbegin', '<div class="obsidian-overline"><span>01 / <b>OBSIDIAN</b><i></i> DEIN BAUPLANARCHIV</span><span>Galerie · Dossier · OBS</span></div>');
    document.getElementById('top').insertAdjacentHTML('afterbegin', `
      <div class="obsidian-workspace" id="obsidianWorkspace" hidden>
        <aside class="obsidian-rail" id="obsidianRail" aria-label="Kategorien und Sammlung">
          <div id="obsidianCategories"></div>
          <div class="obsidian-rail-bottom">
            <button type="button" class="obsidian-collection" id="obsidianMyCollection"><span>${SCUI.icon('heart')}</span><strong>Meine Sammlung</strong><span><b id="obsidianCollectionCount">—</b><i class="gold-track"><i id="obsidianCollectionBar"></i></i></span></button>
            <nav id="obsidianNav" aria-label="Archivnavigation"></nav>
            <details class="obsidian-more"><summary>Datenstatus &amp; Quellen</summary><div id="obsidianTelemetry"></div></details>
            <p class="obsidian-motto">MEHR ALS SPIELEN.<br> EINE SAMMLUNG.</p>
          </div>
        </aside>
        <section class="obsidian-center" id="obsidianCenter" aria-label="Baupläne durchsuchen">
          <header class="obsidian-hero"><div id="obsidianHeading"></div><p>Baupläne entdecken. Sammlung vervollständigen.</p>
            <div class="obsidian-totals"><span><b id="obsidianDone">—</b> / <span id="obsidianTotal">—</span> erhalten</span><span id="obsidianPercent">—</span><span><span id="obsidianOpen">—</span> offen</span></div>
            <div class="gold-track obsidian-progress" id="obsidianProgress" role="progressbar" aria-label="Gesamtfortschritt" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
          </header>
          <div id="obsidianSearch"></div>
          <div class="obsidian-tools" id="obsidianTools">
            <button class="quiet-button" type="button" id="obsidianSize">Größe <span>0–6</span> ${SCUI.icon('chevron')}</button>
            <label class="obsidian-armor"><span class="sr-only">Rüstungsklasse</span><select id="obsidianArmor"><option value="">Rüstungsklasse</option><option value="light">Leicht</option><option value="medium">Mittel</option><option value="heavy">Schwer</option></select></label>
            <div id="obsidianPreset"></div><button class="quiet-button" type="button" id="obsidianMore" aria-expanded="false" aria-controls="collectionToolbar" title="Favoriten, Ziele und Filtervorlagen">${SCUI.icon('sliders')}<span class="sr-only">Weitere Sammelfunktionen</span></button>
            <span id="obsidianResults"></span><div id="obsidianViews"></div>
          </div>
          <div id="obsidianSecondary"></div><div id="obsidianFacets"></div><div id="obsidianInventory"></div>
        </section>
        <div class="obsidian-dock" id="obsidianDock"></div>
      </div>
`);
    const dialog = elements.detailDialog;
    dialog.insertAdjacentHTML('beforeend', '<span class="sr-only" id="dossierModeHint">Dossier des ausgewählten Bauplans</span>');
    this.tabs = document.createElement('div');
    this.tabs.className = 'dossier-tabs'; this.tabs.setAttribute('role', 'tablist'); this.tabs.setAttribute('aria-label', 'Dossierbereiche');
    this.tabs.innerHTML = ['details','missions','materials'].map((tab,i) => `<button type="button" role="tab" id="dossier-tab-${tab}" data-dossier-tab="${tab}" aria-controls="dossierPane" aria-selected="${tab===this.tab}" tabindex="${tab===this.tab?'0':'-1'}">${['Details','Aufträge','Materialien'][i]}</button>`).join('');
    this.pane = document.createElement('div');this.pane.id='dossierPane';this.pane.className='dossier-pane';this.pane.setAttribute('role','tabpanel');this.pane.tabIndex=0;
    this.tabs.addEventListener('click', e => {const t=e.target.closest('[data-dossier-tab]');if(t)this.setTab(t.dataset.dossierTab);});
    this.tabs.addEventListener('keydown', e => {if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...this.tabs.children];let idx=tabs.indexOf(document.activeElement);idx=e.key==='Home'?0:e.key==='End'?tabs.length-1:(idx+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;this.setTab(tabs[idx].dataset.dossierTab);tabs[idx].focus();});
    this.emptyRecipe=document.createElement('p');this.emptyRecipe.className='dossier-empty-recipe';this.emptyRecipe.textContent='Für diesen Bauplan sind im aktuellen Datenstand keine Materialien hinterlegt.';
    this.favorite=document.createElement('button');this.favorite.type='button';this.favorite.className='dossier-favorite quiet-button';this.favorite.dataset.action='favorite';this.favorite.innerHTML=SCUI.icon('star');this.favorite.addEventListener('click',handleItemAction);
    this.media.addEventListener('change',()=>{if(this.active){dialog.close();if(this.desktop){const item=state.items.find(i=>itemKey(i)===this.selectedKey);if(item)openDetails(item.id);else this.sync();}}});
    document.addEventListener('sc:appearance',()=>this.setTheme(document.documentElement.dataset.theme));
    document.getElementById('obsidianMyCollection').onclick=()=>{bp.only='all';setView('gallery');resetFilters();};
    document.getElementById('obsidianMore').onclick=()=>{const button=document.getElementById('obsidianMore');const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));document.getElementById('collectionToolbar').classList.toggle('obsidian-expanded',open);if(elements.facetBody.hidden===open)elements.facetToggle.click();};
    document.getElementById('obsidianSize').onclick=()=>{if(elements.facetBody.hidden)elements.facetToggle.click();document.querySelector('.facet-size').scrollIntoView({block:'nearest',behavior:'smooth'});(document.getElementById('filterSizeFrom')||elements.sizeMin).focus();};
    document.getElementById('obsidianArmor').onchange=e=>{state.filters.armorClass.clear();if(e.target.value){state.filters.types.add('fpsgear:armour');state.filters.armorClass.add(e.target.value);}syncFacetControls();resetVisibleAndRender();};
    this.initVariants();this.setTheme(document.documentElement.dataset.theme);
  },
  move(node, parent, anchors=this.anchors) {
    const marker=document.createComment('obsidian-position');node.before(marker);anchors.push([node,marker]);parent.append(node);
  },
  restore(anchors) {for(const [node,marker] of anchors.reverse()){marker.replaceWith(node);}anchors.length=0;},
  setActive(active) {
    if(!this.ready||active===this.active)return;
    window.AllMissionView?.restore();
    this.active=active;document.body.classList.toggle('reference-layout',active);
    document.getElementById('obsidianWorkspace').hidden=!active;
    const dialog=elements.detailDialog;dialog.close();
    if(active){
      this.originalSearchPlaceholder=elements.searchInput.placeholder;elements.searchInput.placeholder='Baupläne durchsuchen';
      const into=(sel,id)=>this.move(document.querySelector(sel),document.getElementById(id));
      into('.category-panel','obsidianCategories');into('.filter-console','obsidianSearch');into('.view-switch','obsidianViews');into('#resultCount','obsidianResults');into('#savedFilters','obsidianPreset');into('.collection-toolbar','obsidianSecondary');into('.facet-console','obsidianFacets');into('.inventory-panel','obsidianInventory');into('.app-nav','obsidianNav');into('.telemetry-panel','obsidianTelemetry');
      this.originalTitle=elements.titleCopy||document.getElementById('archiveTitle').textContent;
      into('#archiveTitle','obsidianHeading');document.getElementById('archiveTitle').textContent='Dein nächster Fund.';
      into('#detailDialog','obsidianDock');
      const ds=dialog.querySelector('.dialog-shell');this.move(elements.detailGallery,ds,this.detailAnchors);ds.append(this.tabs,this.pane);
      for(const id of ['detailGrid','detailLore','detailDescription','detailRecipe','detailAcquisition'])this.move(document.getElementById(id),this.pane,this.detailAnchors);
      this.pane.append(this.emptyRecipe);dialog.querySelector('.dialog-header').append(this.favorite);
      this.configureVariant();this.setTab(this.tab);this.sync();
    }else{
      elements.searchInput.placeholder=this.originalSearchPlaceholder;
      this.restore(this.detailAnchors);this.tabs.remove();this.pane.remove();this.favorite.remove();this.restore(this.anchors);this.clearVariant();
      document.getElementById('archiveTitle').textContent=this.originalTitle;
      dialog.removeAttribute('data-tab');
    }
    if(state.items.length){renderTable();if(active&&bp.detailItem&&this.desktop)openDetails(bp.detailItem.id);}
  },
  setTab(tab) {
    this.tab=tab;elements.detailDialog.dataset.tab=tab;this.pane?.setAttribute('aria-labelledby','dossier-tab-'+tab);
    if(this.theme==='sentinel'&&tab==='briefing')elements.detailDialog.querySelectorAll('.obsidian-mission-full').forEach(e=>e.open=true);
    this.tabs?.querySelectorAll('[data-dossier-tab]').forEach(b=>{const selected=b.dataset.dossierTab===tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
    if(this.pane)this.pane.scrollTop=0;
  },
  present(item, userInitiated=true) {
    this.selectedKey=itemKey(item);
    if(this.desktop){if(!elements.detailDialog.open)elements.detailDialog.show();}
    else if(userInitiated&&!elements.detailDialog.open)elements.detailDialog.showModal();
    this.detailActions(item);this.setTab(this.tab);this.syncSelection();this.presentVariant(item);
    elements.detailTitle.textContent=this.displayName(item);elements.detailTitle.title=item.name;elements.detailTitle.setAttribute('aria-label',item.name);
    this.emptyRecipe.hidden=!elements.detailRecipe.hidden;
  },
  detailActions(item) {
    if(!this.active)return;
    const fav=bp.collection.favorites.includes(itemKey(item));
    this.favorite.dataset.id=item.id;this.favorite.classList.toggle('is-active',fav);this.favorite.setAttribute('aria-pressed',String(fav));this.favorite.setAttribute('aria-label',fav?'Favorit entfernen':'Als Favorit merken');
    const goal=elements.detailActions.querySelector('[data-action=goal]');if(goal)goal.innerHTML=SCUI.icon('target')+(bp.collection.goals.includes(itemKey(item))?'Sammelziel gesetzt':'Als Ziel markieren');
    this.syncSelection();
  },
  sync() {
    if(!this.active)return;
    const total=state.items.length,done=state.items.filter(i=>i.isDone).length,percent=total?done/total*100:0;
    for(const [id,value] of Object.entries({obsidianDone:formatNumber(done),obsidianTotal:formatNumber(total),obsidianOpen:formatNumber(total-done),obsidianPercent:formatDecimal(percent)+' %',obsidianCollectionCount:`${formatNumber(done)} / ${formatNumber(total)}`}))document.getElementById(id).textContent=value;
    document.querySelector('#obsidianProgress>i').style.width=percent+'%';document.getElementById('obsidianProgress').setAttribute('aria-valuenow',percent.toFixed(1));document.getElementById('obsidianCollectionBar').style.width=percent+'%';
    document.querySelector('#obsidianSize span').textContent=state.filters.sizeMin+'–'+state.filters.sizeMax;document.getElementById('obsidianArmor').value=state.filters.armorClass.size===1?[...state.filters.armorClass][0]:'';
    elements.resultCount.title=elements.resultCount.textContent;
    if(bp.view!=='missions')elements.resultCount.textContent=formatNumber(state.filtered.length)+' Ergebnisse';
    this.syncSelection();this.syncVariant();
    if(!(bp.view==='missions'&&bp.missionScope==='all')&&!bp.detailItem&&!window.LiveDossier?.active&&state.filtered.length&&this.desktop){const next=state.filtered.find(i=>!i.isDone&&bp.collection.goals.includes(itemKey(i)))||state.filtered.find(i=>!i.isDone&&i.missionCount)||state.filtered[0];openDetails(next.id);}
  },
  syncSelection() {
    if(!this.active)return;
    document.querySelectorAll('.blueprint-card').forEach(card=>{const item=state.items.find(i=>i.id===Number(card.dataset.itemId));const selected=item&&itemKey(item)===this.selectedKey;card.classList.toggle('is-selected',Boolean(selected));const button=card.querySelector('.card-visual');if(button)button.setAttribute('aria-pressed',String(Boolean(selected)));});
  },
  missionCard(mission,index) {
    const definition=getMissionDefinition(mission),m=definition?{...mission,...definition}:mission;
    const pools=getMissionRewardPools(mission,definition),translated=new Set(m.translation?.translatedFields||[]);
    const language=translated.has('title')&&translated.has('description')?'DEUTSCH':translated.has('description')?'BESCHREIBUNG DE':translated.size?'TEILWEISE DE':'ORIGINAL';
    const url=safeExternalUrl(m.scmdbUrl,new Set(['scmdb.net']))||'https://scmdb.net/?page=missions';
    const description=m.description||'Für diesen Auftrag ist keine Beschreibung hinterlegt.';
    const currentKey=bp.detailItem&&itemKey(bp.detailItem);
    const relevant=pool=>(pool.items||[]).some(r=>{const item=resolveRewardItem(r);return item&&itemKey(item)===currentKey;});
    const displayPools=this.theme==='polaris'?[...pools].sort((a,b)=>Number(relevant(b))-Number(relevant(a))):pools;
    const cards=displayPools.map((pool,pi)=>{
      const kinds=new Set((pool.items||[]).map(resolveRewardItem).filter(Boolean).map(i=>i.mainCategory));
      const label=kinds.size===1&&kinds.has('vehicle')?'Komponenten':kinds.size&&!kinds.has('vehicle')?'Ausrüstung':'Bauplan-Pool '+(pi+1);
      let html=renderRewardPool(pool);
      const original=escapeHtml(pool.name||pool.id||'Bauplan-Pool');
      html=html.replace(`<strong>${original}</strong>`,`<strong title="${original}">${label}</strong>`);
      return html;
    }).join('');
    return `<section class="obsidian-mission-block">
      <article class="mission-card"><div class="obsidian-mission-title"><span class="mission-emblem">${SCUI.icon('target')}</span><div><h4>${MissionText.render(m,'title')}</h4><p>SCMDB · ${translated.has('description')?'Deutsche Übersetzung':'Originalbeschreibung'}</p></div></div>
      <p class="obsidian-mission-excerpt">${escapeHtml(description.replace(/^EINZELHEITEN ZUM AUFTRAG\s*/i,''))}</p>
      ${ObsDossier.button(m)}<details class="obsidian-mission-full"><summary>Auftragsbeschreibung &amp; Quelle</summary><span class="mission-language">${language}</span><p>${MissionText.render(m)}</p>${MissionText.cargo(m)}<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Auftrag in SCMDB öffnen ↗</a>
      <details class="obsidian-mission-facts"><summary>Voraussetzungen &amp; Chancen</summary><dl><div><dt>Auftraggeber</dt><dd>${escapeHtml(m.contractor||'Unbekannt')}</dd></div><div><dt>Status</dt><dd>${m.active?'Aktiv':'Event / inaktiv'} · ${m.illegal?'Illegal':'Legal'}</dd></div><div><dt>System</dt><dd>${escapeHtml(m.systems?.join(' · ')||'—')}</dd></div><div><dt>Mindestrang</dt><dd>${escapeHtml(m.minStanding||'Ohne Rangvorgabe')}</dd></div><div><dt>Voraussetzungen</dt><dd>${escapeHtml(m.prerequisites?.join(' · ')||'Keine weiteren Angaben')}</dd></div><div><dt>Zeitlimit</dt><dd>${m.timeToCompleteMinutes==null?'—':formatNumber(m.timeToCompleteMinutes)+' Min'}</dd></div><div><dt>Item-Chance · Basis</dt><dd>${formatPercent(mission.combinedChancePercent)} · ${mission.trigger==='accept'?'Bei Annahme':'Bei Abschluss'}</dd></div></dl>${m.titleOriginal?`<p>Original: ${escapeHtml(m.titleOriginal)}</p>`:''}</details></details>
      <div class="mission-payout-card"><span>Belohnung</span><strong>${m.rewardUEC==null?'Unbekannt':formatNumber(m.rewardUEC)+' aUEC'}</strong></div></article>
      <div class="obsidian-pool-heading"><span>Bauplan-Belohnungen</span><button class="quiet-button" type="button" data-detail-mission="${escapeHtml(mission.id||mission.debugName)}" data-title="${escapeHtml(m.title)}" title="Diesen Auftrag in OBS anzeigen">${SCUI.icon('broadcast')}<span class="sr-only">Auftrag in OBS anzeigen</span></button></div>
      <div class="reward-pool-list">${cards}</div><p class="obsidian-pool-note">Jeder Pool wird unabhängig ausgewertet. Vollständig gesammelte Pools liefern keine weiteren Baupläne. Pool-Chance ≠ Chance auf ein bestimmtes Item.</p></section>`;
  },
  card(item) {
    if(this.theme==='polaris')return this.listRow(item);
    const key=itemKey(item),fav=bp.collection.favorites.includes(key),goal=bp.collection.goals.includes(key),comp=bp.compare.has(key);
    const armor=armorClassLabel(item)||item.scmdb?.profile?.componentClass||'';
    return `<article class="blueprint-card obsidian-card ${key===this.selectedKey?'is-selected':''}" data-item-id="${item.id}">
      <button class="card-visual" data-action="detail" data-id="${item.id}" type="button" aria-label="Details: ${escapeHtml(item.name)}" aria-pressed="${key===this.selectedKey}">${SCUI.icon(item.mainCategory)}<span class="image-note">${bp.config?.settings.sources.maxImages===0?'BILDER AUSGEBLENDET':'BILD WIRD GEPRÜFT'}</span></button>
      <div class="card-body"><button class="card-title" data-action="detail" data-id="${item.id}" type="button" title="${escapeHtml(item.name)}" aria-label="${escapeHtml(item.name)}">${escapeHtml(this.displayName(item))}</button>
      <div class="obsidian-card-meta"><span class="status-pill ${item.isDone?'done':'open'}"><i>${item.isDone?'✓':'○'}</i>${item.isDone?'Erhalten':'Offen'}</span>${item.size==='—'?'':`<span>Größe ${escapeHtml(item.size)}</span>`}${armor?`<span>${escapeHtml(armor)}</span>`:''}<span title="${escapeHtml(item.manufacturer)}">${escapeHtml(item.manufacturer)}</span></div>
      <div class="obsidian-card-buttons"><button class="quiet-button ${fav?'is-active':''}" data-action="favorite" data-id="${item.id}" aria-label="${fav?'Favorit entfernen':'Als Favorit merken'}: ${escapeHtml(item.name)}" aria-pressed="${fav}" type="button">${SCUI.icon('star')}</button><button class="quiet-button card-detail-link" data-action="detail" data-id="${item.id}" type="button">Details</button></div>
      <div class="obsidian-card-extras"><button class="quiet-button ${goal?'is-active':''}" data-action="goal" data-id="${item.id}" aria-label="Sammelziel ${goal?'entfernen':'setzen'}" aria-pressed="${goal}" type="button">${SCUI.icon('target')}</button><button class="quiet-button ${comp?'is-active':''}" data-action="compare" data-id="${item.id}" aria-label="${comp?'Aus Vergleich entfernen':'Vergleichen'}" aria-pressed="${comp}" type="button">${SCUI.icon('compare')}</button><button class="quiet-button" data-action="obs" data-id="${item.id}" aria-label="In OBS anzeigen" type="button">${SCUI.icon('broadcast')}</button></div></div></article>`;
  },
  displayName(item) {
    return SCUI.itemLabel(item.name);
  }
};
