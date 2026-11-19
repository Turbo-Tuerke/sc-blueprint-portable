"use strict";
/* One set of filter controls and state; only their presentation changes. */
window.FilterLayouts={
  names:{compact:'01 · Obsidian Compact',precision:'08 · Forge Precision',focus:'09 · Atlas Focus'},
  mount(){
    this.root=document.querySelector('.facet-console');if(!this.root)return;
    this.root.classList.add('filter-deck');
    const header=this.root.querySelector('.facet-header');
    header.append(elements.resetFiltersButton);
    header.insertAdjacentHTML('beforeend','<a class="filter-design-link" href="/settings.html#filterDesign" title="Filterdesign unabhängig auswählen">Design ändern ↗</a>');
    const types=this.root.querySelector('.facet-types'),ship=types.querySelector('.ship-filter-list');
    this.ship=document.createElement('details');this.ship.className='filter-components';
    this.ship.innerHTML='<summary>Vehikel-Komponenten <span>12 Typen</span></summary>';
    const heading=ship.previousElementSibling;heading.remove();ship.before(this.ship);this.ship.append(ship);
    const fps=types.querySelector('.filter-chip-list');
    const vehicle=document.createElement('button');vehicle.type='button';vehicle.className='filter-chip';vehicle.id='vehicleTypeButton';vehicle.innerHTML=SCUI.icon('vehicle')+' Vehikel';vehicle.setAttribute('aria-pressed','false');
    vehicle.onclick=()=>{const keys=elements.typeFilterButtons.map(b=>b.dataset.typeFilter).filter(k=>k.startsWith('vehiclegear:'));const all=keys.every(k=>state.filters.types.has(k));keys.forEach(k=>all?state.filters.types.delete(k):state.filters.types.add(k));clearHiddenDynamicFacets();syncFacetControls();resetVisibleAndRender();};fps.append(vehicle);
    this.root.querySelectorAll('.facet-block>.facet-title-row h4').forEach((h,i)=>h.dataset.step=String(i+1).padStart(2,'0'));
    for(const group of this.root.querySelectorAll('.dynamic-filter-group')){
      const headings=group.querySelectorAll('h5');if(!headings.length)continue;
      const heading=[...headings].find(h=>/Untertyp/i.test(h.textContent));if(!heading)continue;
      const list=heading.nextElementSibling,details=document.createElement('details');details.className='filter-subtypes';details.innerHTML='<summary>Weitere Untertypen</summary>';heading.before(details);heading.remove();details.append(list);
    }
    this.root.querySelector('.facet-size').insertAdjacentHTML('beforeend','<div class="filter-size-inputs"><label>Von <select id="filterSizeFrom" aria-label="Größe von"></select></label><span>–</span><label>Bis <select id="filterSizeTo" aria-label="Größe bis"></select></label></div>');
    for(const [id,input,changed] of [['filterSizeFrom',elements.sizeMin,'min'],['filterSizeTo',elements.sizeMax,'max']]){
      const select=document.getElementById(id);select.innerHTML=Array.from({length:7},(_,n)=>`<option value="${n}">${n}</option>`).join('');
      select.onchange=()=>{input.value=select.value;updateSizeRange(changed);};
    }
    this.root.insertAdjacentHTML('beforeend','<footer class="filter-selection"><div><span class="filter-selection-label">DEINE AUSWAHL</span><div id="filterActiveChips" class="filter-active-chips"></div></div><output id="filterSelectionCount" aria-live="polite"></output></footer>');
    document.getElementById('filterActiveChips').onclick=e=>{const b=e.target.closest('[data-remove-filter]');if(!b)return;const field=b.dataset.removeFilter,value=b.dataset.value;if(field==='categories')state.filters.categories=new Set(ALL_CATEGORY_KEYS);else if(field==='size'){state.filters.sizeMin=0;state.filters.sizeMax=6;}else if(field==='collection')bp.only='all';else if(field==='query'){state.filters.query='';elements.searchInput.value='';}else if(field==='status'){state.filters.status='all';elements.statusTabs.forEach(b=>{b.classList.toggle('is-active',b.dataset.status==='all');b.setAttribute('aria-pressed',String(b.dataset.status==='all'));});}else if(state.filters[field] instanceof Set)state.filters[field].delete(value);else if(field==='sort'){state.filters.sort='name';elements.sortSelect.value='name';}else if(field==='goalsOnly')bp.goalsOnly=false;else if(field==='activeOnly')bp.activeOnly=true;else state.filters[field]='';clearHiddenDynamicFacets();syncCategoryControls();syncFacetControls();resetVisibleAndRender();};
    const folded=!(bp.view==='missions'&&bp.missionScope==='all');elements.facetBody.hidden=folded;elements.facetToggle.setAttribute('aria-expanded',String(!folded));elements.facetToggle.textContent=folded?'Filter ausklappen':'Filter einklappen';
    this.collectionChipClick=document.getElementById('filterActiveChips').onclick;
    MissionFilters.mount();
    this.apply(bp.config?.settings.appearance||{});
    document.addEventListener('sc:appearance',e=>this.apply(e.detail));
  },
  apply(a){
    if(!this.root)return;const layout=Object.hasOwn(this.names,a.filterLayout)?a.filterLayout:'compact';
    this.root.dataset.filterLayout=layout;this.root.querySelector('.eyebrow').textContent=this.names[layout];
    if(this.layout!==layout)this.ship.open=layout==='precision';this.layout=layout;
    this.sync();
  },
  sync(){
    if(!this.root)return;
    this.root.hidden=bp.view==='missions'&&bp.missionScope!=='all'&&bp.config?.settings.appearance.missionFiltersVisible===false;
    MissionFilters.sync();if(bp.view==='missions')return;
    document.getElementById('filterActiveChips').onclick=this.collectionChipClick;
    document.getElementById('filterSizeFrom').value=state.filters.sizeMin;document.getElementById('filterSizeTo').value=state.filters.sizeMax;
    const vehicle=elements.typeFilterButtons.filter(b=>b.dataset.typeFilter.startsWith('vehiclegear:'));const selected=vehicle.filter(b=>state.filters.types.has(b.dataset.typeFilter)).length;
    document.getElementById('vehicleTypeButton').classList.toggle('is-active',selected>0);document.getElementById('vehicleTypeButton').setAttribute('aria-pressed',String(selected>0));
    this.ship.querySelector('summary span').textContent=selected?selected+' gewählt':'12 Typen';
    const chips=[];const add=(field,value,label)=>chips.push(`<button type="button" data-remove-filter="${field}" data-value="${SCUI.escape(value)}" aria-label="Filter entfernen: ${SCUI.escape(label)}">${SCUI.escape(label)} <span aria-hidden="true">×</span></button>`);
    for(const field of ['types',...FACET_NAMES,'systems'])for(const value of state.filters[field]){
      const label=field==='types'?elements.typeFilterButtons.find(b=>b.dataset.typeFilter===value)?.textContent.trim():elements.facetButtons.find(b=>b.dataset.facet===field&&b.dataset.value===value)?.textContent.trim();add(field,value,label||value);
    }
    if(state.filters.sizeMin!==0||state.filters.sizeMax!==6)add('size','',`Größe ${state.filters.sizeMin}–${state.filters.sizeMax}`);
    if(state.filters.query)add('query','','Suche: '+state.filters.query);
    if(state.filters.status!=='all')add('status','',state.filters.status==='done'?'Erhalten':'Offen');
    if(state.filters.manufacturer)add('manufacturer','',state.filters.manufacturer);
    if(state.filters.categories.size!==ALL_CATEGORY_KEYS.length)add('categories','',state.filters.categories.size+' Unterkategorien');
    if(state.filters.sort!=='name')add('sort','','Sortierung');
    if(bp.only!=='all')add('collection','',bp.only==='goals'?'Sammelziele':'Favoriten');
    if(bp.goalsOnly)add('goalsOnly','','Aufträge für Ziele');
    if(!bp.activeOnly)add('activeOnly','','Inaktive Aufträge');
    document.getElementById('filterActiveChips').innerHTML=chips.join('')||'<span class="filter-unrestricted">Alle Baupläne · keine Einschränkung</span>';
    document.getElementById('filterSelectionCount').innerHTML=`<b>${formatNumber(state.filtered.length)}</b><span>Ergebnisse</span>`;
  }
};
