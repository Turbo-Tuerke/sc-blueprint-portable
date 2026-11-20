"use strict";

window.MissionText={registry:new Map(),

 rewards(m){m=this.full(m||{});const e=SCUI.escape,number=v=>typeof v==='number'&&Number.isFinite(v),format=v=>v.toLocaleString('de-DE',{maximumFractionDigits:2});
  const money=number(m.rewardUEC)?format(m.rewardUEC)+' aUEC':'Nicht angegeben';
  const rows=(m.reputationRewards||[]).filter(r=>number(r.amount));
  const xp=rows.length?rows.map(r=>`${format(r.amount)} XP · ${r.faction||'Unbekannte Fraktion'}${r.scope?' / '+r.scope:''}`).join('; '):'Nicht angegeben';
  const groups=new Map(),categories={Defense:'Verteidigung',Transport:'Transport',Collection:'Sammlung',Collections:'Sammlung'};
  for(const row of m.eventRewards||[]){if(!number(row.amount))continue;const key=JSON.stringify([row.event,row.amount,!!row.splitPointsForParty]);if(!groups.has(key))groups.set(key,{...row,categories:new Set()});groups.get(key).categories.add(categories[row.category]||row.category||'Gesamt');}
  const points=[...groups.values()].map(r=>`${format(r.amount)} Punkte · ${r.event==='Iasi'?'RSI Discovery Month':r.event||'Unbekanntes Event'} (${[...r.categories].join(' / ')})${r.splitPointsForParty?' · in der Gruppe geteilt':''}`).join('; ')||'Nicht angegeben';
  return `<p class="mission-rewards"><strong>Prämie (Katalog):</strong> ${e(money)}<br><strong>Rufpunkte / XP (Katalog):</strong> ${e(xp)}<br><strong>Event-Punkte (Katalog):</strong> ${e(points)}</p>`;
 },

 full(m){if(m.logInstance)return m;const definition=typeof getMissionDefinition==='function'?getMissionDefinition(m):window.LogDetails?.missions?.find(row=>row.id===m.id);return {...m,...(definition||{})};},

 render(m,field='description'){m=this.full(m);const key=m.logInstance?.guid||m.id||m.debugName||'',template=m[field+'Template']||m[field]||'';this.registry.set(key,m);

  let out='',start=0;const pattern=/\[([A-Za-z][A-Za-z0-9_|]*)\]/g;

  for(const match of template.matchAll(pattern)){const token=match[1].toUpperCase(),value=m.missionContext?.tokens?.[token]||match[0];out+=SCUI.escape(template.slice(start,match.index))+`<button type="button" class="mission-token" data-context-mission="${SCUI.escape(key)}" data-context-token="${SCUI.escape(token)}" aria-haspopup="dialog" aria-label="Zusatzinformationen: ${SCUI.escape(value)}">${SCUI.escape(value)}</button>`;start=match.index+match[0].length;}

  return out+SCUI.escape(template.slice(start));

 },

 places(rows){return rows?.length?'<ul>'+rows.map(row=>`<li><strong>${SCUI.escape(row.name)}</strong><small>${SCUI.escape([row.type,row.system,row.planet,row.moon].filter(Boolean).join(' · '))}</small></li>`).join('')+'</ul>':'<p>Keine eindeutig zugeordneten Orte in dieser Katalogquelle vorhanden.</p>';},

 cargo(m){m=this.full(m);const rows=m.missionContext?.cargo||[];if(!rows.length)return '';return '<section class="mission-cargo"><h4>Fracht laut Katalog</h4><ul>'+rows.map(row=>`<li><strong>${SCUI.escape(row.name||'Fracht ohne eindeutigen Ressourcennamen')}</strong> · ${SCUI.escape(row.minSCU??'—')}${row.maxSCU>0?'–'+SCUI.escape(row.maxSCU):''} SCU${!(row.maxSCU>0)?' (Mindestmenge)':''} · max. Containergröße: ${SCUI.escape(row.maxContainerSize>0?row.maxContainerSize:'—')} SCU</li>`).join('')+'</ul></section>';},

 content(button){const m=this.registry.get(button.dataset.contextMission)||{},token=button.dataset.contextToken,c=m.missionContext||{};

  if(m.logInstance&&['TARGET','LOCATION'].includes(token))return `<h3>${token==='TARGET'?'Ziel':'Einsatzort'}</h3><p>${SCUI.escape(c.tokens?.[token]||'Unbekannt')}</p><small>Angabe zum konkreten Logauftrag; fehlende Werte werden nicht aus Katalogmöglichkeiten ergänzt.</small>`;
  const pickup=token==='LOCATION'||token==='MULTITOSINGLETOKEN',delivery=token==='DESTINATION'||token==='SINGLETOMULTITOKEN';

  if(pickup||delivery){let html=`<h3>${pickup?'Mögliche Einsatz- / Abholorte':'Mögliche Ziel- / Lieferorte'}</h3><p>Katalogmöglichkeiten, kein bestätigter Ort deines aktuellen Auftrags.</p>`+this.places(pickup?c.locations:c.destinations);

   if(c.routes?.length)html+='<details><summary>Zugeordnete Routengruppen aus der Quelle</summary>'+c.routes.map((route,index)=>`<section><h4>Routengruppe ${index+1}</h4><h5>Abholung</h5>${this.places(route.locations)}<h5>Ziele</h5>${this.places(route.destinations)}</section>`).join('')+'</details>';

   return html;

  }

  const value=c.tokens?.[token];return `<h3>Zusatzinformation</h3><p>${SCUI.escape(value||'Für diesen Platzhalter liegt keine eindeutige Ersetzung vor.')}</p><small>Angabe aus der zugeordneten Auftragsvorlage.</small>`;

 },

 mount(){const tip=document.createElement('aside');tip.id='missionTokenTip';tip.className='mission-token-tip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);

  const dialog=document.createElement('dialog');dialog.id='missionTokenDialog';dialog.className='mission-token-dialog';dialog.innerHTML='<button type="button" class="quiet-button" data-close-context>Schließen ×</button><div id="missionTokenContent"></div>';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();

  const show=button=>{const parent=button.closest('dialog')||document.body;if(tip.parentElement!==parent)parent.append(tip);tip.innerHTML=this.content(button)+'<small>Zum Öffnen anklicken oder Enter drücken.</small>';tip.hidden=false;button.setAttribute('aria-describedby',tip.id);const box=button.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(box.left,innerWidth-390))+'px';tip.style.top=Math.max(8,Math.min(box.bottom+8,innerHeight-tip.offsetHeight-8))+'px';};

  document.addEventListener('pointerover',event=>{const button=event.target.closest('.mission-token');if(button)show(button);});

  document.addEventListener('pointerout',event=>{const button=event.target.closest('.mission-token');if(button&&!tip.contains(event.relatedTarget)){tip.hidden=true;button.removeAttribute('aria-describedby');}});

  tip.addEventListener('pointerleave',()=>tip.hidden=true);

  document.addEventListener('focusin',event=>{if(event.target.matches('.mission-token'))show(event.target);});

  document.addEventListener('focusout',event=>{if(event.target.matches('.mission-token')){tip.hidden=true;event.target.removeAttribute('aria-describedby');}});

  document.addEventListener('click',event=>{const button=event.target.closest('.mission-token');if(!button)return;event.preventDefault();tip.hidden=true;document.getElementById('missionTokenContent').innerHTML=this.content(button);if(!dialog.open)dialog.showModal();});

  document.addEventListener('keydown',event=>{if(event.key==='Escape')tip.hidden=true;});

 }

};

document.addEventListener('DOMContentLoaded',()=>MissionText.mount());

