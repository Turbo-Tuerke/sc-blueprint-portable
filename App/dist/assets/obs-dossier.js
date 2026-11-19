"use strict";
window.ObsDossier={button(m){const item=bp.detailItem;if(!item)return '';return `<button type="button" class="quiet-button" data-obs-dossier="${SCUI.escape(m.id||m.debugName)}" data-obs-blueprint="${SCUI.escape(item.ini||item.name)}">${SCUI.icon('broadcast')} Auftragsdetails und Bauplan in OBS anzeigen</button>`;}};
document.addEventListener('click',event=>{const b=event.target.closest('[data-obs-dossier]');if(!b)return;event.preventDefault();void sendObs({kind:'mission-details',mission:b.dataset.obsDossier,item:b.dataset.obsBlueprint});});

document.addEventListener('click',event=>{const b=event.target.closest('[data-send-rewards]');if(b)void sendObs({kind:'mission',mission:b.dataset.sendRewards,title:b.dataset.title});});
