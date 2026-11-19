"use strict";
let savedConfig=null,draft=null,dirty=false,toastTimer=0;
const qs=id=>document.getElementById(id);
const fields=[
 ['filterAppearanceFields','appearance','cardScale','Bauplankarten · Prozent','number',[50,100],'70 % entspricht der gewünschten Verkleinerung um 30 %.'],
 ['filterAppearanceFields','appearance','dossierScale','Dossierbreite · Prozent','number',[100,160],'130 % vergrößert das seitliche Dossier um 30 %.'],
 ['filterAppearanceFields','appearance','dossierFontSize','Dossierschrift · Größenstufe','number',[16,26],'20 entspricht der Typografie der Auftragsplanung. Kleinere oder größere Werte skalieren Titel, Text und Belohnungs-Pools gemeinsam.'],
 ['scannerFields','scanner','autoMissionObs','Neue Auftragsannahmen 20 Sekunden in OBS anzeigen','checkbox',null,'Nur neue Live-Annahmen; mehrere Annahmen werden nacheinander angezeigt.'],
 ['appearanceFields','appearance','missionFiltersVisible','Auftragsfilter auf der Auftragsseite anzeigen','checkbox',null,'Der Filterblock startet eingeklappt.'],
 ['appearanceFields','appearance','view','Standardansicht','select',[['gallery','Galerie'],['table','Tabelle'],['missions','Blueprint Aufträge']]],
 ['appearanceFields','appearance','density','Darstellungsdichte','select',[['comfortable','Großzügig'],['compact','Kompakt']]],
 ['appearanceFields','appearance','fontSize','Schriftgröße','number',[14,20],'14–20 Pixel als Grundgröße.'],
 ['appearanceFields','appearance','animations','Animationen aktivieren','checkbox'],
 ['pathFields','paths','scRoot','Star-Citizen-Stammordner','text'],
 ['pathFields','paths','channel','Spielkanal','select',['LIVE','HOTFIX','PTU','EPTU','TECH-PREVIEW'].map(x=>[x,x==='LIVE'?'LIVE & HOTFIX':x])],
 ['pathFields','paths','logs','Star-Citizen-Logs','text',null,'Trace-Ordner als Referenz. Der direkte Scanner liest die unten angegebenen Game.log-Dateien.','wide'],
 ['scannerFields','scanner','gameLog','Aktuelle Game.log','text',null,'Wird auf deinem Windows-PC gelesen.','wide'],
 ['scannerFields','scanner','backups','Historische LogBackups','text',null,'Historische Funde ergänzen den Bestand ohne OBS-Einblendung.','wide'],
 ['scannerFields','scanner','scanBackups','Historische Backups im Hintergrund einlesen','checkbox'],
 ['scannerFields','scanner','correlationSeconds','Zeitfenster für Auftragszuordnung · Sekunden','number',[1,15],'Zeitliche Zuordnung ist eine Vermutung, keine bestätigte Quelle.'],
 ['syncFields','sync','enabled','Automatische Synchronisierung aktiv','checkbox'],
 ['syncFields','sync','pollSeconds','Lokale Prüfung · Sekunden','number',[5,3600]],
 ['syncFields','sync','externalRefreshHours','SCMDB & Übersetzung · Stunden','number',[1,168]],
 ['providerFields','providers','offline','Offline-Modus · keine externen Abrufe','checkbox'],
 ...[['wiki','Star Citizen Wiki API'],['mediawiki','StarCitizen.tools · direkter Bildzugriff'],['cornerstone','Cornerstone · Itemseiten & Bilder']].map(([key,label])=>['providerFields','providers',key,label,'checkbox']),
 ['sourceFields','sources','maxImages','Bilder pro Item','number',[0,3],'0 blendet Bilder aus. Maximal drei Ansichten.'],
 ['sourceFields','sources','maxMissions','Fundwege pro Item','number',[1,50],'Wird beim nächsten Snapshot-Aufbau angewendet.'],
 ['advancedSourceFields','sources','scmdbUrl','SCMDB-Datenadresse','url',null,null,'wide'],
 ['advancedSourceFields','sources','translationUrl','Deutsche Sprachdatei · JSON','url',null,null,'wide'],
 ['advancedSourceFields','sources','timeoutSeconds','Netzwerk-Zeitlimit · Sekunden','number',[5,120],'Für externe Abrufe des Dashboards und des Windows-Helfers.'],
 ['advancedSourceFields','sources','cacheHours','Quellen-Cache · Stunden','number',[1,720],'Nach diesem Intervall werden Metadaten neu geprüft. Heruntergeladene Bilddateien bleiben dauerhaft erhalten.'],
 ['obsFields','alerts','enabled','Neue Baupläne automatisch einblenden','checkbox'],
 ['obsFields','alerts','detailDurationSeconds','Auftragsdetails · Einblenddauer in Sekunden','number',[5,120]],
 ['obsFields','alerts','rewardDurationSeconds','Bauplan / Belohnungsgruppe · Sekunden','number',[5,120],'Bis zu neun Baupläne pro Gruppe.'],
 ['obsFields','alerts','imageIntervalSeconds','Bildwechsel · Sekunden','number',[3,5],'Wechsel zwischen vorhandenen Bildern.'],
 ['obsFields','alerts','queueMaxAgeSeconds','Maximales Wartealter · Sekunden','number',[60,86400],'Nicht gestartete Funde verfallen danach, falls OBS nicht verbunden war.'],
 ['obsFields','alerts','position','Position im Stream','select',[['bottom-right','Unten rechts'],['bottom-left','Unten links'],['top-right','Oben rechts']]],
 ['obsFields','obs','theme','OBS-Design','select',[['inherit','Wie das Dashboard'],...SCUI.themes.map(t=>[t.id,t.name])]],
 ['showcaseFields','obs','transparent','Dossier-Hintergrund transparent','checkbox'],
 ['showcaseFields','obs','layout','OBS-Darstellung','select',[['dossier','Dossier · ausführliche Ansicht'],['strip','Aurum-Leiste · wie im Entwurf']],'Die Leiste liegt am unteren Bildrand; Dossier zeigt die ausführlichen Auftragsdaten.'],
 ['showcaseFields','obs','status','Bauplanstatus','select',[['open','Offene Baupläne'],['done','Erhaltene Baupläne'],['all','Alle Baupläne']]],
 ['showcaseFields','obs','interval','Automatischer Wechsel · Sekunden','number',[8,120]],
 ['obsFields','obs','resolution','OBS-Browserquellen-Größe','select',[['1920x1080','Full HD · 1920 × 1080'],['3840x2160','4K · 3840 × 2160']]],
 ['showcaseFields','obs','allMissions','Alle Fundwege je Item durchlaufen','checkbox'],
 ['obsFields','obs','showImage','Item-Bild anzeigen','checkbox'],

 ['showcaseFields','obs','item','Festes Item · optional','text',null,'Name oder INI-Schlüssel. Leer lassen für automatischen Wechsel.'],
 ['showcaseFields','obs','mission','Fester Auftrag · optional','text',null,'Auftrags-ID oder Debug-Name. Eine Live-Auswahl hat Vorrang.'],
 ['connectionFields','deployment','dashboardUrl','Dashboard-Adresse im Heimnetz','url',null,'Eine vom Windows-PC und OBS-Rechner erreichbare Adresse verwenden.','wide'],
 ['connectionFields','paths','destination','NAS-Datenordner · Windows-Freigabe','text',null,'DISKSTATION ist ein Vorschlag. Den tatsächlichen Freigabenamen eintragen.','wide'],
 ['deploymentFields','deployment','publishedPort','Veröffentlichter Docker-Port','number',[1024,65535]],
 ['deploymentFields','deployment','mediaPath','Permanenter NAS-Bildspeicher','text',null,'Bind-Mount in der Compose-Datei. Nach einer Änderung das Docker-Projekt neu erstellen und vorhandene Bilder in den neuen Ordner kopieren.','wide'],
 ['deploymentFields','deployment','nasProjectPath','NAS-Projektpfad','text',null,'Wird in die erzeugte Compose-Datei übernommen.'],
];
document.addEventListener('DOMContentLoaded',async()=>{
 try{savedConfig=await SCUI.api('/api/config');draft=structuredClone(savedConfig.settings);if(!draft.deployment.dashboardUrl)draft.deployment.dashboardUrl=location.origin;renderSettings();renderAgent(savedConfig);SCUI.api('/api/sources/catalog').then(renderNasStatus).catch(()=>{});qs('saveSettings').disabled=false;markDirty();}
 catch(e){displayError(e.message);qs('saveStatus').textContent='Einstellungen nicht erreichbar.';return;}
 qs('settingsForm').onsubmit=saveSettings;
 qs('settingsForm').addEventListener('input',updateField);qs('settingsForm').addEventListener('change',updateField);
 qs('discardChanges').onclick=()=>{draft=structuredClone(savedConfig.settings);renderSettings();markDirty();};
 qs('derivePaths').onclick=()=>{draft.scanner.gameLog=draft.paths.scRoot.replace(/\\$/,'')+'\\'+draft.paths.channel+'\\Game.log';draft.scanner.backups=draft.paths.scRoot.replace(/\\$/,'')+'\\'+draft.paths.channel+'\\LogBackups';draft.paths.logs=draft.paths.scRoot.replace(/\\$/,'')+'\\'+draft.paths.channel+'\\logs\\trace';renderSettings();markDirty();};
 qs('syncNow').onclick=()=>requestSync(false);qs('syncExternal').onclick=()=>requestSync(true);
 qs('pairWindows').onclick=()=>action(async()=>SCUI.download('dashboard-connection.json',await SCUI.api('/api/pairing',{})),'Verbindungsdatei heruntergeladen. Neben Install-AutoSync.cmd ablegen.');
 qs('exportSettings').onclick=()=>SCUI.download('sc-blueprint-settings.json',{schema:5,themeCatalogVersion:3,exportedAt:new Date().toISOString(),settings:draft});
 qs('importSettings').onclick=()=>qs('importFile').click();qs('importFile').onchange=importSettings;
 qs('restoreSettings').onclick=()=>action(async()=>{const result=await SCUI.api('/api/config/restore',{revision:savedConfig.revision});savedConfig={...result,hasPrevious:true};draft=structuredClone(result.settings);renderSettings();markDirty();},'Vorherige Einstellungen wiederhergestellt.');
 qs('runDiagnostics').onclick=async()=>{qs('diagnostics').textContent='Verbindungen werden geprüft …';await action(async()=>{const result=await SCUI.api('/api/diagnostics',{});qs('diagnostics').innerHTML=result.checks.map(c=>`<div class="diagnostic-row"><span class="${c.ok?'ok':'error'}">${c.ok?'✓':'!'}</span><b>${SCUI.escape(c.name)}</b><span>${SCUI.escape(c.detail)}</span></div>`).join('');},'Verbindungsprüfung abgeschlossen.');};
 qs('resumeObs').onclick=()=>action(()=>SCUI.api('/api/obs',{kind:'cycle'}),'Live-Auswahl aufgehoben. Die gespeicherten OBS-Filter gelten wieder.');
 qs('copyObsUrl').onclick=async()=>{const url=obsUrl();try{await navigator.clipboard.writeText(url);notifySettings('OBS-Adresse kopiert.');}catch{qs('obsUrlText').textContent=url;notifySettings('Adresse unter den Schaltflächen markieren und kopieren.');}};
 qs('downloadCompose').onclick=()=>{
   if(!qs('settingsForm').reportValidity())return;const port=draft.deployment.publishedPort,root=draft.deployment.nasProjectPath.replace(/\/$/,'');
   SCUI.download('docker-compose.yml',`name: sc-blueprint-dashboard\nservices:\n  dashboard:\n    build: .\n    image: local/sc-blueprint-dashboard:3.2.1\n    container_name: sc-blueprint-dashboard\n    restart: unless-stopped\n    ports:\n      - "${port}:8080"\n    volumes:\n      - ${JSON.stringify(root+'/data:/app/data:ro')}\n      - ${JSON.stringify(root+'/state:/app/state')}\n      - ${JSON.stringify(draft.deployment.mediaPath+':/app/media')}\n    read_only: true\n    tmpfs:\n      - /tmp\n    security_opt:\n      - no-new-privileges:true\n    environment:\n      TZ: Europe/Berlin\n    logging:\n      driver: json-file\n      options:\n        max-size: "5m"\n        max-file: "2"\n`);
 };
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 setInterval(async()=>{try{const latest=await SCUI.api('/api/config');renderAgent(latest);if(latest.revision!==savedConfig.revision)qs('saveStatus').textContent='Einstellungen wurden auf einem anderen Gerät geändert. Vor dem Speichern neu laden.';}catch{}try{renderNasStatus(await SCUI.api('/api/sources/catalog'));}catch{}},10000);
});
function renderSettings(){
 for(const container of new Set(fields.map(f=>f[0])))qs(container).innerHTML='';
 for(const [container,section,key,label,type,options,hint,wide] of fields){
  const value=draft[section][key],id=section+'-'+key;let input='';
  if(type==='checkbox')input=`<label class="setting-toggle ${wide||''}"><input id="${id}" data-field="${section}.${key}" type="checkbox" ${value?'checked':''}/><span>${label}${hint?`<small class="settings-help" style="display:block">${hint}</small>`:''}</span></label>`;
  else {const control=type==='select'?`<select id="${id}" data-field="${section}.${key}">${options.map(([val,title])=>`<option value="${SCUI.escape(val)}" ${value===val?'selected':''}>${SCUI.escape(title)}</option>`).join('')}</select>`:`<input id="${id}" data-field="${section}.${key}" type="${type}" value="${SCUI.escape(value)}" ${type==='number'?`min="${options[0]}" max="${options[1]}" step="1"`:''} ${!((section==='obs'&&['item','mission'].includes(key))||(section==='deployment'&&key==='dashboardUrl'))?'required':''}/>`;input=`<label class="setting-field ${wide||''}" for="${id}"><span>${label}</span>${control}${hint?`<small>${hint}</small>`:''}</label>`;}
  qs(container).insertAdjacentHTML('beforeend',input);
 }
 renderFilterDesigns();renderThemes();SCUI.apply(draft.appearance,false);updatePreview();qs('restoreSettings').disabled=!savedConfig.hasPrevious;
}
function renderThemes(){qs('themeGrid').innerHTML=SCUI.themes.map(t=>`<button type="button" class="theme-card ${draft.appearance.theme===t.id?'is-selected':''}" data-theme-choice="${t.id}" aria-pressed="${draft.appearance.theme===t.id}"><div class="theme-preview" data-preview-layout="${t.id}" style="--mini-bg:${t.colors[0]};--mini-accent:${t.colors[1]};background-image:url(/assets/theme-previews/${t.id}.webp)"><div class="mini-header">BLUEPRINT ARCHIVE</div><span class="mini-title">${t.tag}</span><span class="mini-orbit"></span><span class="mini-cards"><i></i><i></i><i></i></span></div><div class="theme-text"><span class="theme-choice">${draft.appearance.theme===t.id?'✓':'↗'}</span><strong>${t.name}</strong><small>${t.desc}</small></div></button>`).join('');qs('themeGrid').querySelectorAll('button').forEach(button=>button.onclick=()=>{draft.appearance.theme=button.dataset.themeChoice;if(['polaris','sentinel'].includes(draft.appearance.theme)){draft.appearance.view=draft.appearance.theme==='sentinel'?'missions':'gallery';qs('appearance-view').value=draft.appearance.view;}renderThemes();renderFilterDesigns();SCUI.apply(draft.appearance,false);markDirty();updatePreview();});}
function updateField(event){const key=event.target.dataset.field;if(!key)return;const [section,name]=key.split('.');draft[section][name]=event.target.type==='checkbox'?event.target.checked:event.target.type==='number'?Number(event.target.value):event.target.value;markDirty();if(section==='appearance')SCUI.apply(draft.appearance,false);if(section==='obs'||key==='deployment.dashboardUrl')updatePreview();}
function markDirty(){dirty=JSON.stringify(draft)!==JSON.stringify(savedConfig.settings);qs('saveStatus').textContent=dirty?'Vorschau · noch nicht gespeichert':'Alle Einstellungen gespeichert';qs('discardChanges').disabled=!dirty;qs('saveSettings').disabled=!dirty;}
async function saveSettings(event){event.preventDefault();qs('saveSettings').disabled=true;try{const result=await SCUI.api('/api/config',{revision:savedConfig.revision,settings:draft});savedConfig={...result,hasPrevious:true};draft=structuredClone(result.settings);SCUI.apply(draft.appearance);renderSettings();markDirty();qs('settingsError').hidden=true;notifySettings('Einstellungen gespeichert. Der Windows-Helfer prüft geänderte Pfade beim nächsten Kontakt.');renderAgent(await SCUI.api('/api/config'));}catch(e){displayError(e.message);qs('saveSettings').disabled=false;}}
function renderAgent(config){const a=config.agent||{},age=Date.now()-Date.parse(a.receivedAt||''),online=Number.isFinite(age)&&age<Math.max(config.settings.sync.pollSeconds*2500,120000);const applied=a.revision===config.syncRevision;let title='Gespeichert · wartet auf den Windows-PC';if(a.status==='error')title='Fehler bei der PC-Übernahme oder Synchronisierung';else if(applied)title=online?'Vom PC übernommen':'Übernommen · PC derzeit nicht verbunden';const details=a.message||'Verbindungsdatei herunterladen und den Windows-Helfer installieren.';qs('agentStatus').innerHTML=`<strong>${SCUI.escape(title)}</strong><br/>${SCUI.escape(details)}${a.scanner?`<br/><span class="settings-help">Logscanner: ${SCUI.escape(a.scanner.message||a.scanner.status||'bereit')}</span>`:''}${a.receivedAt?`<br/><span class="settings-help">Letzter Kontakt: ${new Date(a.receivedAt).toLocaleString('de-DE')} · ${SCUI.escape(a.machine||'Windows-PC')}</span>`:''}`;}
async function action(fn,message){try{await fn();notifySettings(message);}catch(e){notifySettings(e.message,true);}}
async function requestSync(external){await action(async()=>{const result=await SCUI.api('/api/sync/request',{external});qs('syncRequestStatus').textContent=result.message+(savedConfig.settings.sync.enabled?'':' Automatische Synchronisierung ist pausiert; diese manuelle Anforderung wird trotzdem ausgeführt.');},external?'Katalogprüfung auf der Synology gestartet.':'Synchronisierung beim PC angefordert.');}
async function importSettings(){try{const file=qs('importFile').files[0];if(!file)return;if(file.size>1000000)throw new Error('Die Datei ist zu groß.');const parsed=JSON.parse(await file.text());const result=await SCUI.api('/api/config/migrate',{export:parsed});draft=result.settings;renderSettings();markDirty();notifySettings('Import als Vorschau geladen. Prüfen und anschließend übernehmen.');}catch(e){displayError(e.message);}finally{qs('importFile').value='';}}

function obsUrl(){return (draft.deployment.dashboardUrl||location.origin).replace(/\/$/,'')+'/obs.html';}
function updatePreview(){qs('obsUrlText').textContent=obsUrl();qs('obsResolutionLabel').textContent=draft.obs.resolution.replace('x',' × ')+' · in OBS einstellen';const p=new URLSearchParams({preview:'1',theme:draft.obs.theme==='inherit'?draft.appearance.theme:draft.obs.theme});qs('obsPreview').src='/obs.html?'+p;}

function displayError(message){qs('settingsError').hidden=false;qs('settingsError').textContent=message;}
function notifySettings(message,error=false){clearTimeout(toastTimer);qs('settingsToast').hidden=false;qs('settingsToast').textContent=message;qs('settingsToast').style.borderColor=error?'var(--red)':'var(--cyan)';toastTimer=setTimeout(()=>qs('settingsToast').hidden=true,7000);}

function renderFilterDesigns(){
 const designs=[['compact','01 · Obsidian Compact','Kurze Auswahl, gefaltete Komponenten und aktive Filter.'],['precision','08 · Forge Precision','Kupfer, ausgerichtete Komponenten und präzise Größenwahl.'],['focus','09 · Atlas Focus','Drei klare Schritte und eine ruhige Zusammenfassung.']];
 qs('filterDesignGrid').innerHTML=designs.map(([id,title,desc])=>`<button type="button" class="filter-design-card" data-filter-choice="${id}" aria-pressed="${draft.appearance.filterLayout===id}"><div class="filter-mini" data-layout="${id}"><b>${title}</b><div class="mini-chips"><span>Rüstung</span><span>Waffen</span><span>Vehikel</span><span>Größe 0–6</span></div><div class="mini-selection"><span>Leicht × · Helm ×</span><span>Filter zurücksetzen ↺</span></div></div><div><strong>${title}</strong><small>${desc}</small></div></button>`).join('');
 qs('filterDesignGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>{draft.appearance.filterLayout=b.dataset.filterChoice;renderFilterDesigns();markDirty();});
}
function renderNasStatus(s){qs('nasCatalogStatus').textContent=(s.status==='updating'?'Aktualisierung läuft … ':s.available?'Gespeicherter NAS-Katalog: '+s.items+' Baupläne · '+s.version+' · ':'NAS-Katalog wird beim ersten Abruf erstellt. ')+(s.error||s.message||'Letzter lokaler Datenstand bleibt verfügbar.')+(s.lastSuccess?' Letzter Erfolg: '+new Date(s.lastSuccess).toLocaleString('de-DE'):'');}
