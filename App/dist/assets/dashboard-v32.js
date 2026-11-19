"use strict";
window.LiveDossier={cursor:null,channel:null,busy:false,active:null,
  async poll(){}, // Kompatibilität; Live-Aufträge laufen über live.js
  open(event){
    const mission=event.mission,dialog=elements.detailDialog;
    state.detailToken++;bp.detailItem=null;this.active=event;
    dialog.classList.add('is-live-mission');dialog.dataset.liveMission=event.guid;
    elements.detailType.textContent='LIVE · AUFTRAG ANGENOMMEN';elements.detailTitle.textContent=mission.title||mission.debugName;
    elements.detailStatus.textContent='Angenommen · '+formatDateTime(event.ts);
    let pane=document.getElementById('liveMissionPane');if(!pane){pane=document.createElement('section');pane.id='liveMissionPane';pane.className='live-mission-pane';dialog.querySelector('.dialog-shell').append(pane);}
    pane.innerHTML='<p class="live-mission-note">Dein aktueller Auftrag · automatisch aus Game.log erkannt</p>'+renderMissionCard(mission,0);
    pane.querySelectorAll('.obsidian-mission-full').forEach(e=>e.open=true);
    pane.querySelectorAll('[data-reward-item-id]').forEach(b=>b.onclick=()=>openDetails(Number(b.dataset.rewardItemId)));
    pane.querySelectorAll('[data-detail-mission]').forEach(b=>b.onclick=()=>sendObs({kind:'mission',mission:b.dataset.detailMission,title:b.dataset.title}));
    if(!dialog.open){if(ArchiveLayouts.active&&ArchiveLayouts.desktop)dialog.show();else dialog.showModal();}
    pane.scrollTop=0;
  },
  clear(){this.active=null;elements.detailDialog.classList.remove('is-live-mission');delete elements.detailDialog.dataset.liveMission;}
};
document.addEventListener('sc:appearance',e=>{
  const a=e.detail||{},root=document.documentElement;
  root.style.setProperty('--card-scale',(a.cardScale||70)/100);
  root.style.setProperty('--dossier-width',({aurum:31,polaris:31.4,sentinel:31,nocturne:27}[a.theme]||26)*(a.dossierScale||130)/100+'%');
  root.style.setProperty('--dossier-min',(['aurum','polaris','sentinel'].includes(a.theme)?355:320)*(a.dossierScale||130)/100+'px');
  root.style.setProperty('--dossier-font',(a.dossierFontSize||20)+'px');
  root.style.setProperty('--dossier-type-scale',(a.dossierFontSize||20)/20);
});
