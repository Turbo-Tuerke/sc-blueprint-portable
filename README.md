# SC Blueprint Dashboard – Portable Version

**Version 6.0.1** · Windows 10/11 (64 Bit) · Deutsch und Englisch

Inoffizielles Fan-Werkzeug für Star Citizen. Es zeigt alle Baupläne (Blueprints), in welchen Aufträgen du sie bekommst, wo du die Materialien findest und welche Baupläne du schon hast. Neue Funde erkennt es automatisch aus dem `Game.log` des Spiels; für den Stream gibt es eine OBS-Einblendung.

*Unofficial Star Citizen fan tool: tracks your blueprints, the contracts that reward them and where to mine their materials. Reads your own `Game.log`, runs locally on Windows, German and English interface. English guide with screenshots: [Installation-Guide.pdf](Installation-Guide.pdf).*

## Fertiges Programm

Die einfachste Variante ist das fertige ZIP-Paket (mit eingebautem Python):

1. ZIP in einen eigenen Ordner entpacken.
2. `Start.cmd` doppelt anklicken. Die Seite öffnet sich unter <http://127.0.0.1:8188/>.
3. Zum Beenden `Beenden.cmd` doppelt anklicken.

Ausführlich mit Bildern: [Installationsanleitung.pdf](Installationsanleitung.pdf). Kurzfassung: [LIES MICH.txt](LIES%20MICH.txt).

## Aus diesem Quellstand starten

Dieses Repository enthält das Programm ohne die Python-Laufzeit. Zwei Wege:

- **Mit installiertem Python 3.12 oder neuer:** im Repository-Ordner `python App\portable.py` ausführen.
- **Wie im fertigen Paket:** das eingebettete Python 3.12 für Windows (x64) von python.org in einen Ordner `Runtime` neben `App` entpacken; danach funktioniert `Start.cmd`.

Es werden keine weiteren Pakete benötigt.

## Was das Programm tut und was nicht

- Läuft nur auf diesem PC (`127.0.0.1`), ohne Konto, ohne Server.
- Der Spielkatalog (Baupläne, Aufträge, Fundorte) wird beim ersten Start von [SCMDB](https://scmdb.net/) geladen, die deutschen Texte aus [StarCitizen-Deutsch-INI](https://github.com/rjcncpt/StarCitizen-Deutsch-INI). Höchstens einmal in 24 Stunden wird nachgefragt; alles wird lokal zwischengespeichert.
- Im Repository und im Paket sind **keine** Spiel-, Item- oder Übersetzungsdaten enthalten.
- Besitz entsteht aus deinem eigenen `Game.log` und den `LogBackups`; einzelne Items lassen sich im Dossier von Hand markieren.
- Alle persönlichen Daten liegen im Ordner `Daten` neben `App`.

## Vorschau / Preview

**Deutsch**

https://github.com/user-attachments/assets/4fac5d1a-7894-4d60-9ad3-5a6504fccf76

**English**

https://github.com/user-attachments/assets/95c19614-c791-4c1b-9478-d56e96fa4c06


## Lizenzen

- Programmcode: MIT-Lizenz, siehe [LICENSE](LICENSE).
- Spieldaten, Texte, Schriften und Bilder Dritter: siehe [LIZENZEN.md](LIZENZEN.md).

This site is not endorsed by or affiliated with the Cloud Imperium or Roberts Space Industries group of companies. All game content and materials are copyright Cloud Imperium Rights LLC and Cloud Imperium Rights Ltd. Star Citizen®, Squadron 42®, Roberts Space Industries®, and Cloud Imperium® are registered trademarks of Cloud Imperium Rights LLC. All rights reserved.
