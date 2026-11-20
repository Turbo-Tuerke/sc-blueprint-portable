/* SC Blueprint Dashboard – Wörterbuch Deutsch -> Englisch (Etappe 2: Hauptseite und Live-Aufträge).
 * Wird nach i18n.js geladen. Exakte Texte stehen in SCBP_I18N, Texte mit Zahlen/Datum
 * als Muster in SCBP_I18N_RULES ([Regex, Ersatz]). Spieldaten (Missionen, Items) stehen
 * hier nicht: die liefert der Server je nach Sprache. */
(function () {
  'use strict';
  var D = window.SCBP_I18N = window.SCBP_I18N || {};
  var add = function (o) { for (var k in o) D[k] = o[k]; };
  add({
    // Kopf, Navigation, allgemeine Knöpfe
    'Hauptnavigation': 'Main navigation', 'Archivnavigation': 'Archive navigation', 'ARCHIVZUGRIFF': 'ARCHIVE ACCESS',
    'PERSÖNLICHES ARCHIV': 'PERSONAL ARCHIVE', 'OBS-Studio': 'OBS Studio', 'OBS-STUDIO': 'OBS STUDIO',
    'Direkte OBS-Anbindung öffnen': 'Open direct OBS connection', 'Eigene Itembilder verwalten': 'Manage your own item images',
    'Design ändern ↗': 'Change design ↗', 'Design & Einstellungen': 'Design & settings', 'Darstellung': 'View',
    'Daten neu laden': 'Reload data', 'Daten werden geladen …': 'Loading data …', 'DATEN WERDEN GELADEN': 'LOADING DATA',
    'Katalog wird verbunden': 'Connecting catalog', 'Zum Anfang': 'Back to top', 'Abbrechen': 'Cancel',
    'Speichern': 'Save', 'Leeren': 'Clear', 'Auswählen': 'Select', 'Details': 'Details', 'Schließen ×': 'Close ×',
    'Eintrag schließen': 'Close entry', 'Detailansicht schließen': 'Close detail view', 'Weitere Einträge laden': 'Load more entries',
    'Alle': 'All', 'Keine Auswahl': 'No selection', 'Nicht angegeben': 'Not specified', 'Status': 'Status', 'Zeitpunkt': 'Time',
    'Von': 'From', 'Bis': 'To', 'VON': 'FROM', 'Name': 'Name', 'Typ': 'Type', 'Klasse': 'Class', 'Größe': 'Size',
    'Hersteller': 'Manufacturer', 'Beschreibung': 'Description', 'Beschreibung wird geladen …': 'Loading description …',
    'Eigenschaften': 'Properties', 'Kategorie': 'Category', 'Kategorien': 'Categories', 'Tabelle': 'Table', 'Galerie': 'Gallery',
    'Ziele': 'Goals', 'Favoriten': 'Favourites', 'Meine Favoriten': 'My favourites', 'Vergleich': 'Comparison',
    'Vergleichen': 'Compare', 'Vergleich schließen': 'Close comparison', 'Dein Vergleich': 'Your comparison',
    // Startbereich, Fortschritt
    'Deine Sammlung.': 'Your collection.', 'Dein nächstes Ziel.': 'Your next goal.', 'Gesamtfortschritt': 'Overall progress',
    'Bauplanfortschritt': 'Blueprint progress', 'FORTSCHRITT': 'PROGRESS', 'erhalten': 'collected', 'offen': 'open',
    'ERHALTEN': 'COLLECTED', 'NOCH OFFEN': 'STILL OPEN', 'Erhalten': 'Collected', 'Offen': 'Open',
    'LETZTER FUND': 'LATEST FIND', 'neue Baupläne registriert': 'new blueprints registered', 'SEIT LETZTER SICHERUNG': 'SINCE LAST BACKUP',
    'Sammelziele erreicht': 'Collection goals reached', 'Deine Einsatzziele': 'Your mission goals', 'DEIN AKTUELLER EINSATZ': 'YOUR CURRENT MISSION',
    'Dein Fortschritt wird aus dem lokalen Scannerbestand aufgebaut.': 'Your progress is built from the local scanner data.',
    'Deine Auswahl wird auf der Synology gespeichert.': 'Your selection is saved on the Synology.',
    'Bauplan-Erwerbe der letzten Monate': 'Blueprints acquired in recent months', 'ERWERBE NACH MONAT': 'ACQUISITIONS BY MONTH',
    'VERTEILUNG': 'DISTRIBUTION', 'SYSTEM TELEMETRIE': 'SYSTEM TELEMETRY', 'Bauplan-Kennzahlen': 'Blueprint figures',
    // Suche, Filter
    'Baupläne durchsuchen': 'Search blueprints', 'Aufträge oder Prämie in aUEC durchsuchen': 'Search missions or reward in aUEC',
    'Schnellwahl': 'Quick pick', 'Sortierung': 'Sort', 'Name A–Z': 'Name A–Z', 'Neueste zuerst': 'Newest first',
    'Alle Kategorien': 'All categories', 'Alle ausgewählt': 'All selected', 'Alle Kategorien an- oder abwählen': 'Select or deselect all categories',
    'Alle Haupt- und Unterkategorien gemeinsam an- oder abwählen': 'Select or deselect all main and sub categories together',
    'Kategorien und Sammlung': 'Categories and collection', 'Besitzstatus filtern': 'Filter by ownership',
    'Meine Filter': 'My filters', 'Gespeicherte Filter': 'Saved filters', 'GESPEICHERTE ANSICHTEN': 'SAVED VIEWS',
    'Filter speichern': 'Save filter', 'Filter löschen': 'Delete filter', 'Filter zurücksetzen': 'Reset filters',
    'Filter ausklappen': 'Expand filters', 'Filter einklappen': 'Collapse filters', 'FILTER EINKLAPPEN': 'COLLAPSE FILTERS',
    'FILTER AUSKLAPPEN': 'EXPAND FILTERS', 'Filterdesign unabhängig auswählen': 'Choose filter design separately',
    'Favoriten, Ziele und Filtervorlagen': 'Favourites, goals and filter presets', 'Weitere Sammelfunktionen': 'More collection tools',
    'Zum Beispiel: Schwere Rüstung · Offen': 'For example: Heavy armour · Open', 
    'TYP WÄHLEN': 'CHOOSE TYPE', 'Typ, Größe und Eigenschaften': 'Type, size and properties', 'Weitere Untertypen': 'More sub types',
    'Wähle oben einen Ausrüstungstyp. Danach erscheinen genau die dazu passenden Zusatzfilter.':
      'Choose an equipment type above. The matching extra filters then appear.',
    'Minimale Größe': 'Minimum size', 'Maximale Größe': 'Maximum size', 'Größe von': 'Size from', 'Größe bis': 'Size to',
    'Mit Detaildaten': 'With detail data', 'Alle sichtbaren auswählen': 'Select all visible', 'Akten pro Seite': 'Files per page', 'Akte als eigene Quelle': 'File as its own source', 'Zeigt die Akte eines Live-Auftrags mittig im Bild und blättert mit, wenn du im Dashboard blätterst. Eingeblendet wird sie in der geöffneten Akte mit „OBS-Einblenden“, ausgeblendet mit „OBS-Ausblenden“.': 'Shows the file of a live mission centred on screen and turns its pages when you turn them in the dashboard. Show it from the open file with “Show in OBS”, hide it with “Hide in OBS”.', 'In OBS eine weitere „Browser“-Quelle hinzufügen.': 'Add another “Browser” source in OBS.', 'Die folgende Adresse einfügen, Breite 1920 und Höhe 1080 einstellen.': 'Paste the address below and set width 1920 and height 1080.', 'Akte-Quelle öffnen ↗': 'Open file source ↗', '‹ Zurück': '‹ Back', 'Weiter ›': 'Next ›', 'DEINE AUSWAHL': 'YOUR SELECTION',
    'Alle Baupläne · keine Einschränkung': 'All blueprints · no restriction', 'Nur für meine Sammelziele': 'Only for my collection goals',
    // Aufträge
    'Aufträge': 'Missions', 'Aktive Aufträge': 'Active missions', 'Nur aktive Aufträge': 'Active missions only',
    'Auftraggeber': 'Contractor', 'Auftraggeber, Region und Voraussetzungen': 'Contractor, region and requirements',
    'Auftragsart': 'Mission type', 'Region / System': 'Region / system', 'Legal / Illegal': 'Legal / illegal',
    'Mindestrang': 'Minimum rank', 'Voraussetzung': 'Requirement', 'Auftragsfilter zurücksetzen': 'Reset mission filters',
    'Auftragsauswahl': 'Mission selection', 'Auftragsbeschreibung & Quelle': 'Mission description & source',
    'Auftragsübersetzung': 'Mission translation', 'Alle Aufträge · keine zusätzlichen Einschränkungen': 'All missions · no further restrictions',
    'Alle Aufträge im verfügbaren SCMDB-Katalog · alphabetisch sortiert.': 'All missions in the available SCMDB catalog · sorted alphabetically.',
    'Aufträge gezielt auswählen. Die Suche findet auch Prämien, etwa 1.192.750 oder 1192750 aUEC.':
      'Pick missions precisely. The search also finds rewards, e.g. 1,192,750 or 1192750 aUEC.',
    'Keine passenden Aufträge': 'No matching missions', 'DEUTSCHE AUFTRÄGE': 'GERMAN MISSIONS', 'Belohnungspools': 'Reward pools',
    'Fundwege': 'Ways to find', 'Fundweg auswählen': 'Choose a way to find', 'Prämie (Katalog):': 'Reward (catalog):',
    'Rufpunkte / XP (Katalog):': 'Reputation / XP (catalog):', 'Event-Punkte (Katalog):': 'Event points (catalog):',
    'Fracht laut Katalog': 'Cargo according to catalog', 'Einsatzort unbekannt': 'Location unknown', 'Ziel unbekannt': 'Target unknown',
    'Mehrere Aufträge schließen': 'Close several missions',
    'Aktive und erfolgreiche Aufträge bleiben bis zum manuellen Schließen erhalten. Explizite Abandon-Abbrüche schließen automatisch.':
      'Active and successful missions stay until you close them. Explicitly abandoned missions close automatically.',
    'Prüfe Suche und Auftragsfilter. Fehlt der Katalog, aktualisiere die SCMDB-Quelle unter Einstellungen.':
      'Check the search and mission filters. If the catalog is missing, update the SCMDB source in Settings.',
    'Sortiert nach offenen Sammelzielen, danach fehlenden Bauplänen.': 'Sorted by open collection goals, then missing blueprints.',
    'Berücksichtigt die aktuelle Filterauswahl und die verfügbaren Fundwege im lokalen Snapshot. Die Rangfolge zählt passende Baupläne; sie ist keine Drop-Wahrscheinlichkeit. Voraussetzungen können weiterhin deinen Ruf oder Fortschritt einschränken.':
      'Uses the current filters and the ways to find in the local snapshot. The ranking counts matching blueprints; it is not a drop chance. Requirements may still be limited by your reputation or progress.',
    // Baupläne, Dossier
    'Bauplan': 'Blueprint', 'BAUPLAN': 'BLUEPRINT', 'Bauplan-Rezept': 'Blueprint recipe', 'Materialien': 'Materials',
    // 5.5.5: Lizenzhinweis im Fuß
    'Inoffizielles Fanprojekt. Programmcode unter MIT-Lizenz. Spieldaten:': 'Unofficial fan project. Code under the MIT licence. Game data:',
    '. Deutsche Texte:': '. German texts:',
    '. Weitere Daten und Bilder gehören ihren Rechteinhabern (siehe LIZENZEN.md).': '. Other data and images belong to their owners (see LIZENZEN.md).',
    // 5.5.0: Fundorte der Materialien
    'SCMDB MINING': 'SCMDB MINING', 'Fundorte der Materialien': 'Where to find the materials', 'Fundorte anzeigen': 'Show locations', 'Kein Fundort passt zu diesem Filter.': 'No location matches this filter.', 'Anteil ↓': 'Share ↓', 'Anteil ↑': 'Share ↑', 'Ort': 'Location', 'Typ': 'Type', 'Gruppe': 'Group', 'Anteil': 'Share',
    'Asteroidengürtel': 'Asteroid belt', 'Höhle': 'Cave', 'Asteroidenfeld': 'Asteroid cluster', 'Lagrange-Punkt': 'Lagrange point', 'Mond': 'Moon', 'Sonderort': 'Special location',
    'Schiffsabbau': 'Ship mining', 'Schiffsabbau (selten)': 'Ship mining (rare)', 'Fahrzeugabbau': 'Ground vehicle mining', 'Handabbau': 'Hand mining', 'Sammeln': 'Harvesting',
    'Kein Abbau-Fundort bekannt. Das Material stammt vermutlich aus Beute, Handel oder Aufträgen.': 'No mining location known. The material probably comes from loot, trading or missions.',
    'Anteil: wie oft dieses Material unter den Lagerstätten der Gruppe an diesem Ort vorkommt. Quelle: SCMDB.': 'Share: how often this material appears among the deposits of that group at this location. Source: SCMDB.',
    'Offene Baupläne': 'Open blueprints', 'Keine Baupläne gefunden': 'No blueprints found', 'Keine passenden offenen Baupläne': 'No matching open blueprints',
    'Für diesen Bauplan sind im aktuellen Datenstand keine Materialien hinterlegt.': 'No materials are listed for this blueprint in the current data.',
    'Prüfe Besitzstatus, Kategorien oder deine Sammelziele.': 'Check ownership, categories or your collection goals.',
    'Ändere Suche oder Filter, um wieder Einträge anzuzeigen.': 'Change the search or filters to show entries again.',
    'ITEM-DOSSIER': 'ITEM DOSSIER', 'Dossier des ausgewählten Bauplans': 'Dossier of the selected blueprint', 'Dossierbereiche': 'Dossier sections',
    'SCMDB-Dossiers': 'SCMDB dossiers', 'Item-Bilder': 'Item images', 'Bild in voller Qualität': 'Image in full quality',
    'Technik & Herstellung': 'Tech & manufacturing', 'Katalogeinträge': 'Catalog entries', 'Ergebnisse': 'Results',
    // Datenstatus, Quellen
    'Datenstatus': 'Data status', 'Datenquelle': 'Data source', 'Alle Datenquellen anzeigen': 'Show all data sources',
    'SCMDB-Version': 'SCMDB version', 'SNAPSHOT': 'SNAPSHOT', 'LOKAL': 'LOCAL', 'LOKALER KATALOG': 'LOCAL CATALOG',
    'Lokaler Besitzstand & Logfunde': 'Local ownership & log finds', 'Letzte Auto-Synchronisierung': 'Last auto sync',
    'Letzter Abgleich': 'Last check', 'Logdateien geprüft': 'Log files checked', 'Scannerstand': 'Scanner status',
    'SCMDB · DEUTSCHE SPRACHDATEI': 'SCMDB · GERMAN LANGUAGE FILE', 'QUELLE // LOG-SCAN': 'SOURCE // LOG SCAN',
    // Kategorien, Ausrüstung
    'FPS-Ausrüstung': 'FPS gear', 'Vehikel-Komponenten': 'Vehicle components', 'Waffentechnologie': 'Weapon technology',
    'Rüstungsklasse': 'Armour class', 'Rüstungsslot': 'Armour slot', 'Munitionstyp': 'Ammo type', 'Leicht': 'Light', 'Mittel': 'Medium',
    'Schwer': 'Heavy', 'Helm': 'Helmet', 'Rucksack': 'Backpack', 'Basisanzug': 'Undersuit', 'Fluganzug': 'Flight suit',
    'Pistole': 'Pistol', 'Gewehr': 'Rifle', 'Schrotflinte': 'Shotgun', 'Scharfschützengewehr': 'Sniper rifle',
    'Ballistisch': 'Ballistic', 'Energie': 'Energy', 'Elektron': 'Electron', 'Neutron': 'Neutron', 'Tachyon': 'Tachyon',
    'Strahlung': 'Radiation', 'Verzerrung': 'Distortion', 'Umwelt': 'Environment', 'Tarnung': 'Stealth', 'Kampf': 'Combat',
    'Medizin': 'Medical', 'Rennsport': 'Racing', 'Entdecker': 'Explorer', 'Jäger': 'Hunter', 'Kosmonaut': 'Cosmonaut', 'Techniker': 'Engineer',
    'ϟ Kraftwerk': 'ϟ Power plant', '∩ Traktorstrahl': '∩ Tractor beam', '⌁ Radar': '⌁ Radar', '▣ Betankung': '▣ Refuelling',
    '◆ Bergbau-Modul': '◆ Mining module', '◈ Schild': '◈ Shield', '♻ Bergung': '♻ Salvage', '⚔ Schiffswaffe': '⚔ Ship weapon',
    '⛏ Bergbaulaser': '⛏ Mining laser', '❄ Kühler': '❄ Cooler', '➤ Quantumantrieb': '➤ Quantum drive', '⬢ Erzbehälter': '⬢ Ore pod',
    // Kategorien aus scbp/taxonomy.json
    'Anbauteile': 'Attachments', 'Arme': 'Arms', 'Artillerie': 'Artillery', 'Basisanzüge': 'Undersuits', 'Beine': 'Legs',
    'Bergbau': 'Mining', 'Bergbau-Module': 'Mining modules', 'Bergung': 'Salvage', 'Betankung': 'Refuelling', 'Brillen': 'Glasses',
    'Brust': 'Torso', 'Erzbehälter': 'Ore pods', 'Geschütze': 'Turrets', 'Handschuhe': 'Gloves', 'Helme': 'Helmets', 'Hosen': 'Trousers',
    'Hüte': 'Hats', 'Jacken': 'Jackets', 'Kleidung': 'Clothing', 'Kraftwerke': 'Power plants', 'Kühler': 'Coolers',
    'Lackierungen': 'Paints', 'Langwaffen': 'Long guns', 'Medizinisch': 'Medical', 'Munition': 'Ammunition',
    'Munition & Magazine': 'Ammo & magazines', 'Nahkampf': 'Melee', 'Oberteile': 'Tops', 'Pistolen': 'Pistols',
    'QT-Antriebe': 'Quantum drives', 'Raketengestelle': 'Missile racks', 'Rucksäcke': 'Backpacks', 'Rüstung': 'Armour',
    'Schilde': 'Shields', 'Schuhe': 'Shoes', 'Spezielles': 'Special', 'Sprungmodule': 'Jump modules', 'Technologie': 'Technology',
    'Traktorstrahl': 'Tractor beam', 'Täuschkörper': 'Decoys', 'Vehikel': 'Vehicle', 'Waffen': 'Weapons', 'Werkzeuge': 'Tools',
    'Wurfwaffen': 'Throwables', 'Zubehör': 'Accessories', 'Behälter': 'Containers',
    'Schwere Rüstung': 'Heavy armour', 'Mittlere Rüstung': 'Medium armour', 'Leichte Rüstung': 'Light armour',
    'Auftragsprämie': 'Mission reward', 'Bauplan-Pools': 'Blueprint pools', 'Auftrag öffnen ↗': 'Open mission ↗',
    'Zeitlimit': 'Time limit', 'SÖLDNER': 'MERCENARY', 'Söldner': 'Mercenary',
    'BILD WIRD GEPRÜFT': 'CHECKING IMAGE', 'passende offene Baupläne': 'matching open blueprints',
    'Bauplan offen': 'Blueprint open', 'Bauplan erhalten': 'Blueprint collected',
    'Für diese Beschreibung liegt keine deutsche Übersetzung vor.': 'Original English description.',
    'Jeder Pool wird unabhängig ausgewertet. Die angezeigte Pool-Chance ist keine Garantie für ein bestimmtes Item. Vollständig gesammelte Pools liefern keine weiteren Baupläne.':
      'Each pool is evaluated on its own. The pool chance shown is no guarantee for a specific item. Fully collected pools give no further blueprints.'
  });
  // "Kühler (45)" und "Alle Rüstung": Kern über das Wörterbuch übersetzen
  var core = function (t) { return D[t] || t; };

  window.SCBP_I18N_RULES = (window.SCBP_I18N_RULES || []).concat([
    [/^(\d+) \/ (\d+) Items ausgewählt$/, '$1 / $2 items selected'],
    [/^(\d+) Ergebnisse$/, '$1 results'],
    [/^([\d.]+) Fundorte$/, '$1 locations'],
    [/^1 Fundort$/, '1 location'],
    [/^([\d.]+) PASSENDE AUFTRÄGE$/, '$1 MATCHING MISSIONS'],
    [/^([\d.]+) VON ([\d.]+) BAUPLÄNEN$/, '$1 OF $2 BLUEPRINTS'],
    [/^(\d+) Typen$/, '$1 types'],
    [/^Aktiv · angenommen · (.+)$/, 'Active · accepted · $1'],
    [/^Erfolgreich abgeschlossen · (.+)$/, 'Completed successfully · $1'],
    [/^Alle schließen \((\d+)\)$/, 'Close all ($1)'],
    [/^Auswahl schließen \((\d+)\)$/, 'Close selection ($1)'],
    [/^LIVE · (\d+) von (\d+) offenen Einträgen sichtbar · maximal (\d+)\.$/, 'LIVE · $1 of $2 open entries visible · max. $3.'],
    // 6.0.4: Seiten der Live-Aufträge
    [/^([A-Z-]+) · Einträge (\d+)–(\d+) von (\d+) · Seite (\d+) von (\d+)\.$/, '$1 · entries $2–$3 of $4 · page $5 of $6.'],
    [/^([A-Z-]+) · keine offenen Einträge\.$/, '$1 · no open entries.'],
    [/^Seite (\d+) von (\d+)$/, 'Page $1 of $2'],
    [/^Quelle: SCMDB · Spielversion (.+?)\. Enthält auch Aufträge ohne Bauplanbelohnungen und bereits vollständig gesammelte Belohnungspools\. Der Status „aktiv“ beschreibt den Katalog, nicht deinen persönlichen Auftragsverlauf\.$/,
      'Source: SCMDB · game version $1. Also lists missions without blueprint rewards and fully collected reward pools. “Active” describes the catalog, not your personal mission history.'],
    [/^Zusatzinformationen: (.+)$/, 'Additional info: $1'],
    [/^([\d.]+) Baupläne erhalten · ([\d.]+) noch offen · ([\d.]+) mit SCMDB-Dossier\.$/, '$1 blueprints collected · $2 still open · $3 with SCMDB dossier.'],
    [/^Größe (\d+)$/, 'Size $1'],
    [/^Ziel der (.+?): (.+)$/, 'Target of the $1: $2'],
    [/^([\d,.]+) % Chance · (\d+) von (\d+)$/, '$1 % chance · $2 of $3'],
    [/^Alle Einträge in (.+) anzeigen$/, function (m, a) { return 'Show all entries in ' + core(a); }],
    [/^(.+?) \((\d+)\)$/, function (m, a, n) { return core(a) + ' (' + n + ')'; }],
    [/^Alle (.+)$/, function (m, a) { return D[a] ? 'All ' + D[a].toLowerCase() : m; }],
    [/^Filter entfernen: (.+)$/, 'Remove filter: $1'],
    [/^· (\S+) SCU · max\. Containergröße: (.+) SCU$/, '· $1 SCU · max. container size: $2 SCU'],
    // Event- und Rufpunkte: "146 Punkte · RSI Discovery Month (Verteidigung / Gesamt)"
    [/Punkte · /g, 'points · ', true], [/\(Verteidigung/g, '(Defense', true], [/\(Sammlung/g, '(Collection', true],
    [/\(Transport/g, '(Transport', true], [/ \/ Gesamt\)/g, ' / Total)', true], [/\(Gesamt\)/g, '(Total)', true],
    [/ · in der Gruppe geteilt/g, ' · shared in group', true]
  ]);
})();

/* Etappe 3: Einstellungen, Quellen, Logscanner, Bildarchiv, OBS-Studio, Spende, Showcase. */
(function () {
  'use strict';
  var D = window.SCBP_I18N = window.SCBP_I18N || {};
  var add = function (o) { for (var k in o) D[k] = o[k]; };
  var core = function (t) { return D[t] || t; };
  add({
    'Einstellungsbereiche': 'Settings sections', 'KONFIGURATION · 3.2': 'CONFIGURATION · 3.2', 'Alles an seinem Platz.': 'Everything in its place.',
    '01 Erscheinungsbild': '01 Appearance', '02 Windows & Pfade': '02 Windows & paths', '03 Synchronisierung': '03 Sync',
    '04 Daten & Sprache': '04 Data & language', '05 Direkte OBS-Anbindung': '05 Direct OBS connection', '06 Verbindung': '06 Connection',
    '07 Sichern & Prüfen': '07 Back up & check', 'Standardansicht': 'Default view', 'Darstellungsdichte': 'Display density',
    'Kompakt': 'Compact', 'Großzügig': 'Spacious', 'Schriftgröße': 'Font size', 'Animationen aktivieren': 'Enable animations',
    'Design auswählen': 'Choose design', 'Filterdesign auswählen': 'Choose filter design', 'Dossierbreite · Prozent': 'Dossier width · percent',
    'Dossierschrift · Größenstufe': 'Dossier font · size level', 'Bauplankarten · Prozent': 'Blueprint cards · percent',
    'Der Filterblock startet eingeklappt.': 'The filter block starts collapsed.', 'Auftragsfilter auf der Auftragsseite anzeigen': 'Show mission filters on the mission page',
    '130 % vergrößert das seitliche Dossier um 30 %.': '130 % makes the side dossier 30 % larger.',
    '70 % entspricht der gewünschten Verkleinerung um 30 %.': '70 % is the requested 30 % reduction.', '14–20 Pixel als Grundgröße.': '14–20 pixels as base size.',
    '20 entspricht der Typografie der Auftragsplanung. Kleinere oder größere Werte skalieren Titel, Text und Belohnungs-Pools gemeinsam.':
      '20 matches the mission planner typography. Smaller or larger values scale title, text and reward pools together.',
    'Die Entwürfe 1, 8 und 9 verändern nur den Filterbereich. Deine Filterauswahl bleibt beim Wechsel erhalten.':
      'Designs 1, 8 and 9 only change the filter area. Your filter selection is kept when you switch.',
    'Wähle ein Design für die direkte Vorschau. Erst „Einstellungen übernehmen“ speichert die Auswahl für deine anderen Geräte. Jede Ansicht unterstützt alle Funktionen.':
      'Choose a design for a live preview. Only “Apply settings” saves the choice for your other devices. Every view supports all features.',
    'Einstellungen übernehmen': 'Apply settings', 'Einstellungen exportieren': 'Export settings', 'Einstellungen importieren': 'Import settings',
    'Vorherige Einstellungen wiederherstellen': 'Restore previous settings', 'Alle Einstellungen gespeichert': 'All settings saved',
    'Einstellungen ↗': 'Settings ↗', 'Verwerfen': 'Discard', 'Erweiterte Daten-Einstellungen': 'Advanced data settings',
    'Exportiere deine Einstellungen oder stelle die zuletzt gespeicherte Konfiguration wieder her. Ein Import wird zuerst als bearbeitbare Vorschau geladen.':
      'Export your settings or restore the last saved configuration. An import is first loaded as an editable preview.',
    'Der Export enthält keine Verbindungsschlüssel und keinen Bauplanbestand. Für eine vollständige Sicherung die Ordner „data“, „state“ und „media“ auf der Synology sichern. Die Diagnose zeigt den lokalen Zustand und die zuletzt bekannten Abrufe; Windows-Pfade bestätigt ausschließlich der Helfer.':
      'The export contains no connection keys and no blueprint inventory. For a full backup, save the “data”, “state” and “media” folders on the Synology. The diagnosis shows the local state and the last known fetches; only the helper confirms Windows paths.',
    'Das Obsidian aus 2.1: goldene Galerie mit festem Dossier. Jetzt ohne untere OBS-Leiste.': 'The Obsidian from 2.1: golden gallery with a fixed dossier. Now without the bottom OBS bar.',
    'Dein Originalmotiv in einer eigenständigen Sammlung: Rot, Carbon und transparente Flächen mit großem Dossier.': 'Your original motif as its own collection: red, carbon and transparent surfaces with a large dossier.',
    'Ein Observatorium für deine Sammlung. Nachtblau, Kupfer und großzügige Vitrinen mit seitlichem Dossier.': 'An observatory for your collection. Night blue, copper and generous showcases with a side dossier.',
    'Eine filmische Sammlung in Pflaume und Elfenbein. Große Typografie, dunkle Vitrinen und ein schwebendes Dossier.': 'A cinematic collection in plum and ivory. Large type, dark showcases and a floating dossier.',
    'Eine helle Ausstellung: mineralische Flächen, smaragdgrüne Akzente und eine ruhige, breite Galerie.': 'A bright exhibition: mineral surfaces, emerald accents and a calm, wide gallery.',
    'Graphit, warmes Kupfer und industrielle Details.': 'Graphite, warm copper and industrial details.',
    'Helle Listenansicht mit Petrolakzenten, Vergleichsauswahl und seitlichem Dossier.': 'Bright list view with petrol accents, comparison and a side dossier.',
    'Helles Porzellan, Petrol und klare, großzügige Flächen.': 'Bright porcelain, petrol and clear, generous surfaces.',
    'Mitternachtsblau, Cyan und präzise taktische Linien.': 'Midnight blue, cyan and precise tactical lines.',
    'Original aus Version 2.0: Anthrazit, Champagnergold, großer Fortschritt und klassische Galerie.': 'Original from version 2.0: anthracite, champagne gold, big progress bar and classic gallery.',
    'Taktische Auftragszentrale mit Cyan, Fundwegen, Belohnungspools und Einsatz­zielen.': 'Tactical mission hub with cyan, ways to find, reward pools and mission goals.',
    'Tiefschwarz, Silber und konsequente Kontraste.': 'Deep black, silver and strong contrasts.', 'Violette Lichtverläufe, weiche Konturen und Tiefe.': 'Violet light gradients, soft contours and depth.',
    'Drei klare Schritte mit roter Hervorhebung und dunklen Flächen.': 'Three clear steps with red highlights and dark surfaces.',
    'Aurum-Leiste · wie im Entwurf': 'Aurum bar · as in the draft', 
    'Dein Filterbereich. Unabhängig vom Dashboard.': 'Your filter area. Independent of the dashboard.',
    'Wie das Dashboard': 'Like the dashboard', 
    'Dein Windows-PC': 'Your Windows PC', 'Vom PC auf die Synology': 'From the PC to the Synology', 'Wird auf deinem Windows-PC gelesen.': 'Read on your Windows PC.',
    'Diese Ordner liest der Windows-Helfer auf deinem PC. Er liest nur die Spielmeldungen aus Game.log und LogBackups; daraus entsteht dein Besitz.':
      'The Windows helper reads these folders on your PC. It only reads the game messages from Game.log and LogBackups; your ownership comes from them.',
    'Star-Citizen-Stammordner': 'Star Citizen root folder', 'Star-Citizen-Logs': 'Star Citizen logs',
    'Unterordner aus Stammordnern ableiten': 'Derive sub folders from root folders',
    'Deutsche Sprachdatei · JSON': 'German language file · JSON', 'Spielkanal': 'Game channel', 'Kanal': 'Channel',
    'SCMDB · KATALOG': 'SCMDB · CATALOG',
    'Trace-Ordner als Referenz. Der direkte Scanner liest die unten angegebenen Game.log-Dateien.': 'Trace folder for reference. The direct scanner reads the Game.log files below.',
    'Neue Pfade werden auf dem PC geprüft. Bei einem Fehler arbeitet der Helfer mit der letzten gültigen Konfiguration weiter. Der NAS-Zielordner muss als Windows-Freigabe erreichbar sein.':
      'New paths are checked on the PC. On an error the helper keeps working with the last valid configuration. The NAS target folder must be reachable as a Windows share.',
    'NAS-Datenordner · Windows-Freigabe': 'NAS data folder · Windows share', 'DISKSTATION ist ein Vorschlag. Den tatsächlichen Freigabenamen eintragen.': 'DISKSTATION is a suggestion. Enter the actual share name.',
    'Aktuelle Game.log': 'Current Game.log', 'Historische LogBackups': 'Historical log backups', 'Spiel-Log': 'Game log',
    'Automatische Synchronisierung aktiv': 'Automatic sync active', 'Jetzt synchronisieren': 'Sync now', 'Lokale Prüfung · Sekunden': 'Local check · seconds',
    'Neue Bauplanmeldungen werden direkt aus den konfigurierten Logs erkannt. Lokale Änderungen werden automatisch übertragen. Katalog und Übersetzungen aktualisiert die Synology unabhängig im Hintergrund. Der Windows-PC liefert die Spielmeldungen.':
      'New blueprint messages are detected directly from the configured logs. Local changes are transferred automatically. The Synology updates catalog and translations on its own in the background. The Windows PC delivers the game messages.',
    'Spielmeldungen und lokale Dateien benötigen den Windows-PC. NAS-Katalog und GitHub-Übersetzungen werden auch bei ausgeschaltetem PC aktualisiert.':
      'Game messages and local files need the Windows PC. The NAS catalog and GitHub translations update even when the PC is off.',
    'Historische Backups im Hintergrund einlesen': 'Read historical backups in the background', 'Gespeichert · wartet auf den Windows-PC': 'Saved · waiting for the Windows PC',
    'Katalogquelle': 'Catalog source', 'Synology · SCMDB automatisch': 'Synology · SCMDB automatic', 'Synology · GitHub-Sprachdatei': 'Synology · GitHub language file',
    'Lokaler Katalog · Windows-Dateien': 'Local catalog · Windows files', 'SCMDB-Datenadresse': 'SCMDB data address', 'Deutsche Auftragsübersetzung': 'German mission translation',
    'SCMDB & Übersetzung neu prüfen': 'Recheck SCMDB & translation', 'SCMDB & Übersetzung · Stunden': 'SCMDB & translation · hours', 'Quellen-Cache · Stunden': 'Source cache · hours',
    'Netzwerk-Zeitlimit · Sekunden': 'Network timeout · seconds', 'Offline-Modus · keine externen Abrufe': 'Offline mode · no external fetches',
    'Für externe Abrufe des Dashboards und des Windows-Helfers.': 'For external fetches by the dashboard and the Windows helper.',
    'Wird beim nächsten Snapshot-Aufbau angewendet.': 'Applied when the next snapshot is built.', 'Bilder pro Item': 'Images per item', 'Fundwege pro Item': 'Ways to find per item',
    'Alle Fundwege je Item durchlaufen': 'Go through all ways to find per item', 'Externe Quellen': 'External sources', 'Externe Quellen aktiv': 'External sources active',
    'Quellen konfigurieren ↗': 'Configure sources ↗', 'Quellen neu prüfen': 'Recheck sources', 'Quellen mit Herkunft': 'Sources with origin', 'Wissen mit Herkunft.': 'Knowledge with origin.',
    'Quellenprüfung läuft im Hintergrund …': 'Source check running in the background …', 'Lokaler Cache aktiv': 'Local cache active', 'Katalog:': 'Catalog:', 'Besitzstand:': 'Ownership:',
    'Spielversion:': 'Game version:', 'Davon': 'Of these', 'Bereit · noch kein Abruf': 'Ready · no fetch yet', 'Über den Bauplan hinaus.': 'Beyond the blueprint.',
    'Dein lokaler Katalog bleibt die Grundlage. Ergänzende Quellen bringen Bilder, Bezugsorte, Baupläne und Schiffsdaten dazu.': 'Your local catalog stays the basis. Additional sources add images, places to buy, blueprints and ship data.',
    'Abgleich von Item- und Bauplan-UUIDs, Materialien, Freischalt-Pools und ergänzenden Auftragsdaten.': 'Matching of item and blueprint UUIDs, materials, unlock pools and extra mission data.',
    'SCMDB liefert Fundwege und Belohnungs-Pools. Die deutsche Sprachdatei ergänzt Aufträge und Quellen. Bilder werden über UUID-geprüfte Wiki-Seiten oder Cornerstone zugeordnet und dauerhaft gespeichert. UEX, CitizenHQ und FleetYards ergänzen die Daten. Fehlende Übersetzungen bleiben erkennbar.':
      'SCMDB provides ways to find and reward pools. The German language file adds missions and sources. Images are matched via UUID-checked wiki pages or Cornerstone and stored permanently. UEX, CitizenHQ and FleetYards add data. Missing translations stay visible.',
    'Bezugsorte und UUID-bezogene Bilder der öffentlichen Itemseiten. Dieser Adapter hängt vom Seitenaufbau ab.': 'Places to buy and UUID-based images from public item pages. This adapter depends on the page layout.',
    'Direkter MediaWiki-Zugriff. Die UUID der Itemseite bestätigt das Bild. Mit der Wiki-API verbundene Quelle.': 'Direct MediaWiki access. The item page UUID confirms the image. Source linked to the wiki API.',
    'Die Wiki-API und StarCitizen.tools gehören zum selben Wiki-Umfeld. Ein deaktivierter oder ausgefallener Dienst entfernt keine bereits gespeicherten Bilder.': 'The wiki API and StarCitizen.tools belong to the same wiki family. A disabled or failed service does not remove images already stored.',
    'Item-Beschreibungen und technische Daten. Bilder werden erst nach zusätzlicher Identitätsprüfung übernommen.': 'Item descriptions and technical data. Images are only taken after an extra identity check.',
    'Zusätzliche Itemdaten, Verkaufsorte und Preise. Die ausgesetzten Itembilder werden nicht angefordert.': 'Extra item data, shops and prices. Suspended item images are not requested.',
    'Eigene Schiffsbibliothek mit Herstellern, Einsatzrollen und Verfügbarkeiten. Getrennt von den Itembildern.': 'Own ship library with manufacturers, roles and availability. Kept apart from item images.',
    'Nach diesem Intervall werden Metadaten neu geprüft. Heruntergeladene Bilddateien bleiben dauerhaft erhalten.': 'After this interval metadata is checked again. Downloaded image files are kept permanently.',
    'CitizenHQ · Baupläne & Aufträge': 'CitizenHQ · blueprints & missions', 'Cornerstone · Itemseiten & Bilder': 'Cornerstone · item pages & images',
    'StarCitizen.tools · direkter Bildzugriff': 'StarCitizen.tools · direct image access', 'UEX · Itemdaten & Verkaufsorte': 'UEX · item data & shops',
    'FleetYards · Schiffsbibliothek': 'FleetYards · ship library', 'FLEETYARDS / SCHIFFSBIBLIOTHEK': 'FLEETYARDS / SHIP LIBRARY', 'ÜBERSETZUNG: STAR CITIZEN DEUTSCH-INI': 'TRANSLATION: STAR CITIZEN DEUTSCH-INI',
    'Schiffe werden separat geführt. Sie werden nicht mit gleichnamigen Komponenten verknüpft.': 'Ships are kept separately. They are not linked to components of the same name.',
    'Schiff suchen': 'Search ship', 'Schiff oder Hersteller …': 'Ship or manufacturer …', 'Schiffsdaten laden': 'Load ship data', 'Gespeicherte Schiffsliste anzeigen': 'Show saved ship list', 'Gespeicherte Schiffsliste wird geladen …': 'Loading saved ship list …', 'Weitere Schiffe': 'More ships',
    'Aufträge aus deinem Log': 'Missions from your log', 'Letzte Bauplanfunde': 'Latest blueprint finds', 'Besitzstand eingelesen': 'Ownership read', 'Backups gelesen': 'Backups read',
    'Backups ausstehend': 'Backups pending', 'Prüfungen ausstehend': 'Checks pending', 'Keine ungeklärten Funde.': 'No unresolved finds.', 'ungeklärt': 'unresolved',
    'Zuordnung prüfen': 'Check assignment', 'Scanner konfigurieren ↗': 'Configure scanner ↗', 'Scanstatus, Aufträge und ungeklärte Funde ansehen ↗': 'View scan status, missions and unresolved finds ↗',
    'Bestätigte Bauplanmeldungen, laufende Aufträge und nachvollziehbare Zuordnungen.': 'Confirmed blueprint messages, running missions and traceable assignments.',
    'Unbekannte Namen werden nicht automatisch als Besitz gewertet. Wähle das tatsächlich gemeinte Item. Eine manuelle Zuordnung erzeugt keine OBS-Meldung.':
      'Unknown names are not counted as owned automatically. Pick the item actually meant. A manual assignment creates no OBS message.',
    'Historische Funde ergänzen den Bestand ohne OBS-Einblendung.': 'Historical finds add to the inventory without an OBS overlay.',
    'Eine Bauplan-Zuordnung innerhalb des Zeitfensters ist als zeitlich vermutet gekennzeichnet.': 'A blueprint assignment within the time window is marked as assumed by timing.',
    'Zeitliche Zuordnung ist eine Vermutung, keine bestätigte Quelle.': 'Timing-based assignment is an assumption, not a confirmed source.',
    'Zeitfenster für Auftragszuordnung · Sekunden': 'Time window for mission assignment · seconds', 'Direkter Logscanner': 'Direct log scanner', 'Abgelaufen': 'Expired',
    'Erhaltene Baupläne': 'Collected blueprints', 'erhaltene Altbestände': 'collected older items', 'LIVE-DATENSATZ': 'LIVE RECORD', 'Art': 'Type', 'Empfänger': 'Recipient',
    'Angezeigt': 'Shown', 'in Warteschlange': 'queued', 'TEST · Übersprungen': 'TEST · skipped', 'MINDESTRANG': 'MINIMUM RANK', 'PRÄMIE': 'REWARD',
    'BELOHNUNGSPOOL': 'REWARD POOL', 'ITEM-CHANCE · BASIS': 'ITEM CHANCE · BASE', 'aus Belohnungspools ·': 'from reward pools ·', 'pro Gruppe': 'per group',
    'Bildspeicher': 'Image storage', 'Permanenter NAS-Bildspeicher': 'Permanent NAS image storage', 'Bild hochladen': 'Upload image', 'Bilderordner neu einlesen': 'Rescan image folder',
    'Item suchen': 'Search item', 'Name, Hersteller oder Item-ID …': 'Name, manufacturer or item ID …', 'Item-Bild anzeigen': 'Show item image',
    'KEIN BILD VERFÜGBAR': 'NO IMAGE AVAILABLE', 'KEIN ITEM-BILD VERFÜGBAR': 'NO ITEM IMAGE AVAILABLE', 'Kein eindeutig zugeordnetes Quellenbild gespeichert.': 'No clearly matched source image stored.',
    'Dauerhaft gespeicherte Quellenbilder': 'Permanently stored source images', 'lokale Bilder': 'local images', 'eindeutig getrennte Items': 'clearly separated items',
    'Ein fester Platz für jedes Bild.': 'A fixed place for every image.', 'DEIN BILD. DAS RICHTIGE ITEM.': 'YOUR IMAGE. THE RIGHT ITEM.', 'Ordnerpfad kopieren': 'Copy folder path',
    'Eigene Ansichten haben Vorrang. Externe Bilder werden nach eindeutiger Zuordnung dauerhaft auf deiner Synology gespeichert.': 'Your own views take priority. External images are stored permanently on your Synology after a clear match.',
    'Die Ordner folgen deinen Kategorien. Jedes Item hat einen eigenen Ordner mit seiner eindeutigen ID. Kopiere dort': 'The folders follow your categories. Every item has its own folder with its unique ID. Copy into it',
    'hinein – oder lade die Bilder direkt hier hoch. Maximal drei eigene Ansichten, jeweils bis 12 MB. Ein Citadel-Rüstungsteil und der Citadel-Schildgenerator bleiben getrennt.':
      '– or upload the images directly here. At most three own views, up to 12 MB each. A Citadel armour piece and the Citadel shield generator stay separate.',
    '0 blendet Bilder aus. Maximal drei Ansichten.': '0 hides images. At most three views.', 'Fehlende Bilder im Hintergrund prüfen': 'Check missing images in the background',
    'Wechsel zwischen vorhandenen Bildern.': 'Switch between available images.', 'Bildwechsel · Sekunden': 'Image change · seconds', 'Suche verfeinern, um weitere Items zu finden.': 'Refine the search to find more items.',
    'ANSICHT 01': 'VIEW 01', 'ANSICHT 02': 'VIEW 02', 'ANSICHT 03': 'VIEW 03', 'oder': 'or',
    'In OBS verbinden': 'Connect in OBS', 'OBS-Adresse kopieren': 'Copy OBS address', 'Browserquelle öffnen ↗': 'Open browser source ↗', 'Link kopieren': 'Copy link', 'URL kopieren': 'Copy URL',
    'In OBS eine neue „Browser“-Quelle hinzufügen.': 'Add a new “Browser” source in OBS.', 'Die folgende Adresse als URL einfügen.': 'Paste the following address as URL.',
    'Breite und Höhe wie unten einstellen. „Quelle deaktivieren, wenn nicht sichtbar“ ausschalten, damit Funde laufend empfangen werden.':
      'Set width and height as below. Turn off “Shutdown source when not visible” so finds keep arriving.',
    'Browserquelle: 3840 × 2160 Pixel': 'Browser source: 3840 × 2160 pixels', '3840 × 2160 · in OBS einstellen': '3840 × 2160 · set in OBS', 'OBS-Browserquellen-Größe': 'OBS browser source size',
    'OBS-Design': 'OBS design', 'OBS-Darstellung': 'OBS display', 'OBS-Vorschau': 'OBS preview', 'OBS-Designvorschau mit Testdaten': 'OBS design preview with test data',
    'Designvorschau mit Testdaten. Sie verändert deinen Besitzstand und die OBS-Warteschlange nicht.': 'Design preview with test data. It does not change your ownership or the OBS queue.',
    'Designvorschau wiederholen': 'Repeat design preview', 'Vorschau deiner Auswahl': 'Preview of your selection', 'Vorschau der Browserquelle': 'Browser source preview', 'Vorschau · Testfund': 'Preview · test find',
    'Testfund an OBS senden': 'Send test find to OBS', 'Warteschlange leeren': 'Clear queue', 'Live-Einblendung beobachten': 'Watch live overlay', 'Position im Stream': 'Position in stream',
    'Oben rechts': 'Top right', 'Unten links': 'Bottom left', 'Unten rechts': 'Bottom right', 'Dauer & Position einstellen ↗': 'Set duration & position ↗',
    'Neue Baupläne automatisch einblenden': 'Show new blueprints automatically', 'Automatische Fundmeldungen aktiv': 'Automatic find alerts active', 'Fundmeldungen gespeichert': 'Find alerts saved',
    'Neue Auftragsannahmen 20 Sekunden in OBS anzeigen': 'Show new accepted missions in OBS for 20 seconds', 'Nur neue Live-Annahmen; mehrere Annahmen werden nacheinander angezeigt.': 'Only new live acceptances; several are shown one after another.',
    'Auftragsdetails · Einblenddauer in Sekunden': 'Mission details · display time in seconds', 'Bauplan / Belohnungsgruppe · Sekunden': 'Blueprint / reward group · seconds',
    'Maximales Wartealter · Sekunden': 'Maximum queue age · seconds', 'Nicht gestartete Funde verfallen danach, falls OBS nicht verbunden war.': 'Finds not shown expire after this if OBS was not connected.',
    'Bis zu neun Baupläne pro Gruppe.': 'Up to nine blueprints per group.', 'Automatischer Wechsel · Sekunden': 'Automatic change · seconds', 'Automatischen Wechsel fortsetzen': 'Resume automatic change',
    'Festes Item · optional': 'Fixed item · optional', 'Fester Auftrag · optional': 'Fixed mission · optional', 'Bauplanstatus': 'Blueprint status',
    'Name oder INI-Schlüssel. Leer lassen für automatischen Wechsel.': 'Name or INI key. Leave empty for automatic change.', 'Auftrags-ID oder Debug-Name. Eine Live-Auswahl hat Vorrang.': 'Mission ID or debug name. A live selection takes priority.',
    'Dossier-Hintergrund transparent': 'Transparent dossier background', 'Dossier · ausführliche Ansicht': 'Dossier · detailed view', 'Dossier-Ansicht öffnen ↗': 'Open dossier view ↗',
    'Zusätzliche Dossier-Browserquelle': 'Extra dossier browser source', 'Kompakte Bauplan-Leiste': 'Compact blueprint bar', 'Ansicht öffnen ↗': 'Open view ↗', 'Öffnen ↗': 'Open ↗',
    'Die Leiste liegt am unteren Bildrand; Dossier zeigt die ausführlichen Auftragsdaten.': 'The bar sits at the bottom edge; the dossier shows detailed mission data.',
    'Neue Baupläne erscheinen automatisch in deiner OBS-Browserquelle. Einzelne Funde oder mehrere zusammen – standardmäßig 15 Sekunden, danach wieder vollständig transparent.':
      'New blueprints appear automatically in your OBS browser source. Single finds or several together – 15 seconds by default, then fully transparent again.',
    'Neue Baupläne werden nach dem Einlesen automatisch in der OBS-Browserquelle eingeblendet. Mehrere gleichzeitige Funde erscheinen in Gruppen. „In OBS anzeigen“ fügt zusätzlich eine manuelle Einblendung hinzu.':
      'New blueprints are shown automatically in the OBS browser source once read. Several finds at once appear in groups. “Show in OBS” adds a manual overlay as well.',
    'Der erste gültige Besitzstand ist die Ausgangsbasis. Erst neue Funde danach werden gemeldet. Mehr als sechs gleichzeitige Funde erscheinen in aufeinanderfolgenden Gruppen. Die Erkennung setzt einen laufenden Windows-Helfer voraus.':
      'The first valid ownership is the baseline. Only new finds after that are announced. More than six finds at once appear in consecutive groups. Detection needs a running Windows helper.',
    'Der erste gültige Besitzstand ist die Ausgangsbasis. Erst neue Funde danach werden gemeldet. Mehr als sechs gleichzeitige Funde erscheinen in aufeinanderfolgenden Gruppen. Die Erkennung läuft, solange das Programm auf diesem PC läuft; der Log-Leser ist eingebaut.':
      'The first valid ownership is the baseline. Only new finds after that are announced. More than six finds at once appear in consecutive groups. Detection runs while the program is running on this PC; the log reader is built in.',
    'Neue Baupläne': 'New blueprints', 'Neuer Bauplan': 'New blueprint', 'BAUPLAN ERHALTEN': 'BLUEPRINT COLLECTED', '15 Sekunden': '15 seconds',
    'EIN NEUER FUND. EIN MOMENT FÜR DEINEN STREAM.': 'A NEW FIND. A MOMENT FOR YOUR STREAM.', 'Deine Funde gehen live.': 'Your finds go live.', 'Deine Sammlung geht live': 'Your collection goes live',
    'Overlays, Einblendungen und Ausrüstung für den Stream.': 'Overlays, alerts and gear for the stream.', 'Stream & Technik': 'Stream & tech',
    'Verbindung': 'Connection', 'Verbindungsdaten': 'Connection data', 'Verbindungen prüfen': 'Check connections', 'Windows-Verbindung herunterladen': 'Download Windows connection',
    'Verbindungsdatei herunterladen und den Windows-Helfer installieren.': 'Download the connection file and install the Windows helper.',
    'Speichere zuerst die erreichbare Dashboard-Adresse und den NAS-Datenpfad. Lade dann die Verbindungsdatei herunter, lege sie neben „Install-AutoSync.cmd“ und starte die Installation auf deinem PC.':
      'First save the reachable dashboard address and the NAS data path. Then download the connection file, put it next to “Install-AutoSync.cmd” and start the installation on your PC.',
    'Die Datei enthält den Verbindungsschlüssel für deinen Windows-Helfer. Zugangsdaten zur NAS-Freigabe werden weiterhin von Windows verwaltet.':
      'The file contains the connection key for your Windows helper. Windows keeps managing the NAS share credentials.',
    'Dashboard-Adresse im Heimnetz': 'Dashboard address on the home network', 'Eine vom Windows-PC und OBS-Rechner erreichbare Adresse verwenden.': 'Use an address reachable from the Windows PC and the OBS computer.',
    'Docker-Bereitstellung': 'Docker deployment', 'Compose-Datei erzeugen': 'Create compose file', 'Veröffentlichter Docker-Port': 'Published Docker port', 'NAS-Projektpfad': 'NAS project path',
    'Wird in die erzeugte Compose-Datei übernommen.': 'Used in the generated compose file.',
    'Port und NAS-Projektpfad sind Vorgaben für die erzeugte Compose-Datei. Änderungen werden erst wirksam, wenn du das Projekt im Synology Container Manager mit dieser Datei neu erstellst. Anschließend die Dashboard-Adresse und die Windows-Verbindung aktualisieren.':
      'Port and NAS project path are defaults for the generated compose file. Changes take effect only after you rebuild the project with this file in Synology Container Manager. Then update the dashboard address and the Windows connection.',
    'Bind-Mount in der Compose-Datei. Nach einer Änderung das Docker-Projekt neu erstellen und vorhandene Bilder in den neuen Ordner kopieren.': 'Bind mount in the compose file. After a change, rebuild the Docker project and copy existing images to the new folder.',
    'Server & Betrieb': 'Server & operation', 'Strom, Speicher und Wartung für NAS und Dienste.': 'Power, storage and maintenance for the NAS and services.', 'HTTPS · verschlüsselt': 'HTTPS · encrypted',
    'Gut verbunden. Gut gesichert.': 'Well connected. Well secured.', 'Immer auf deinem Stand': 'Always up to date', 'Bereit für den Einsatz': 'Ready for action', 'TRANSFER BEREIT': 'TRANSFER READY',
    'SC BLUEPRINT DASHBOARD · LOKAL AUF DEINER SYNOLOGY': 'SC BLUEPRINT DASHBOARD · LOCAL ON YOUR SYNOLOGY',
    'Danke, Citizen.': 'Thank you, citizen.', 'Unterstütze die Crew.': 'Support the crew.', 'Jetzt unterstützen': 'Support now', 'Unterstützen über PayPal': 'Support via PayPal', 'Freiwillig': 'Voluntary',
    'ZAHLUNGSKANAL': 'PAYMENT CHANNEL', 'MOBIL SCANNEN': 'SCAN ON MOBILE', 'Kamera aufs Handy, Code scannen, fertig.': 'Point your phone camera, scan the code, done.',
    'Wofür die Unterstützung genutzt wird': 'What the support is used for', 'Weiterentwicklung': 'Further development', 'Neue Funktionen für Archiv, Scanner und Live-Aufträge.': 'New features for archive, scanner and live missions.',
    'Für das, was du baust': 'For what you build', 
    'Du wirst direkt zu PayPal weitergeleitet. Den Betrag wählst du dort selbst. Dieses Dashboard speichert keine Zahlungsdaten.': 'You are sent straight to PayPal. You choose the amount there. This dashboard stores no payment data.',
    'Dieses Archiv, die Stream-Einblendungen und alle Werkzeuge rund um den Stream entstehen in Eigenregie. Wenn dir das gefällt, kannst du die Mission mit einem freiwilligen Beitrag unterstützen. Jeder Beitrag zählt – und kein Beitrag ist Pflicht.':
      'This archive, the stream overlays and all the tools around the stream are made independently. If you like it, you can support the mission with a voluntary contribution. Every contribution counts – and none is required.',
    'Freiwillig und ohne Gegenleistung – es gibt keine Vorteile im Spiel. Inoffizielles Fanprojekt; keine Verbindung zu Cloud Imperium Games oder PayPal. Star Citizen ist eine Marke von Cloud Imperium.':
      'Voluntary and without anything in return – there are no in-game benefits. Unofficial fan project; not affiliated with Cloud Imperium Games or PayPal. Star Citizen is a trademark of Cloud Imperium.',
    'Ein Archiv. Zwölf Charaktere.': 'One archive. Twelve characters.', 'Zwölf Perspektiven auf deine Sammlung. Eine Zentrale für dein Dashboard, deinen PC und deinen Stream.': 'Twelve perspectives on your collection. One hub for your dashboard, your PC and your stream.',
    'DAS VERSE. AUS MEHREREN PERSPEKTIVEN.': 'THE VERSE. FROM SEVERAL PERSPECTIVES.', 'DEIN ARCHIV. DEINE REGELN.': 'YOUR ARCHIVE. YOUR RULES.', 'DEIN SPIEL. DEINE FUNDE.': 'YOUR GAME. YOUR FINDS.',
    'DEINE SAMMLUNG. DEIN ARCHIV.': 'YOUR COLLECTION. YOUR ARCHIVE.', 'Alles im Blick.': 'Everything in view.', 'Auf das Wesentliche': 'Down to the essentials', 'Aus dem Verse ins Archiv.': 'From the verse into the archive.',
    'Dein Verse. Dein Archiv.': 'Your verse. Your archive.', 'Dein nächster Einsatz.': 'Your next mission.', 'Dein nächster Fund.': 'Your next find.', 'Deine Sammlung bekommt': 'Your collection gets',
    'ein Gesicht.': 'a face.', 'Die letzten Momente': 'The latest moments', 'Die private Sammlung': 'The private collection', 'Eine neue Perspektive': 'A new perspective', 'Raum für Entdeckungen': 'Room for discoveries',
    'Alle Baupläne': 'All blueprints', 'Baupläne ·': 'Blueprints ·', 'Filter zurücksetzen ↺': 'Reset filters ↺',
    'Eigene Bilder werden zuerst angezeigt; insgesamt maximal drei Ansichten.': 'Your own images are shown first; at most three views in total.'
  });
  window.SCBP_I18N_RULES = (window.SCBP_I18N_RULES || []).concat([
    [/^Laufzeit: (\d+) Sekunden · Vertragskennung: (.+)$/, 'Duration: $1 seconds · contract ID: $2'],
    [/^Vertragskennung: (.+)$/, 'Contract ID: $1'],
    [/^Zeitliche Zuordnung · ([\d.]+) Sekunden nach Abschluss$/, 'Assigned by timing · $1 seconds after completion'],
    [/^(.+) · Live · Zugeordnet$/, '$1 · Live · assigned'],
    [/^(.+) · Historisch · ohne OBS · Zugeordnet$/, '$1 · Historical · without OBS · assigned'],
    [/^Abgebrochen · (.+)$/, 'Abandoned · $1'], [/^Angenommen · (.+)$/, 'Accepted · $1'], [/^Fehlgeschlagen · (.+)$/, 'Failed · $1'],
    [/^([\d.]+) \/ ([\d.]+) BAUPLÄNE ERHALTEN$/, '$1 / $2 BLUEPRINTS COLLECTED'],
    [/^Größe (.+)$/, 'Size $1'],
    [/^([^/·]+) \/ ([^·]+?)( · .*)?$/, function (m, a, b, c) { return core(a.trim()) + ' / ' + core(b.trim()) + (c || ''); }],
    [/ · Größe (\d+)/g, ' · Size $1', true],
    [/Gespeicherter NAS-Katalog:/g, 'Stored NAS catalog:', true], [/ Baupläne · /g, ' blueprints · ', true], [/Letzter Erfolg:/g, 'Last success:', true],
    [/Katalog (\S+) aktiv, Texte auf Englisch: die deutsche Übersetzung \((\S+)\) passt noch nicht\. Neue Prüfung alle 30 Minuten\./g,
      'Catalog $1 active, texts in English: the German translation ($2) does not match yet. Checking again every 30 minutes.', true],
    [/Windows-Helfer derzeit nicht verbunden/g, 'Windows helper not connected', true], [/Zum Start den aktualisierten Windows-Helfer installieren\./g, 'Install the updated Windows helper to start.', true],
    [/Letzter PC-Kontakt:/g, 'Last PC contact:', true], [/Noch kein Kontakt/g, 'No contact yet', true], [/Direkter Logscanner/g, 'Direct log scanner', true]
  ]);
  // 6.0.1: Dossier, Auftragskarten, Einzelversion und Seitentitel
  add({
    'Noch nicht erhalten': 'Not collected yet', 'Im Besitz': 'Owned', 'Synchronisiert': 'Synced', 'Manuell': 'Manual',
    'Manuell gesetzt': 'Set manually', 'Spiel-Log bestätigt': 'Confirmed by game log',
    'Logfund vorhanden · Übernehmen': 'Log find available · apply', 'Manuelle Änderung zurücksetzen': 'Reset manual change',
    'Als Ziel markieren': 'Mark as goal', 'Sammelziel gesetzt': 'Collection goal set', 'Als Sammelziel setzen': 'Set as collection goal',
    'Favorit gespeichert': 'Favourite saved', 'Als Favorit merken': 'Save as favourite', 'Favorit entfernen': 'Remove favourite',
    'Im Vergleich': 'In comparison', 'In OBS anzeigen': 'Show in OBS',
    'Gütegrad': 'Grade', 'INI-Schlüssel': 'INI key', 'Komponentenklasse': 'Component class',
    'Eigene Bilder verwalten ↗': 'Manage your own images ↗',
    'Verkaufsorte des Items. Ein Kauf schaltet den Bauplan nicht automatisch frei.': 'Where the item is sold. Buying it does not unlock the blueprint automatically.',
    'Keine bestätigten Verkaufsorte in den ergänzenden Quellen.': 'No confirmed shops in the additional sources.',
    'Noch keine externen Daten gespeichert.': 'No external data stored yet.',
    'SCMDB · Deutsche Übersetzung': 'SCMDB · original text', 'SCMDB · Originalbeschreibung': 'SCMDB · original description',
    'Auftragsdetails und Bauplan in OBS anzeigen': 'Show mission details and blueprint in OBS',
    'Auftrag in SCMDB öffnen ↗': 'Open mission in SCMDB ↗', 'Auftrag in OBS anzeigen': 'Show mission in OBS',
    'Diesen Auftrag in OBS anzeigen': 'Show this mission in OBS', 'Gruppe filtern': 'Filter group',
    'Belohnung': 'Reward', 'Bauplan-Belohnungen': 'Blueprint rewards', 'Komponenten': 'Components', 'Bauplan-Pool': 'Blueprint pool',
    'OFFEN': 'OPEN', 'UNBEKANNT': 'UNKNOWN', 'Bauplan erhalten': 'Blueprint collected', 'Bauplan offen': 'Blueprint open',
    'Nicht im lokalen Katalog': 'Not in the local catalog',
    'Jeder Pool wird unabhängig ausgewertet. Vollständig gesammelte Pools liefern keine weiteren Baupläne. Pool-Chance ≠ Chance auf ein bestimmtes Item.':
      'Each pool is rolled independently. Fully collected pools give no further blueprints. Pool chance ≠ chance of a specific item.',
    'SCMDB weist derzeit keinen Auftrag als Bauplanquelle aus.': 'SCMDB currently lists no mission as a blueprint source.',
    '. Weitere Daten und Bilder gehören ihren Rechteinhabern (siehe': '. Other data and images belong to their owners (see',
    'Lizenzen': 'Licences', '← Zurück zum Dashboard': '← Back to the dashboard',
    // Einstellungen (Designs, Einzelversion)
    'Kurze Auswahl, gefaltete Komponenten und aktive Filter.': 'Short selection, folded components and active filters.',
    'Kupfer, ausgerichtete Komponenten und präzise Größenwahl.': 'Copper, aligned components and precise size selection.',
    'Drei klare Schritte und eine ruhige Zusammenfassung.': 'Three clear steps and a calm summary.',
    'Dieser PC': 'This PC', '02 Dieser PC & Pfade': '02 This PC & paths', 'Vom PC übernommen': 'Reported by this PC',
    'Einzelversion für Windows: Das Dashboard läuft auf diesem PC und liest Game.log und LogBackups selbst. Kein NAS und kein zusätzlicher Helfer nötig.':
      'Standalone version for Windows: the dashboard runs on this PC and reads Game.log and LogBackups itself. No NAS and no extra helper needed.',
    'Einzelbetrieb: Daten werden direkt auf diesem PC gelesen.': 'Standalone mode: data is read directly on this PC.',
    'Neue Bauplanmeldungen werden direkt aus dem Game.log auf diesem PC erkannt. Katalog und Übersetzungen lädt das Dashboard selbst aus dem Internet und hält sie aktuell.':
      'New blueprint finds are detected directly from the Game.log on this PC. The dashboard downloads the catalog and translations itself and keeps them up to date.',
    'Neue Pfade werden sofort auf diesem PC geprüft. Bei einem Fehler arbeitet der Log-Leser mit der letzten gültigen Konfiguration weiter.':
      'New paths are checked immediately on this PC. On an error the log reader keeps working with the last valid configuration.',
    'Spielmeldungen, Katalog und Übersetzungen werden auf diesem PC verarbeitet, solange das Dashboard läuft.':
      'Game messages, catalog and translations are processed on this PC while the dashboard is running.',
    'SCMDB liefert Fundwege und Belohnungs-Pools. Die deutsche Sprachdatei ergänzt Aufträge und Quellen. Bilder werden über UUID-geprüfte Wiki-Seiten oder Cornerstone zugeordnet und dauerhaft gespeichert. Fehlende Übersetzungen bleiben erkennbar.':
      'SCMDB provides ways to find and reward pools. The German language file adds missions and sources. Images are matched via UUID-checked wiki pages or Cornerstone and stored permanently. Missing translations stay visible.',
    'Bildarchiv & eigene Bilder ↗': 'Image archive & own images ↗', 'Vorschau · noch nicht gespeichert': 'Preview · not saved yet',
    // OBS, Logscanner, Bilder, Live
    'Dein vorhandener Bestand ist die Ausgangsbasis. Neue Funde erscheinen hier automatisch.': 'Your existing collection is the baseline. New finds appear here automatically.',
    'Neue und historische Fundmeldungen erscheinen nach dem ersten Scan hier.': 'New and historical finds appear here after the first scan.',
    'Noch keine Aufträge aus dem Log erfasst.': 'No missions recorded from the log yet.',
    'Offline-Modus · gespeicherte Bilder bleiben verfügbar.': 'Offline mode · stored images remain available.',
    'Keine offenen Live-Aufträge. Neue Annahmen erscheinen nach dem Logscan hier.': 'No open live missions. Newly accepted missions appear here after the log scan.',
    // Seitentitel (Teile zwischen " · ")
    'Deine Sammlung': 'Your collection', 'Datenquellen': 'Data sources', 'Bildarchiv': 'Image archive',
    // Online-Dossier (Quellenprüfung, Bilder)
    'QUELLEN WERDEN GEPRÜFT': 'CHECKING SOURCES', 'Herkunft & Bildzuordnung': 'Origin & image matching',
    'Wiki-API-Bild nicht übernommen: Auf der UUID-geprüften Itemseite ist kein passendes Bild hinterlegt.':
      'Wiki API image not used: the UUID-checked item page has no matching image.'
  });
  // Ganze Texte mit Zahlen: vorne einreihen, damit allgemeinere Muster (z. B. „a / b“) nicht zuerst greifen
  var Q = function (s) { return s.replace(/(\d+) Min (\d+) Sek/, '$1 min $2 s').replace(/(\d+) Min\b/, '$1 min').replace(/(\d+) Sek\b/, '$1 s'); };
  window.SCBP_I18N_RULES.unshift(
    // Item-Zusammenfassung aus mehreren Sätzen (app.js createScmdbSummary)
    [/^(?:SCMDB klassifiziert das Item als |Als Hersteller ist |Die Fertigungszeit beträgt |[\d.]+ Aufträge können |SCMDB weist derzeit )[\s\S]*$/, function (m) {
      return m.replace(/SCMDB klassifiziert das Item als (.+?)\.(?= |$)/, 'SCMDB classifies the item as $1.')
        .replace(/Als Hersteller ist (.+?) hinterlegt\./, 'Manufacturer: $1.')
        .replace(/Die Fertigungszeit beträgt (.+?)\.(?= |$)/, function (x, d) { return 'Crafting time: ' + Q(d) + '.'; })
        .replace(/([\d.]+) Aufträge können einen passenden Bauplan-Pool auslösen\./, '$1 missions can trigger a matching blueprint pool.')
        .replace(/SCMDB weist derzeit keinen Auftrag als Bauplanquelle aus\./, 'SCMDB currently lists no mission as a blueprint source.');
    }],
    [/^(\d+)\/(\d+) bereits erhalten$/, '$1/$2 already collected'],
    [/^(.+?) · Qualität (.+)$/, '$1 · quality $2'],
    [/^([\d.]+) AUFTRÄGE$/, '$1 MISSIONS'], [/^1 AUFTRAG$/, '1 MISSION'],
    [/^Browserquelle: (\d+) × (\d+) Pixel$/, 'Browser source: $1 × $2 pixels'],
    [/^Letzter Abruf: (.+)$/, 'Last fetched: $1'],
    [/^Bild (\d+) in Originalgröße öffnen$/, 'Open image $1 at full size'],
    [/^(Gespeicherter Stand · Quelle offline|Gespeicherter Stand|Geprüft|Derzeit nicht abrufbar) · (.+)$/, function (m, a, d) {
      return {'Gespeicherter Stand · Quelle offline': 'Stored copy · source offline', 'Gespeicherter Stand': 'Stored copy', 'Geprüft': 'Checked', 'Derzeit nicht abrufbar': 'Currently unavailable'}[a] + ' · ' + d; }]
  );
  window.SCBP_I18N_RULES.push(
    [/^Schließe einen der folgenden Aufträge ab\. Jeder Abschluss würfelt die angezeigten Bauplan-Pools unabhängig voneinander aus\. Sobald du alle Baupläne eines Pools besitzt, liefert dieser Pool keine weiteren Baupläne\. Titel und Beschreibungen verwenden bevorzugt die deutsche Star-Citizen-Sprachdatei\.(?: Angezeigt werden die (\d+) aussichtsreichsten Fundwege\.)?$/,
      function (m, n) { return 'Complete one of the following missions. Each completion rolls the shown blueprint pools independently. Once you own all blueprints of a pool, that pool gives no further blueprints.' + (n ? ' Showing the ' + n + ' most promising sources.' : ''); }],
    [/Game\.log noch nicht vorhanden\. Warte auf den Spielstart\./g, 'Game.log not found yet. Waiting for the game to start.', true],
    [/^Logscanner:/g, 'Log scanner:', true], [/Letzter Kontakt:/g, 'Last contact:', true],
    [/Windows-Helfer verbunden/g, 'Windows helper connected', true],
    [/Katalog und deutsche Aufträge auf der Synology aktualisiert\./g, 'Catalog and German missions updated.', true]
  );
})();
