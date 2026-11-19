"""Einzelbetrieb (5.0): ersetzt den Windows-Helfer im selben Prozess.

Gleiche Regeln wie Read-GameLogs.ps1 / SC-Blueprint-AutoSync.ps1:
- nur ausgewählte, vollständige Zeilen; Leseposition erst nach erfolgreicher Übernahme weiter
- neue Datei-Generation (anderer Kopfzeile) oder geschrumpfte Datei: von vorne lesen
- beim ersten Durchlauf ist vorhandener Inhalt „historisch“ (keine OBS-Meldung)
- LogBackups mit begrenztem Budget pro Durchlauf, Live-Log hat Vorrang
- Besitz kommt nur aus dem Game.log (5.6.0: keine Launcher-Dateien mehr)
"""
import copy
import hashlib
import json
import os
import platform
import re
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from .common import atomic_json, read_json
from .scanner import effective_mode

SELECT = re.compile(r'CreateMarker|<EndMission>|LocationName\[|TargetName\[|Added notification "(?:Auftrag angenommen|Contract Accepted|Auftrag abgeschlossen|Contract Complete|Bauplan erhalten|Received Blueprint):', re.I)
LIMIT = 262144
BIG = 1048576
BACKUP_BUDGET = 33554432
MAX_LINES = 1000


def now():
    return datetime.now(timezone.utc).isoformat()


def expand(value):
    """Windows-Umgebungsvariablen (%APPDATA%) und ~ auflösen. Unauflösbar -> None."""
    if not value:
        return None
    text = os.path.expanduser(os.path.expandvars(str(value).strip()))
    if os.name != 'nt':
        if '%' in text or re.match(r'^[A-Za-z]:\\', text) or text.startswith('\\\\'):
            return None  # Windows-Pfad auf Linux: nicht vorhanden
    elif re.search(r'%[^%]+%', text):
        return None
    return Path(text)


def open_shared(path):
    """Datei lesen, ohne dem Spiel Umbenennen/Löschen zu blockieren (FILE_SHARE_DELETE unter Windows)."""
    if os.name != 'nt':
        return open(path, 'rb')
    import ctypes
    import msvcrt
    from ctypes import wintypes
    create = ctypes.windll.kernel32.CreateFileW
    create.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
    create.restype = wintypes.HANDLE
    handle = create(str(path), 0x80000000, 0x1 | 0x2 | 0x4, None, 3, 0x80, None)  # GENERIC_READ, share R|W|D, OPEN_EXISTING
    if handle in (None, wintypes.HANDLE(-1).value):
        raise OSError(ctypes.get_last_error() or 2, 'Datei kann nicht geöffnet werden', str(path))
    fd = msvcrt.open_osfhandle(handle, os.O_RDONLY | getattr(os, 'O_BINARY', 0))
    return os.fdopen(fd, 'rb')


def windows_log_candidates():
    roots = []
    for drive in 'CDEFGH':
        roots += [Path(f'{drive}:\\Program Files\\Roberts Space Industries\\StarCitizen'), Path(f'{drive}:\\Roberts Space Industries\\StarCitizen'), Path(f'{drive}:\\Games\\Roberts Space Industries\\StarCitizen'), Path(f'{drive}:\\StarCitizen')]
    return roots


def linux_log_candidates():
    home = Path.home()
    roots = []
    for base in [home / 'Games', home / '.local/share/lutris/prefixes', home / '.wine', home]:
        if not base.is_dir():
            continue
        try:
            for prefix in [base] + [p for p in base.iterdir() if p.is_dir()][:40]:
                roots.append(prefix / 'drive_c/Program Files/Roberts Space Industries/StarCitizen')
        except OSError:
            continue
    roots.append(home / 'Games/star-citizen/drive_c/Program Files/Roberts Space Industries/StarCitizen')
    return roots


def detect_sc_root(channel='LIVE'):
    """Erste Star-Citizen-Installation mit vorhandenem Kanalordner, sonst der übliche Standardpfad."""
    candidates = windows_log_candidates() if os.name == 'nt' else linux_log_candidates()
    for root in candidates:
        try:
            if (root / channel).is_dir():
                return root
        except OSError:
            continue
    return candidates[0] if os.name == 'nt' else Path.home() / 'Games/star-citizen/drive_c/Program Files/Roberts Space Industries/StarCitizen'


def standalone_defaults(defaults):
    """Startwerte beim ersten Start der Einzelversion."""
    settings = copy.deepcopy(defaults)
    channel = settings['paths']['channel']
    root = detect_sc_root(channel)
    settings['paths']['scRoot'] = str(root)
    settings['paths']['logs'] = str(root / channel / 'logs')
    settings['scanner']['gameLog'] = str(root / channel / 'Game.log')
    settings['scanner']['backups'] = str(root / channel / 'logbackups')
    if os.name == 'nt' and (root / channel / 'LogBackups').is_dir():
        settings['scanner']['backups'] = str(root / channel / 'LogBackups')
    for name in ['LogBackups', 'logbackups']:
        if (root / channel / name).is_dir():
            settings['scanner']['backups'] = str(root / channel / name)
    settings['scanner']['autoDossier'] = True
    settings['deployment']['dashboardUrl'] = ''
    # 5.6.2: Kein NAS-Zielordner voreingestellt; die Einzelversion schreibt in ihren eigenen Datenordner.
    if os.environ.get('SCBP_DATA'):
        settings['paths']['destination'] = os.environ['SCBP_DATA']
    settings['deployment']['publishedPort'] = int(os.environ.get('PORT', '8188'))
    return settings


class LocalAgent:
    def __init__(self, state, data, settings, scanner, alerts, write_agent, lock, revision=lambda: 0):
        self.revision = revision
        self.state = Path(state)
        self.data = Path(data)
        self.settings = settings
        self.scanner = scanner
        self.alerts = alerts
        self.write_agent = write_agent
        self.lock = lock
        self.path = self.state / 'log-reader-state.json'
        saved = read_json(self.path, {}) or {}
        self.files = saved.get('files', {}) if saved.get('schema') == 1 and saved.get('namespace') == 'standalone' else {}
        self.first_pass = True
        self.status = {'status': 'ready', 'message': 'Logscanner bereit.'}
        self.last_key = None
        self.stamps = {}
        self.next_sync = 0
        self.last_success = None
        self.handled_request = ''
        self.last_sent = (None, 0)
        self.thread = None

    # ---------- Game.log ----------
    def read_block(self, path, backup, limit=LIMIT):
        channel = self.settings()['paths']['channel']
        with open_shared(path) as stream:
            head = stream.read(1024)
            head_end = head.find(b'\n')
            if head_end < 0:
                return 0  # Kopfzeile noch unvollständig
            generation = hashlib.sha256(head[:head_end + 1]).hexdigest()
            key = channel + '|' + str(path)
            entry = self.files.get(key)
            length = os.fstat(stream.fileno()).st_size
            upgrade = entry is not None and entry.get('contextVersion', 0) != 1
            if upgrade or entry is None or entry.get('generation') != generation or length < entry.get('position', 0):
                entry = {'generation': generation, 'contextVersion': 1, 'position': 0, 'initialEnd': length if (backup or self.first_pass or upgrade) else 0, 'size': length}
                self.files[key] = entry
            entry['size'] = length
            position = entry['position']
            if position >= length:
                return 0
            historical = backup or position < entry['initialEnd']
            boundary = min(length, entry['initialEnd']) if (historical and not backup) else length
            count = min(limit, boundary - position)
            if count <= 0:
                return 0
            stream.seek(position)
            chunk = stream.read(count)
            last = chunk.rfind(b'\n')
            if last < 0 and historical and not backup and length > boundary:
                stream.seek(position)
                chunk = stream.read(min(BIG, length - position))
                last = chunk.find(b'\n')
            if last < 0:
                if len(chunk) == limit and limit < BIG:
                    return self.read_block(path, backup, BIG)
                if len(chunk) >= BIG:
                    raise ValueError(f'Logzeile größer als 1 MB: {path}')
                return 0
            selected = []
            consumed = 0
            for raw in chunk[:last + 1].split(b'\n')[:-1]:
                consumed += len(raw) + 1
                line = raw.decode('utf-8', 'replace')
                if SELECT.search(line):
                    selected.append(line.rstrip('\r'))
                if len(selected) >= MAX_LINES:
                    break
            end = position + consumed
            if selected:
                body = {'channel': channel, 'source': str(path), 'generation': generation, 'start': position, 'end': end, 'historical': bool(historical), 'lines': selected}
                result = self.scanner.ingest(body)
                self.alerts.observe()
                if not result.get('ok') or result.get('end') != end:
                    raise ValueError('Scanner-Bestätigung fehlt; Leseposition bleibt erhalten.')
            entry['position'] = end  # erst nach erfolgreicher Übernahme
            self.status['lastFile'] = str(path)
            self.status['lastScan'] = now()
            return consumed

    def read_logs(self, cfg):
        live = expand(cfg['scanner']['gameLog'])
        self.status.update({'mode': effective_mode(cfg), 'channel': cfg['paths']['channel'], 'status': 'scanning'})
        catalog = getattr(self.scanner, 'catalog', None)
        if catalog is not None and not catalog.refresh():
            # Erster Start ohne mitgelieferte Daten: Katalog kommt aus dem Internet (SCMDB). Erst danach lesen,
            # damit jeder Fund einem Item zugeordnet werden kann. Erster Durchlauf bleibt „historisch“.
            self.status.update({'status': 'waiting', 'message': 'Itemkatalog wird aus dem Internet geladen. Danach werden Game.log und LogBackups gelesen.'})
            return
        try:
            if live and live.is_file():
                for _ in range(32):
                    if self.read_block(live, False) == 0:
                        break
            pending = processed = 0
            budget = BACKUP_BUDGET
            backups = expand(cfg['scanner']['backups'])
            if cfg['scanner']['scanBackups'] and backups and backups.is_dir():
                # 5.6.3: Neueste Sitzungen zuerst, damit neue Nutzer ihren Besitz nach Minuten statt nach einer halben Stunde sehen.
                files = sorted((p for p in backups.glob('*.log') if p.is_file()), key=lambda p: p.stat().st_mtime, reverse=True)
                for file in files:
                    key = cfg['paths']['channel'] + '|' + str(file)
                    entry = self.files.get(key)
                    stat = file.stat()
                    unchanged = entry is not None and entry.get('contextVersion', 0) == 1 and entry.get('position') == stat.st_size and entry.get('writeTicks') == stat.st_mtime_ns
                    if not unchanged and budget > 0:
                        while True:
                            got = self.read_block(file, True)
                            budget -= got
                            if got <= 0 or budget <= 0:
                                break
                        entry = self.files.get(key)
                        if entry is not None and entry.get('position') == stat.st_size:
                            entry['writeTicks'] = stat.st_mtime_ns
                    if entry is None or entry.get('contextVersion', 0) != 1 or entry.get('position', 0) < stat.st_size:
                        pending += 1
                    else:
                        processed += 1
            exists = bool(live and live.is_file())
            self.status['pendingFiles'] = pending
            self.status['processedFiles'] = processed
            self.status['status'] = 'importing' if pending else ('watching' if exists else 'waiting')
            self.status['message'] = (f'Historischer Import: {processed} Dateien gelesen, {pending} ausstehend. Neue Live-Zeilen werden bevorzugt.' if pending else
                                      'Live-Log wird beobachtet. Historische Funde werden ohne OBS-Meldung übernommen.' if exists else
                                      'Game.log noch nicht vorhanden. Warte auf den Spielstart.')
        except Exception as exc:  # Leseposition bleibt erhalten, nächster Durchlauf versucht es erneut
            self.status['status'] = 'error'
            self.status['message'] = str(exc)[:500]
        finally:
            self.first_pass = False
            atomic_json(self.path, {'schema': 1, 'namespace': 'standalone', 'files': self.files})

    # ---------- Statusdatei ----------
    def sync_files(self, cfg):
        paths = cfg['paths']
        copied = []
        status_path = self.data / 'sync-status.json'
        self.last_success = now()
        if copied or not status_path.exists():
            atomic_json(status_path, {'schema': 1, 'mode': 'standalone', 'status': 'ok', 'automationInstalled': True, 'updatedAt': now(), 'lastSuccess': self.last_success,
                                      'sourceLogPath': paths['logs'], 'targetDataPath': str(self.data),
                                      'copiedFiles': copied, 'scmdbVersion': 'Einzelbetrieb', 'scmdbStatus': 'local-managed', 'translationVersion': 'Einzelbetrieb', 'translationStatus': 'local-managed',
                                      'translationSource': cfg['sources']['translationUrl'], 'message': 'Einzelbetrieb: Dateien und Spielmeldungen werden direkt auf diesem PC gelesen.'})
        return copied

    # ---------- Ablauf ----------
    def cycle(self):
        cfg = self.settings()
        key = cfg['scanner']['gameLog']
        if key != self.last_key:
            self.first_pass = True
            self.last_key = key
        request = read_json(self.state / 'sync-request.json', {}) or {}
        pending_request = request.get('id') and request.get('id') != self.handled_request
        enabled = cfg['sync']['enabled']
        state, message = 'ok', 'Einzelbetrieb: Daten werden direkt auf diesem PC gelesen.'
        if enabled or pending_request:
            self.read_logs(cfg)
        if pending_request or (enabled and time.monotonic() >= self.next_sync):
            try:
                self.sync_files(cfg)
            except Exception as exc:
                state, message = 'error', 'Dateiabgleich: ' + str(exc)[:400]
            self.next_sync = time.monotonic() + cfg['sync']['pollSeconds']
            if pending_request:
                self.handled_request = request['id']
        if not enabled:
            state, message = 'paused', 'Einzelbetrieb: automatischer Abgleich ist pausiert.'
        if self.status.get('status') == 'error' and state == 'ok':
            state, message = 'error', 'Logscanner: ' + self.status.get('message', '')
        self.report(cfg, state, message)

    def report(self, cfg, state, message):
        result = {'revision': self.revision(), 'status': state, 'message': message, 'machine': platform.node()[:200] or 'PC', 'lastSuccess': self.last_success,
                  'requestId': self.handled_request, 'scanner': {k: v for k, v in self.status.items()}}
        signature = json.dumps({**result, 'scanner': {k: v for k, v in self.status.items() if k != 'lastScan'}, 'lastSuccess': None}, sort_keys=True)
        if signature == self.last_sent[0] and time.monotonic() - self.last_sent[1] < 30:
            return
        result['receivedAt'] = now()
        self.write_agent(result)
        self.last_sent = (signature, time.monotonic())

    def run(self):
        while True:
            try:
                self.cycle()
            except Exception as exc:
                print('Einzelbetrieb pausiert: ' + str(exc)[:300], flush=True)
            time.sleep(2)

    def start(self):
        self.thread = threading.Thread(target=self.run, name='local-agent', daemon=True)
        self.thread.start()

