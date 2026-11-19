# Lizenzen, Marken und Quellen

## Pflichthinweis (CIG Fankit)

This site is not endorsed by or affiliated with the Cloud Imperium or Roberts
Space Industries group of companies. All game content and materials are
copyright Cloud Imperium Rights LLC and Cloud Imperium Rights Ltd.. Star
Citizen®, Squadron 42®, Roberts Space Industries®, and Cloud Imperium® are
registered trademarks of Cloud Imperium Rights LLC. All rights reserved.

SC Blueprint Dashboard ist ein inoffizielles, nicht-kommerzielles Fanprojekt.
Es greift nicht in das Spiel oder dessen Netzwerkverkehr ein, sondern liest nur
die vom Spiel selbst geschriebenen Protokolldateien (Game.log, LogBackups) auf
dem eigenen PC.

## Programmcode

MIT-Lizenz, siehe `LICENSE`. Gilt nur für den Code und die Dokumentation dieses
Projekts.


## Mitgelieferte Bestandteile Dritter

| Bestandteil | Lizenz |
| --- | --- |
| Schrift Inter (`dist/assets/fonts/inter-*`) | SIL Open Font License 1.1, `LICENSE-inter.txt` |
| Schrift Rajdhani (`dist/assets/fonts/rajdhani-*`) | SIL Open Font License 1.1, `LICENSE-rajdhani.txt` |

Python wird nicht mitgeliefert. Die Windows-Einzelversion lädt beim ersten
Start das offizielle Paket von python.org (Python Software Foundation License).

## Daten und Bilder, die erst auf deinem PC geladen werden

Das öffentliche Paket enthält **keine** Spiel-, Item- oder Bilddaten. Sie werden
auf deinem Rechner direkt von diesen Diensten geladen bzw. aus deinen eigenen
Logdateien gelesen. Es gelten deren Bedingungen;
die Rechte bleiben bei den jeweiligen Inhabern.

| Quelle | Wofür | Lizenz / Bedingungen |
| --- | --- | --- |
| Star Citizen (eigene Game.log/LogBackups) | Funde, Aufträge, Besitz | Inhalte © Cloud Imperium |
| [SCMDB](https://scmdb.net/) | Itemkatalog, Rezepte, Auftragsdaten, Fundorte der Materialien (`mining_data`) | Spieldaten © Cloud Imperium. Die Aufbereitung ist Werk der SCMDB-Betreiber (deutsches Urheberrecht, ggf. Datenbankschutz nach §§ 87a ff. UrhG). Weitergabe der Daten nur mit deren schriftlicher Zustimmung; Zustimmung für dieses Werkzeug liegt vor (siehe unten). |
| [StarCitizen-Deutsch-INI](https://github.com/rjcncpt/StarCitizen-Deutsch-INI) | Deutsche Item- und Auftragstexte (`scmdb/lang-de.json`) | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): Quelle nennen, nicht kommerziell, Bearbeitungen unter gleicher Lizenz. SCMDB nennt für ihre deutschen Texte das [Star Citizen Wiki (Deutsch)](https://star-citizen.wiki/) unter [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); das Dashboard lädt die Datei aus dem Deutsch-INI-Repository, daher gilt die strengere Lizenz. |
| [Star Citizen Wiki API](https://api.star-citizen.wiki/) / [StarCitizen.tools](https://starcitizen.tools/) | Itembeschreibungen, Bilder | Texte CC BY-SA 4.0; CIG-Bilder © Cloud Imperium; Urheber/Lizenz wird je Bild gespeichert und angezeigt |
| [Cornerstone](https://finder.cstone.space/) | Verkaufsorte, Bilder | Bedingungen von Cornerstone |

Nicht mehr genutzt: UEX, CitizenHQ und FleetYards (seit 5.4.0), SC Deutsch Launcher (seit 5.6.0).

Zwischengespeicherte Bilder liegen nur in deinem eigenen `media/cache` und
werden nicht weitergegeben. Bitte gib diesen Ordner nicht öffentlich weiter.

## Zustimmung von SCMDB

Am 19.11.2026 hat der Entwickler der SC Mission Database (Krovax) in einer
Discord-Direktnachricht zugestimmt, dass dieses Werkzeug die SCMDB-Daten nutzt:
„alles gut, du kannst das machen, mein Segen hast du“. Er weist darauf hin, dass
es sich um Spieldaten von CIG handelt, die SCMDB nur aufbereitet. Der Verlauf ist
beim Herausgeber als Nachweis gesichert.

## Öffentlicher Betrieb

Diese Hinweise gelten für die eigene Nutzung und für die Weitergabe des Programms
ohne Daten. Wer das Dashboard öffentlich im Netz betreibt, gibt SCMDB-Daten und
deutsche Texte selbst an Dritte weiter. Dafür vorher:

- für einen eigenen Webauftritt die Zustimmung der SCMDB-Betreiber dafür einholen (Kontakt im [SCMDB-Impressum](https://scmdb.net/)); die Zustimmung vom 19.11.2026 betrifft dieses Programm;
- die Lizenz der deutschen Texte beachten (CC BY-NC-SA 4.0: Quellenangabe, keine kommerzielle Nutzung);
- Impressum nach § 5 DDG und eine Datenschutzerklärung bereitstellen;
- keine Inhalte aus `state/`, `media/` oder `data/` und keine Schlüssel aus `.env` veröffentlichen.

Das ist keine Rechtsberatung.

## Datenschutz

Das Dashboard sendet keine Daten an den Entwickler. Beim Laden von Katalog,
Texten und Bildern verbindet sich dein Rechner mit den oben genannten Diensten;
dabei sehen diese deine IP-Adresse. Die Seite „Freiwillige Unterstützung“ lädt nichts von PayPal;
erst ein Klick auf „Jetzt unterstützen“ öffnet PayPal im Browser.

## Freiwillige Unterstützung

Unterstützung ist freiwillig, ohne Gegenleistung und schaltet keine Funktionen frei.
Sie dienen nur der Kostendeckung; das Dashboard ist kein kommerzielles Angebot
(wichtig wegen der NC-Lizenz der deutschen Texte).
Alle Funktionen sind ohne Unterstützung nutzbar.
