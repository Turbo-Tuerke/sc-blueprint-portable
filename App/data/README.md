# Datenordner

Dieser Ordner wird vom Dashboard nur gelesen. Seit 5.6.0 gibt es keine Launcher-Dateien mehr.

Mögliche Dateien:

- `sync-status.json`: Stand des Windows-Helfers (wird von ihm geschrieben).
- `scan-state.json`: älterer Stand des Logscanners, nur noch zur Anzeige.
- `scmdb-items.json`: älterer SCMDB-Katalog, nur als Rückfall, falls noch kein eigener Katalog geladen wurde.

Den aktuellen Katalog (Baupläne, Aufträge, deutsche Texte, Fundorte) lädt das Dashboard selbst von SCMDB und aus dem StarCitizen-Deutsch-INI-Repository und legt ihn unter `state/catalog/` ab. Besitz kommt aus `Game.log` und `LogBackups` sowie aus Handmarkierungen im Dossier.

In der portablen Version bleibt dieser Ordner leer; alles Nötige lädt das Programm beim ersten Start.
