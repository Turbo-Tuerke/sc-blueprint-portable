"use strict";
window.MissionFilters={values:{contractor:'',system:'',type:'',legality:'',standing:'',prerequisite:''},collectionQuery:'',missionQuery:'',collectionFolded:true,
 fields:[['contractor','Auftraggeber'],['system','Region / System'],['type','Auftragsart'],['legality','Legal / Illegal'],['standing','Mindestrang'],['prerequisite','Voraussetzung']],
 mount(){
  const body=elements.facetBody;this.collectionNodes=[...body.children];
  this.panel=document.createElement('section');this.panel.id='missionFilterPanel';this.panel.className='mission-filter-panel';
  this.panel.innerHTML='<p class="mission-filter-help">Aufträge gezielt auswählen. Die Suche findet auch Prämien, etwa 1.192.750 oder 1192750 aUEC.</p><div class="mission-filter-grid">'+this.fields.map(([key,label])=>`<label>${label}<select id="missionFilter-${key}" data-mission-filter="${key}"><option value="">Alle</option></select></label>`).join('')+'</div><button type="button" class="quiet-button" id="resetMissionFilters">Auftragsfilter zurücksetzen</button>';
  body.prepend(this.panel);this.panel.onchange=e=>{const key=e.target.dataset.missionFilter;if(key){this.values[key]=e.target.value;resetVisibleAndRender();}};
  document.getElementById('resetMissionFilters').onclick=()=>{for(const key in this.values)this.values[key]='';state.filters.query='';elements.searchInput.value='';resetVisibleAndRender();};
  this.originalPlaceholder=elements.searchInput.placeholder;this.resetButton=elements.resetFiltersButton;this.sync();
 },
 switchView(next){const was=bp.view==='missions',will=next==='missions';if(was===will)return;
  if(will){this.collectionQuery=state.filters.query;this.collectionFolded=elements.facetBody.hidden;state.filters.query=this.missionQuery;}
  else{this.missionQuery=state.filters.query;state.filters.query=this.collectionQuery;elements.facetBody.hidden=this.collectionFolded;elements.facetToggle.setAttribute('aria-expanded',String(!this.collectionFolded));elements.facetToggle.textContent=this.collectionFolded?'Filter ausklappen':'Filter einklappen';}
  elements.searchInput.value=state.filters.query;
 },
 lists(m){return {contractor:[m.contractor],system:[...(m.systems||[]),m.region],type:[m.missionType||m.category],legality:[m.illegal?'Illegal':'Legal'],standing:[m.minStanding||'Ohne Rangvorgabe'],prerequisite:m.prerequisites||[]};},
 matches(m,query=state.filters.query){
  const lists=this.lists(m);if(Object.entries(this.values).some(([key,value])=>value&&!lists[key].includes(value)))return false;
  const q=normalize(query);if(!q)return true;
  const numeric=q.replace(/\s*(?:auec|alpha\s*uec|uec)\s*$/i,'').replace(/[.\s\u00a0\u202f]/g,'');
  if(/^\d+$/.test(numeric))return m.rewardUEC!=null&&Number(numeric)===Number(m.rewardUEC);
  return normalize(missionSearchText(m)).includes(q);
 },
 sync(){if(!this.panel)return;const active=bp.view==='missions';this.panel.hidden=!active;elements.facetBody.classList.toggle('mission-mode',active);document.body.classList.toggle('mission-page',active);
  for(const node of this.collectionNodes){if(active){if(!node.hasAttribute('data-collection-hidden'))node.dataset.collectionHidden=String(node.hidden);node.hidden=true;}else if(node.hasAttribute('data-collection-hidden')){node.hidden=node.dataset.collectionHidden==='true';delete node.dataset.collectionHidden;}}
  document.getElementById('facetTitle').textContent=active?'Auftraggeber, Region und Voraussetzungen':'Typ, Größe und Eigenschaften';
  elements.searchInput.placeholder=active?'Aufträge oder Prämie in aUEC durchsuchen':this.originalPlaceholder;
  this.resetButton.hidden=active;
  if(!active)return;
  const templates=[...(state.scmdb?.missions||[]),...state.items.flatMap(i=>i.scmdb?.missions||[])];
  for(const [key] of this.fields){const select=document.getElementById('missionFilter-'+key),values=[...new Set(templates.flatMap(m=>this.lists({...m,...(getMissionDefinition(m)||{})})[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
   const signature=JSON.stringify(values);if(select.dataset.options!==signature){select.innerHTML='<option value="">Alle</option>'+values.map(v=>`<option value="${SCUI.escape(v)}">${SCUI.escape(v)}</option>`).join('');select.dataset.options=signature;}select.value=this.values[key];
  }
  const chips=Object.entries(this.values).filter(([,value])=>value).map(([key,value])=>`<button type="button" data-clear-mission="${key}">${SCUI.escape(value)} ×</button>`);
  if(state.filters.query)chips.push(`<span>Suche: ${SCUI.escape(state.filters.query)}</span>`);
  const target=document.getElementById('filterActiveChips');target.innerHTML=chips.join('')||'<span>Alle Aufträge · keine zusätzlichen Einschränkungen</span>';target.onclick=e=>{const b=e.target.closest('[data-clear-mission]');if(b){this.values[b.dataset.clearMission]='';resetVisibleAndRender();}};
  const displayed=elements.resultCount.textContent.match(/^([\d.]+)/)?.[1]||formatNumber(planMissions().length);
  document.getElementById('filterSelectionCount').innerHTML=`<b>${SCUI.escape(displayed)}</b><span>Aufträge</span>`;
 }
};
