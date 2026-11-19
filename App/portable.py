"""Startet das SC Blueprint Dashboard als portable Einzelversion (Daten im Ordner "Daten")."""
import json, os, runpy, socket, sys, threading, time, urllib.request, webbrowser
from pathlib import Path

APP = Path(__file__).resolve().parent
BASE = APP.parent
DATA = BASE / 'Daten'
for name in ('data', 'state', 'media'):
    (DATA / name).mkdir(parents=True, exist_ok=True)
os.environ.update(SCBP_MODE='standalone', SCBP_DATA=str(DATA / 'data'), SCBP_STATE=str(DATA / 'state'),
                  SCBP_MEDIA=str(DATA / 'media'))
for name in ['README.md']:
    source, target = APP / 'data' / name, DATA / 'data' / name
    if source.is_file() and not target.exists():
        target.write_bytes(source.read_bytes())
port = int(os.environ.get('PORT', '8188'))
url = 'http://127.0.0.1:%d/' % port


def running():
    try:
        with urllib.request.urlopen(url + 'healthz', timeout=2) as r:
            return json.loads(r.read()).get('mode') == 'standalone'
    except Exception:
        return False


if running():                       # zweiter Start: nur die Seite öffnen
    webbrowser.open(url)
    sys.exit(0)
try:
    socket.create_connection(('127.0.0.1', port), 1).close()
    import ctypes
    ctypes.windll.user32.MessageBoxW(0, 'Port %d ist schon belegt. Bitte das andere Programm beenden.' % port, 'SC Blueprint', 0x10)
    sys.exit(1)
except OSError:
    pass
log = open(DATA / 'server.log', 'a', encoding='utf-8', buffering=1)
sys.stdout = sys.stderr = log
(DATA / 'pid.txt').write_text(str(os.getpid()), encoding='ascii')


def open_when_ready():
    for _ in range(120):
        if running():
            webbrowser.open(url)
            return
        time.sleep(0.5)


if os.environ.get('SCBP_NO_BROWSER') != '1':   # nur für Tests und Bildschirmfotos
    threading.Thread(target=open_when_ready, daemon=True).start()
sys.path.insert(0, str(APP))
os.chdir(APP)
sys.argv = [str(APP / 'server.py')]
runpy.run_path(str(APP / 'server.py'), run_name='__main__')
