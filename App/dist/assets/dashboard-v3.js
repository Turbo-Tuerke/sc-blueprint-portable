"use strict";
const V3_DESIGNS={meridian:{title:'Jeder Fund zählt.',subtitle:'Dein persönliches Observatorium. Entdecken. Sammeln. Weiterziehen.',kicker:'MERIDIAN / COLLECTION OBSERVATORY'},halo:{title:'Raum für das Besondere.',subtitle:'Deine Baupläne, sorgfältig kuratiert. Das nächste Stück wartet schon.',kicker:'HALO / THE BLUEPRINT COLLECTION'},nocturne:{title:'Das Unentdeckte wartet.',subtitle:'Aus einzelnen Funden wird deine Geschichte im Verse.',kicker:'NOCTURNE / AFTER DARK ARCHIVE'}};
const originalConfigureVariant=ArchiveLayouts.configureVariant;
ArchiveLayouts.configureVariant=function(){
 originalConfigureVariant.call(this);const design=V3_DESIGNS[this.theme];if(!design)return;
 const hero=document.querySelector('.obsidian-hero');document.getElementById('archiveTitle').textContent=design.title;hero.querySelector('p').textContent=design.subtitle;
 document.querySelector('.obsidian-overline').innerHTML=`<span>${design.kicker}</span><span>STAR CITIZEN</span>`;
 hero.querySelector('.next-hero-art')?.remove();hero.insertAdjacentHTML('afterbegin',`<div class="next-hero-art" aria-hidden="true"><i></i><i></i><i></i><span>BP / 03</span></div>`);
 if(this.theme==='halo')document.querySelector('.obsidian-dock').setAttribute('data-floating','true');else document.querySelector('.obsidian-dock').removeAttribute('data-floating');
};
const originalClearVariant=ArchiveLayouts.clearVariant;
ArchiveLayouts.clearVariant=function(){document.querySelector('.next-hero-art')?.remove();document.querySelector('.obsidian-dock')?.removeAttribute('data-floating');originalClearVariant.call(this);};
const sourceNames={wiki:'Star Citizen Wiki API',mediawiki:'StarCitizen.tools',cornerstone:'Cornerstone'};
let intelTimer=0;
function renderV3Intel(item,dossier,token){
 if(token!==state.detailToken)return;
 let root=document.getElementById('detailExternal');if(!root){root=document.createElement('section');root.id='detailExternal';root.className='external-intel';elements.detailLore.append(root);}
 const esc=SCUI.escape;const sources=dossier?.sources||{};
 const shops=[];
 for(const key of ['cornerstone'])for(const shop of sources[key]?.data?.shops||[])shops.push({...shop,provider:sourceNames[key],sourceUrl:sources[key].data.url});
  root.innerHTML=`<div class="intel-actions"><a class="quiet-button" href="/media.html?item=${encodeURIComponent(item.stableId||'')}">Eigene Bilder verwalten ↗</a><a class="quiet-button" href="/sources.html">Datenquellen ↗</a></div>
 <details class="intel-details"><summary>Weitere Bezugsquellen <span>${shops.length} Angebote</span></summary><p class="settings-help">Verkaufsorte des Items. Ein Kauf schaltet den Bauplan nicht automatisch frei.</p>${shops.slice(0,12).map(s=>`<div class="intel-shop"><b>${esc(s.location)}</b><strong>${s.price!=null?formatNumber(s.price)+' aUEC':esc(s.priceText||'Preis unbekannt')}</strong><small>${esc(s.provider)}${s.version?' · '+esc(s.version):''}</small></div>`).join('')||'<p>Keine bestätigten Verkaufsorte in den ergänzenden Quellen.</p>'}</details>
 <details class="intel-details"><summary>Herkunft &amp; Bildzuordnung</summary><p class="identity-code">${esc(item.stableId||item.ini)}</p><p>${esc(mainCategoryLabel(item.mainCategory))} / ${esc(categoryLabel(item.subCategory))}</p>${Object.entries(sources).filter(([key])=>sourceNames[key]).map(([key,s])=>`<div class="source-proof"><span>${esc(sourceNames[key]||key)}</span><small>${s.stale?'Gespeicherter Stand · Quelle offline':s.cached?'Gespeicherter Stand':s.ok?'Geprüft':'Derzeit nicht abrufbar'} · ${new Date(s.checkedAt).toLocaleDateString('de-DE')}</small></div>`).join('')}${(dossier?.notes||[]).map(n=>`<p class="settings-help">${esc(n)}</p>`).join('')}</details><p class="intel-state">${dossier?.pending?'Quellen werden ergänzt …':dossier?.updatedAt?'Letzter Abruf: '+new Date(dossier.updatedAt).toLocaleString('de-DE'):'Noch keine externen Daten gespeichert.'}</p>`;
 clearTimeout(intelTimer);
 if(dossier?.pending)intelTimer=setTimeout(async()=>{if(token!==state.detailToken||!elements.detailDialog.open)return;const updated=await loadWikiDossier(item,true);if(token!==state.detailToken)return;renderGallery(item,updated,false);if(updated?.description){elements.detailLoreText.textContent=updated.description;elements.detailLoreSource.textContent=updated.language==='de_DE'?'SC WIKI · DE':'SC WIKI · EN';}renderV3Intel(item,updated,token);},4500);
}
window.renderV3Intel=renderV3Intel;
let lastMediaRevision=-1,mediaCheckBusy=false;
setInterval(async()=>{
 if(document.hidden||mediaCheckBusy||!bp.config||!state.items.length)return;mediaCheckBusy=true;
 try{
  const status=await SCUI.api('/api/media/revision');
  if(status.revision!==lastMediaRevision){lastMediaRevision=status.revision;state.wikiCache.clear();
   for(const element of document.querySelectorAll('.card-visual[data-id]')){
    const rect=element.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight+150)continue;
    bp.imageQueue.push({element,generation:bp.imageGeneration});
   }
   pumpImages();
  }
 }catch{}finally{mediaCheckBusy=false;}
},5000);
