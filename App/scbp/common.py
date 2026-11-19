import copy
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
def now(): return datetime.now(timezone.utc).isoformat()
def read_json(path, default=None):
    try: return json.loads(Path(path).read_text('utf-8-sig'))
    except (ValueError, OSError): return copy.deepcopy(default)
_JSON_CACHE={}
def read_json_cached(path, default=None):
    """Parsed JSON per file version (inode, mtime, size). The result is shared: read only."""
    path=Path(path)
    try:
        st=path.stat();key=(st.st_ino,st.st_mtime_ns,st.st_size)
    except OSError:return copy.deepcopy(default)
    hit=_JSON_CACHE.get(str(path))
    if hit and hit[0]==key:return hit[1]
    value=read_json(path,None)
    if value is None:return copy.deepcopy(default)
    _JSON_CACHE[str(path)]=(key,value)
    return value
def atomic_json(path, value):
    atomic_bytes(path, json.dumps(value, ensure_ascii=False, indent=2).encode())
def _replace(source, target, attempts=8):
    # Unter Windows halten Virenscanner/Indexer frisch geschriebene Dateien kurz fest (WinError 5/32).
    # Dann kurz warten und erneut versuchen, statt den Start abzubrechen. Unter Linux greift das nie.
    import time
    for attempt in range(attempts):
        try:
            return os.replace(source, target)
        except PermissionError:
            if os.name != 'nt' or attempt == attempts - 1: raise
            time.sleep(0.05 * (2 ** attempt))   # 0,05 s … 3,2 s
def atomic_bytes(path, value):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    fd,name=tempfile.mkstemp(prefix='.write-',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as f: f.write(value); f.flush(); os.fsync(f.fileno())
        _replace(name,path)
    finally:
        if os.path.exists(name): os.unlink(name)
def slug(value):
    for a,b in [('ä','ae'),('ö','oe'),('ü','ue'),('Ä','Ae'),('Ö','Oe'),('Ü','Ue'),('ß','ss')]: value=value.replace(a,b)
    return re.sub(r'[^a-zA-Z0-9_-]+','-',value).strip('-')[:90] or 'Item'
def token(value): return re.sub(r'[^a-z0-9]','',str(value or '').lower())
