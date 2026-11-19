"use strict";
/* 5.0 Einzelversion: NAS-spezifische Teile der Einstellungen ausblenden und Texte anpassen. Im NAS-Betrieb wirkungslos. */
(async()=>{
 let mode='nas',platform='windows';
 try{const h=await fetch('/api/config',{cache:'no-store'}).then(r=>r.json());mode=h.mode||'nas';platform=h.platform||'windows';}catch{return;}
 if(mode!=='standalone')return;
 const apply=()=>{
  document.documentElement.dataset.mode='standalone';
  const set=(sel,text)=>{const e=document.querySelector(sel);if(e)e.textContent=text;};
  const os=platform==='linux'?'Linux (Bazzite)':'Windows';
  set('#paths h2','Dieser PC');
  set('#paths .section-copy',`Einzelversion für ${os}: Das Dashboard läuft auf diesem PC und liest Game.log und LogBackups selbst. Kein NAS und kein zusätzlicher Helfer nötig.`+(platform==='linux'?' Pfade unter Linux als /home/… oder ~/… eintragen; Star Citizen liegt meist im Wine-Präfix, z. B. ~/Games/star-citizen/drive_c/Program Files/Roberts Space Industries/StarCitizen.':''));
  set('#sync .section-copy','Neue Bauplanmeldungen werden direkt aus dem Game.log auf diesem PC erkannt. Katalog und Übersetzungen lädt das Dashboard selbst aus dem Internet und hält sie aktuell.');
  document.querySelectorAll('#paths .settings-help').forEach(e=>{if(e.textContent.includes('NAS-Zielordner'))e.textContent='Neue Pfade werden sofort auf diesem PC geprüft. Bei einem Fehler arbeitet der Log-Leser mit der letzten gültigen Konfiguration weiter.';});
  const req=document.getElementById('syncRequestStatus');if(req&&req.textContent.includes('Windows-PC'))req.textContent='Spielmeldungen, Katalog und Übersetzungen werden auf diesem PC verarbeitet, solange das Dashboard läuft.';
  const nav=document.querySelector('.settings-nav a[href="#paths"]');if(nav)nav.innerHTML='02 &nbsp; Dieser PC &amp; Pfade';
  document.querySelectorAll('#connection,.settings-nav a[href="#connection"]').forEach(e=>e.hidden=true);
  // 5.6.3: OBS-Seite – in der Einzelversion gibt es keinen Windows-Helfer, der Log-Leser ist eingebaut.
  document.querySelectorAll('.settings-help').forEach(e=>{if(['The first valid ownership is the baseline. Only new finds after that are announced. More than six finds at once appear in consecutive groups. Detection needs a running Windows helper.','Der erste gültige Besitzstand ist die Ausgangsbasis. Erst neue Funde danach werden gemeldet. Mehr als sechs gleichzeitige Funde erscheinen in aufeinanderfolgenden Gruppen. Die Erkennung setzt einen laufenden Windows-Helfer voraus.'].includes(e.textContent.trim()))e.textContent='Der erste gültige Besitzstand ist die Ausgangsbasis. Erst neue Funde danach werden gemeldet. Mehr als sechs gleichzeitige Funde erscheinen in aufeinanderfolgenden Gruppen. Die Erkennung läuft, solange das Programm auf diesem PC läuft; der Log-Leser ist eingebaut.';});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
