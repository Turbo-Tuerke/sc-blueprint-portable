"""Persistent local service for SC Blueprint Dashboard. Python standard library only."""
from scbp.obs_context import mission_rewards, mission_dossier
import copy
import gzip
import hashlib
import json
import os
import secrets
import re
import time
import threading
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from scbp.common import atomic_json
from scbp.catalog import Catalog
from scbp.media import Media, MAX_IMAGE, EXTENSIONS
from scbp.alerts import Alerts
from scbp.scanner import Scanner
from scbp.source_catalog import SourceCatalog
from scbp import standalone as standalone_mode

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('SCBP_DATA', ROOT / 'data'))
STATE = Path(os.environ.get('SCBP_STATE', ROOT / 'state'))
MEDIA = Path(os.environ.get('SCBP_MEDIA', ROOT / 'media'))
VERSION = '6.0.2'
# 5.0: SCBP_MODE=standalone -> Einzelversion für Windows/Bazzite (kein NAS, integrierter Log-Leser)
STANDALONE = os.environ.get('SCBP_MODE','').lower()=='standalone'
THEMES = ['aurum','polaris','sentinel','obsidian','atlas','vanguard','aurora','eclipse','forge','meridian','halo','nocturne']
LOCK = threading.RLock()
DEFAULTS = {
 'appearance': {'theme':'meridian','view':'gallery','fontSize':16,'density':'comfortable','animations':True,'filterLayout':'compact','missionFiltersVisible':True,'cardScale':70,'dossierScale':130,'dossierFontSize':20},
 'paths': {'scRoot':r'D:\Roberts Space Industries\StarCitizen','channel':'LIVE',
  'logs':r'D:\Roberts Space Industries\StarCitizen\LIVE\logs\trace',
  'destination':r'\\DISKSTATION\docker\sc-blueprint-dashboard\data'},
 'sync': {'enabled':True,'pollSeconds':5,'externalRefreshHours':24},
 'sources': {'scmdbUrl':'https://scmdb.net/data',
  'translationUrl':'https://raw.githubusercontent.com/rjcncpt/StarCitizen-Deutsch-INI/main/scmdb/lang-de.json',
  'timeoutSeconds':30,'cacheHours':24,'maxMissions':12,'maxImages':3},
 'deployment': {'dashboardUrl':'','publishedPort':8188,'nasProjectPath':'/volume1/docker/sc-blueprint-dashboard','mediaPath':'/volume1/docker/sc-blueprint-dashboard/media'},
 'obs': {'theme':'inherit','layout':'strip','status':'open','interval':20,'allMissions':False,'showImage':True,
  'transparent':True,'resolution':'1920x1080','item':'','mission':''},
 'providers': {'wiki':True,'mediawiki':True,'cornerstone':True,'offline':False},
 'scanner': {'gameLog':r'D:\Roberts Space Industries\StarCitizen\LIVE\Game.log','backups':r'D:\Roberts Space Industries\StarCitizen\LIVE\LogBackups','scanBackups':True,'correlationSeconds':5,'autoDossier':False,'autoMissionObs':True},
 'alerts': {'enabled':True,'durationSeconds':15,'detailDurationSeconds':15,'rewardDurationSeconds':15,'imageIntervalSeconds':5,'queueMaxAgeSeconds':600,'position':'bottom-right'},
}

def now(): return datetime.now(timezone.utc).isoformat()
def read_json(path, fallback=None):
 try: return json.loads(path.read_text('utf-8-sig'))
 except (OSError,ValueError): return copy.deepcopy(fallback)
def write_json(path,value): atomic_json(path,value)
def init_state():
 STATE.mkdir(parents=True,exist_ok=True)
 with LOCK:
  if not (STATE/'config.json').exists(): write_json(STATE/'config.json',{'revision':1,'syncRevision':1,'themeCatalogVersion':3,'updatedAt':now(),'settings':standalone_mode.standalone_defaults(DEFAULTS) if STANDALONE else DEFAULTS})
  if not (STATE/'agent-token').exists():
   (STATE/'agent-token').write_text(secrets.token_urlsafe(36)); (STATE/'agent-token').chmod(0o600)
REMOVED_PROVIDERS=('uex','citizenhq','fleetyards')
# 5.6.0: Launcher-Anbindung entfernt. Diese Einstellungen gibt es nicht mehr; alte Konfigurationen und Exporte bleiben gültig.
REMOVED_SETTINGS={'paths':('launcher','blueprints','catalog','ownershipFile','translationFile'),'sources':('launcherEnabled','ownershipSource','catalogMode','translationMode'),'scanner':('mode',)}
def drop_removed(settings):
 if isinstance(settings,dict):
  for section,keys in REMOVED_SETTINGS.items():
   if isinstance(settings.get(section),dict):
    for key in keys: settings[section].pop(key,None)
 return settings
# Ältere Windows-Helfer lesen diese Werte noch; so lesen sie nur das Game.log und kopieren keine Launcher-Dateien.
LEGACY_AGENT_SOURCES={'launcherEnabled':False,'ownershipSource':'logs','catalogMode':'nas','translationMode':'github'}
# Nur Platzhalter, damit ältere Helfer ihre Pfade bilden können; gelesen wird dort nichts.
LEGACY_AGENT_PATHS={'launcher':r'%APPDATA%\sc-deutsch-launcher','blueprints':r'%APPDATA%\sc-deutsch-launcher\blueprints','catalog':r'%APPDATA%\sc-deutsch-launcher\blueprints\catalog','ownershipFile':r'%APPDATA%\sc-deutsch-launcher\blueprints\sc_bp_erledigt.json','translationFile':r'%APPDATA%\sc-deutsch-launcher\blueprints\lang-de.json'}
def upgrade_config(value):
 value=copy.deepcopy(value)
 if not isinstance(value,dict): raise ValueError('Konfiguration beschädigt. Bitte state/config.previous.json wiederherstellen.')
 # 2.1 persisted obs.layout; 2.0 had the original Obsidian and no layout field.
 if value.get('themeCatalogVersion',1)<2 and 'layout' in value.get('settings',{}).get('obs',{}):
  for section in ['appearance','obs']:
   if value['settings'].get(section,{}).get('theme')=='obsidian': value['settings'][section]['theme']='aurum'
 value['themeCatalogVersion']=3
 value.get('settings',{}).get('obs',{}).setdefault('layout','dossier')
 settings=value.setdefault('settings',{})
 alerts=settings.setdefault('alerts',{})
 for key in ['detailDurationSeconds','rewardDurationSeconds']:alerts.setdefault(key,alerts.get('durationSeconds',15))
 settings.pop('hub',None)
 # 5.4.0: UEX, CitizenHQ und FleetYards gibt es nicht mehr.
 for key in REMOVED_PROVIDERS: settings.get('providers',{}).pop(key,None)
 drop_removed(settings)
 if 'scanner' not in settings:
  paths=settings.get('paths',{})
  base=paths.get('scRoot',DEFAULTS['paths']['scRoot']).rstrip('\\')+'\\'+paths.get('channel','LIVE')
  settings['scanner']={**copy.deepcopy(DEFAULTS['scanner']),'gameLog':base+'\\Game.log','backups':base+'\\LogBackups'}
 for section, defaults in DEFAULTS.items():
  incoming=settings.setdefault(section,{})
  for key, default in defaults.items(): incoming.setdefault(key,copy.deepcopy(default))
 return value
CONFIG_CACHE={'key':None,'value':None}
def config():
 # 4.1.7: settings are read on almost every request; parse the file only after a change.
 # Every write uses os.replace, so a new inode/mtime always identifies a new version.
 path=STATE/'config.json'
 try:
  st=path.stat();key=(st.st_ino,st.st_mtime_ns,st.st_size)
 except OSError:key=None
 with LOCK:
  if key is not None and CONFIG_CACHE['key']==key:return json.loads(CONFIG_CACHE['value'])
 value=upgrade_config(read_json(path))
 with LOCK:CONFIG_CACHE['key']=key;CONFIG_CACHE['value']=json.dumps(value)
 return value
class Conflict(ValueError): pass

POSIX_PATHS = STANDALONE and os.name!='nt'
def valid_path(path):
 if not path: return False
 if path.startswith('\\\\') or (len(path)>2 and path[1:3]==':\\') or path.upper().startswith('%APPDATA%\\'): return True
 # Einzelversion unter Linux (Bazzite): absolute oder ~-Pfade, ohne ..-Sprünge
 return POSIX_PATHS and (path.startswith('/') or path.startswith('~/')) and '..' not in Path(path).parts
def validate_settings(value):
 value=copy.deepcopy(value)
 if isinstance(value,dict) and isinstance(value.get('obs'),dict): value['obs'].setdefault('layout','dossier')
 if isinstance(value,dict) and isinstance(value.get('providers'),dict):
  for key in REMOVED_PROVIDERS: value['providers'].pop(key,None)
 drop_removed(value)
 if not isinstance(value,dict) or set(value)!=set(DEFAULTS): raise ValueError('Unvollständige Konfiguration. Vollständigen Export verwenden.')
 clean=copy.deepcopy(DEFAULTS)
 for section,fields in DEFAULTS.items():
  given=value.get(section)
  if not isinstance(given,dict) or set(given)!=set(fields): raise ValueError('Fehlende Einstellungen: '+section)
  for key,default in fields.items():
   incoming=given[key]
   if type(incoming) is not type(default): raise ValueError('Ungültiger Wert: '+section+'.'+key)
   if isinstance(incoming,str):
    incoming=incoming.strip()
    if len(incoming)>2000 or any(ord(c)<32 for c in incoming): raise ValueError('Ungültiger Text: '+key)
   clean[section][key]=incoming
 ranges=[('appearance','cardScale',50,100),('appearance','dossierScale',100,160),('appearance','dossierFontSize',16,26),('appearance','fontSize',14,20),('sync','pollSeconds',5,3600),('sync','externalRefreshHours',1,168),('sources','timeoutSeconds',5,120),('sources','cacheHours',1,720),('sources','maxMissions',1,50),('sources','maxImages',0,3),('deployment','publishedPort',1024,65535),('obs','interval',8,120),('scanner','correlationSeconds',1,15),('alerts','detailDurationSeconds',5,120),('alerts','rewardDurationSeconds',5,120),('alerts','imageIntervalSeconds',3,5),('alerts','durationSeconds',5,60),('alerts','queueMaxAgeSeconds',60,86400)]
 for section,key,lo,hi in ranges:
  if not lo<=clean[section][key]<=hi: raise ValueError(f'{key}: Wert zwischen {lo} und {hi} erforderlich.')
 for section,key,choices in [('appearance','filterLayout',['compact','precision','focus']),('appearance','theme',THEMES),('appearance','view',['gallery','table','missions']),('appearance','density',['comfortable','compact']),('obs','theme',['inherit']+THEMES),('obs','layout',['dossier','strip']),('obs','status',['open','done','all']),('obs','resolution',['1920x1080','3840x2160']),('alerts','position',['bottom-right','bottom-left','top-right'])]:
  if clean[section][key] not in choices: raise ValueError('Ungültige Auswahl: '+key)
 if clean['paths']['channel'] not in ['LIVE','HOTFIX','PTU','EPTU','TECH-PREVIEW']: raise ValueError('Unbekannter Spielkanal.')
 for key in ['scRoot','logs','destination']:
  path=clean['paths'][key]
  if not valid_path(path): raise ValueError(key+': absoluter Windows- oder UNC-Pfad erforderlich.' if not POSIX_PATHS else key+': absoluter Pfad erforderlich (z. B. /home/… oder ~/…).')
 for key in ['gameLog','backups']:
  path=clean['scanner'][key]
  if not valid_path(path):raise ValueError(key+': absoluter Windows-Pfad erforderlich.' if not POSIX_PATHS else key+': absoluter Pfad erforderlich (z. B. /home/… oder ~/…).')
 for section,key in [('sources','scmdbUrl'),('sources','translationUrl'),('deployment','dashboardUrl')]:
  val=clean[section][key]
  if not val and section!='sources': continue
  url=urllib.parse.urlsplit(val)
  if url.scheme not in ['http','https'] or not url.netloc or url.username or url.password or url.fragment: raise ValueError(key+': HTTP(S)-Adresse ohne Zugangsdaten erforderlich.')
 for key in ['nasProjectPath','mediaPath']:
  if not clean['deployment'][key].startswith('/') or '..' in Path(clean['deployment'][key]).parts: raise ValueError(key+': absoluter NAS-Pfad erforderlich.')
 return clean

def save_config(body,restore=False):
 with LOCK:
  current=config()
  if body.get('revision')!=current['revision']: raise Conflict('Einstellungen wurden inzwischen geändert. Bitte neu laden.')
  settings=upgrade_config(read_json(STATE/'config.previous.json') or {}).get('settings') if restore else body.get('settings')
  settings=validate_settings(settings)
  sync_changed=any(current['settings'][k]!=settings[k] for k in ['paths','sync','sources','scanner'])
  result={'revision':current['revision']+1,'syncRevision':current['syncRevision']+int(sync_changed),'themeCatalogVersion':3,'updatedAt':now(),'settings':settings}
  write_json(STATE/'config.previous.json',current); write_json(STATE/'config.json',result)
  return result
def remote(url,payload=None,timeout=5):
 req=urllib.request.Request(url,data=json.dumps(payload).encode() if payload is not None else None,headers={'Content-Type':'application/json','User-Agent':'SCBlueprintDashboard/'+VERSION})
 with urllib.request.urlopen(req,timeout=timeout) as response: return json.loads(response.read(16*1024*1024))
SERVICES=None

def manual_ownership():
 path=STATE/'manual-ownership.json';values=read_json(path,{})
 stamp=datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat() if path.exists() else now()
 return {key:({'owned':value,'setAt':stamp} if type(value) is bool else value) for key,value in values.items()}

def services():
 global SERVICES
 with LOCK:
  if SERVICES is None:
   source=SourceCatalog(STATE,DATA,lambda:config()['settings']);cat=Catalog(DATA,source,lambda:config()['settings']);cat.manual=manual_ownership;cat.refresh();media=Media(MEDIA,STATE,cat,lambda:config()['settings']);media.initialize()
   alerts=Alerts(STATE/'events.sqlite3',cat,lambda:config()['settings']);alerts.observe()
   scanner=Scanner(STATE/'events.sqlite3',cat,lambda:config()['settings']);cat.ownership=scanner.overlay;cat.confirmations=scanner.confirmations
   SERVICES={'catalog':cat,'media':media,'alerts':alerts,'scanner':scanner,'sources':source};media.start()
  return SERVICES

def collection():
 value=read_json(STATE/'collection.json',{'revision':0,'favorites':[],'goals':[],'presets':[]})
 # Older items without an INI key used the blueprint GUID as a collection key.
 items=services()['catalog'].refresh();aliases={i['blueprint']:i['ini'] for i in items if i.get('blueprint')}
 for key in ['favorites','goals']:value[key]=list(dict.fromkeys(aliases.get(k,k) for k in value.get(key,[])))
 return value

def monitor():
 tick=0;signature=None
 while True:
  try:
   svc=services();svc['alerts'].observe();tick+=1
   if svc['catalog'].signature!=signature:
    signature=svc['catalog'].signature;svc['media'].initialize()
   if tick%5==0:svc['media'].scan_own()
  except Exception as exc: print('Besitzprüfung pausiert: '+str(exc)[:200],flush=True)
  time.sleep(2)

DIST=(ROOT/'dist').resolve()
TEXT_TYPES={'.html','.js','.css','.svg','.json','.txt'}
ASSET_REF=re.compile(r'((?:src|href)="/assets/([^"?#]+))\?v=[^"#]*"')
STATIC_CACHE={};STATIC_LOCK=threading.Lock()
def file_stamp(file):
 st=file.stat();return (str(file),st.st_mtime_ns,st.st_size)
def cached_static(key,build):
 with STATIC_LOCK:
  if key in STATIC_CACHE:return STATIC_CACHE[key]
 value=build()
 with STATIC_LOCK:
  if len(STATIC_CACHE)>400:STATIC_CACHE.clear()
  STATIC_CACHE[key]=value
 return value
def asset_hash(name):
 file=(DIST/'assets'/name).resolve()
 if not file.is_relative_to(DIST) or not file.is_file():return VERSION
 return cached_static(('hash',)+file_stamp(file),lambda:hashlib.sha256(file.read_bytes()).hexdigest()[:12])
def static_body(file):
 """Returns (bytes, ETag). HTML is rewritten with content hashes of its assets."""
 if file.suffix.lower()!='.html':
  stamp=file_stamp(file);return cached_static(('raw',)+stamp,lambda:(file.read_bytes(),'"%x-%x"'%(stamp[1],stamp[2])))
 text=file.read_text('utf-8')
 def build():
  out=ASSET_REF.sub(lambda m:m[1]+'?v='+asset_hash(m[2])+'"',text).encode()
  return out,'"'+hashlib.sha256(out).hexdigest()[:20]+'"'
 refs=tuple(sorted(set(m[2] for m in ASSET_REF.finditer(text))))
 stamps=tuple(file_stamp(DIST/'assets'/r) if (DIST/'assets'/r).is_file() else (r,0,0) for r in refs)
 return cached_static(('html',)+file_stamp(file)+stamps,build)
def static_gzip(tag,body):
 return cached_static(('gzip',tag,len(body)),lambda:gzip.compress(body,6,mtime=0))
def hub_current(svc):
 """Live-Stand für den Stream Control Hub (ersetzt die alte, feste data/hub-current.json)."""
 src=svc['sources'].status();events=svc['alerts'].archive(1);last=events[0] if events else None
 version=src.get('version') or '—';items=src.get('items',0)
 stamps=[t for t in (src.get('lastSuccess'),src.get('checkedAt'),last and last['updated_at']) if t]
 revision=hashlib.sha256(json.dumps([version,items,src.get('signature'),last and last['id']]).encode()).hexdigest()[:16]
 return {'title':f'Bauplanarchiv · {items} Baupläne · SCMDB {version}','revision':revision,'updated_at':max(stamps) if stamps else '',
         'permalink':'/obs.html?status=open&interval=20','url':'https://scmdb.net/','status':'fehler' if src.get('error') else 'ok',
         'scmdb_version':version,'items':items,'last_event':last['title'] if last else ''}
def cache_policy(raw_path):
 """Versioned assets (?v=...) never change; everything else static is revalidated."""
 parts=urllib.parse.urlsplit(raw_path);path=parts.path
 if path.startswith(('/api/','/data/')) or path in ['/healthz','/health']:return None
 versioned='v' in urllib.parse.parse_qs(parts.query)
 if path.startswith('/media/'):return 'public, max-age=31536000, immutable' if versioned else 'no-cache'
 if path.endswith(('.js','.css')):return 'public, max-age=31536000, immutable' if versioned else 'no-cache'
 if path.endswith(('.html','/')) or '.' not in path.rsplit('/',1)[-1]:return 'no-cache'
 if path.startswith('/assets/'):return 'public, max-age=86400'
 return None

# 5.1.0 Sprachumschaltung: Spielinhalte tragen ihre englische Fassung als "en". Bei Sprache Englisch
# (Cookie scbp-lang=en oder ?lang=en) legt der Server sie über die deutschen Felder. Zwischengespeicherte
# Daten werden nie verändert; große, unveränderte Antworten werden einmal umgerechnet und gemerkt.
_EN_CACHE={}


def english(value):
    if isinstance(value,dict):
        out={k:english(v) for k,v in value.items() if k!='en'}
        overlay=value.get('en')
        if isinstance(overlay,dict):
            for k,v in overlay.items():
                if v:out[k]=v
        return out
    if isinstance(value,list):return [english(v) for v in value]
    return value


def english_cached(obj):
    hit=_EN_CACHE.get(id(obj))
    if hit and hit[0] is obj:return hit[1]
    result=english(obj)
    if len(_EN_CACHE)>=4:_EN_CACHE.pop(next(iter(_EN_CACHE)))
    _EN_CACHE[id(obj)]=(obj,result)
    return result


class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
 def log_message(self,fmt,*args):
  if STANDALONE:return  # Einzelversion: kein Anfrageprotokoll (OBS fragt jede Sekunde), Logdatei bleibt klein
  print(f'{self.command} {urllib.parse.urlsplit(self.path).path}',flush=True)
 def end_headers(self):
  policy=cache_policy(self.path)
  if policy:self.send_header('Cache-Control',policy)
  self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer')
  super().end_headers()
 def serve_static(self):
  """Text files from dist/: gzip when accepted, ETag revalidation, and in HTML every
  /assets/...?v= reference carries a hash of the referenced file, so a changed asset
  always gets a new URL (no stale scripts in browsers or the OBS browser source)."""
  decoded=urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
  if decoded.startswith(('/data/','/media/','/api/')):return False
  try:
   file=Path(self.translate_path(self.path))
   if file.is_dir():file=file/'index.html'
   if not file.resolve().is_relative_to(DIST) or file.suffix.lower() not in TEXT_TYPES or not file.is_file():return False
   body,tag=static_body(file)
  except (OSError,ValueError):return False
  if self.headers.get('If-None-Match')==tag:
   self.send_response(304);self.send_header('ETag',tag);self.send_header('Vary','Accept-Encoding');self.end_headers();return True
  compressed=len(body)>=1024 and 'gzip' in self.headers.get('Accept-Encoding','')
  if compressed:body=static_gzip(tag,body)
  self.send_response(200);self.send_header('Content-Type',self.guess_type(str(file)));self.send_header('ETag',tag);self.send_header('Vary','Accept-Encoding')
  if compressed:self.send_header('Content-Encoding','gzip')
  self.send_header('Content-Length',str(len(body)));self.end_headers()
  try:self.wfile.write(body)
  except (BrokenPipeError,ConnectionResetError):pass
  return True
 def lang(self):
  q=urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('lang',[''])[0].lower()
  if q in ('de','en'):return q
  match=re.search(r'(?:^|;\s*)scbp-lang=(de|en)(?![a-z])',self.headers.get('Cookie',''))
  return match.group(1) if match else 'de'
 def reply(self,obj,status=200):
  if self.command=='GET' and self.lang()=='en' and isinstance(obj,(dict,list)):obj=english_cached(obj)
  raw=json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode()
  compressed=len(raw)>262144 and 'gzip' in self.headers.get('Accept-Encoding','')
  if compressed:raw=gzip.compress(raw)
  self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Vary','Accept-Encoding')
  if compressed:self.send_header('Content-Encoding','gzip')
  self.send_header('Content-Length',str(len(raw)));self.end_headers()
  try:
   for offset in range(0,len(raw),65536):self.wfile.write(raw[offset:offset+65536])
  except (BrokenPipeError,ConnectionResetError):pass
 def agent_authorized(self):return secrets.compare_digest(self.headers.get('Authorization',''),'Bearer '+(STATE/'agent-token').read_text().strip())
 def browser_authorized(self):
  origin=self.headers.get('Origin')
  return self.headers.get('X-SC-Request')=='dashboard' and (not origin or urllib.parse.urlsplit(origin).netloc==self.headers.get('Host'))
 def translate_path(self,path):
  decoded=urllib.parse.unquote(urllib.parse.urlsplit(path).path)
  if decoded.startswith('/data/'):
   candidate=(DATA/decoded[6:]).resolve()
   return str(candidate) if candidate.is_relative_to(DATA.resolve()) and candidate.suffix=='.json' else str(ROOT/'nonexistent')
  if decoded.startswith('/media/'):
   candidate=services()['media'].confined(decoded[7:])
   return str(candidate) if candidate and candidate.suffix.lower() in EXTENSIONS and candidate.is_file() else str(ROOT/'nonexistent')
  return super().translate_path(path)
 def list_directory(self,path):self.send_error(403);return None
 def do_GET(self):
  parsed=urllib.parse.urlsplit(self.path);path=parsed.path;q=urllib.parse.parse_qs(parsed.query)
  try:
   if path in ['/healthz','/health']:return self.reply({'ok':True,'version':VERSION,'mode':'standalone' if STANDALONE else 'nas'})
   if path=='/data/scmdb-items.json':
    svc=services();return self.reply(svc['sources'].active_snapshot() or svc['sources'].legacy_snapshot())
   if path=='/api/config':
    with LOCK:return self.reply({**config(),'agent':read_json(STATE/'agent.json',{}),'hasPrevious':(STATE/'config.previous.json').exists(),'mode':'standalone' if STANDALONE else 'nas','platform':'windows' if os.name=='nt' else 'linux'})
   if path=='/api/collection':return self.reply(collection())
   if path=='/api/agent-config':
    if not self.agent_authorized():return self.reply({'error':'Windows-Verbindung nicht autorisiert.'},401)
    cfg=config();return self.reply({'revision':cfg['syncRevision'],'paths':{**LEGACY_AGENT_PATHS,**cfg['settings']['paths']},'sync':cfg['settings']['sync'],'sources':{**cfg['settings']['sources'],**LEGACY_AGENT_SOURCES},'scanner':{**cfg['settings']['scanner'],'mode':'logs'},'request':read_json(STATE/'sync-request.json',{})})
   if path=='/api/obs':
    cfg=config();obs={**cfg['settings']['obs'],'position':cfg['settings']['alerts']['position'],'animations':cfg['settings']['appearance']['animations']}
    if obs['theme']=='inherit':obs['theme']=cfg['settings']['appearance']['theme']
    if cfg['settings']['sources']['maxImages']==0:obs['showImage']=False
    return self.reply({'revision':cfg['revision'],'settings':obs,'alerts':cfg['settings']['alerts'],'selection':read_json(STATE/'obs.json',{})})
   svc=services()
   if path=='/api/current':return self.reply(hub_current(svc))
   if path=='/api/archive':return self.reply(svc['alerts'].archive(30))
   if path=='/api/scanner':return self.reply(svc['scanner'].status())
   if path.startswith('/api/missions/instance/'):
    mission=svc['scanner'].instance(urllib.parse.unquote(path.rsplit('/',1)[-1]));return self.reply({'mission':mission})
   if path=='/api/missions/templates':return self.reply({'missions':svc['catalog'].mission_templates()})
   if path=='/api/missions/active':return self.reply(svc['scanner'].active_missions())
   if path=='/api/missions/live':return self.reply(svc['scanner'].live_missions(int(q.get('after',['0'])[0])))
   if path=='/api/sources/catalog':return self.reply(svc['sources'].status())
   if path=='/api/catalog/data':return self.reply(svc['sources'].active_snapshot() or svc['sources'].legacy_snapshot())
   if path in ['/api/catalog','/api/catalog/revision']:
    cat=svc['catalog'];cat.refresh();signature=hashlib.sha256(repr(cat.signature).encode()).hexdigest()
    return self.reply({'signature':signature} if path.endswith('/revision') else {**cat.snapshot(),'signature':signature})
   if path.startswith('/api/log-details/'):
    item=svc['catalog'].get(urllib.parse.unquote(path.rsplit('/',1)[-1]));return self.reply({'missions':item['scmdb'].get('missions',[]),**svc['media'].response(item)})
   if path.startswith('/api/dossier/'):
    item=svc['catalog'].get(urllib.parse.unquote(path.rsplit('/',1)[-1]));return self.reply(svc['media'].response(item,q.get('enrich')==['1']))
   if path=='/api/media/status':return self.reply(svc['media'].stats())
   if path=='/api/media/revision':return self.reply({'revision':svc['media'].revision})
   if path=='/api/obs/alerts':
    result=svc['alerts'].current(consume=q.get('consume')==['1'])
    if result['event']:
     for item in result['event']['items']:
      try:item['images']=svc['media'].response(svc['catalog'].get(item.get('id') or item.get('selectedBlueprint',{}).get('id')))['data']['images']
      except (ValueError,KeyError):item['images']=[]
    return self.reply(result)
   if path=='/api/obs/history':return self.reply(svc['alerts'].history())
   if path=='/api/ships':
    try:return self.reply(svc['media'].ships())
    except Exception as e:return self.reply({**read_json(STATE/'ships.json',{'ships':[]}),'error':str(e)[:200]})
   if path.startswith('/api/'):return self.reply({'error':'Endpunkt nicht gefunden.'},404)
   if self.serve_static():return
   return super().do_GET()
  except (ValueError,OSError) as exc:self.reply({'error':str(exc)},400)
 def do_POST(self):
  parsed=urllib.parse.urlsplit(self.path);path=parsed.path;q=urllib.parse.parse_qs(parsed.query)
  if not (self.agent_authorized() if path in ['/api/agent-status','/api/agent/log-batch'] else self.browser_authorized()):
   # Drain a small rejected body so Windows does not reset the socket before
   # the client receives the 403 response. Never parse or execute this body.
   try:
    rejected_size=int(self.headers.get('Content-Length','0'))
    if 0<rejected_size<=1024*1024:
     self.connection.settimeout(1);self.rfile.read(rejected_size)
   except (ValueError,OSError):pass
   return self.reply({'error':'Anfrage nicht autorisiert.'},403)
  try:
   size=int(self.headers.get('Content-Length','0'))
   if path.startswith('/api/media/upload/'):
    if not 0<size<=MAX_IMAGE:return self.reply({'error':'Maximal 12 MB pro Bild.'},413)
    svc=services();item=svc['catalog'].get(urllib.parse.unquote(path.rsplit('/',1)[-1]));slot=int(q.get('slot',['1'])[0]);raw=self.rfile.read(size)
    return self.reply(svc['media'].upload(item,slot,raw))
   if not 0<size<=1024*1024:return self.reply({'error':'Ungültige Anfragengröße.'},413)
   body=json.loads(self.rfile.read(size))
   if not isinstance(body,dict):raise ValueError('JSON-Objekt erwartet.')
   if path in ['/api/config','/api/config/restore']:
    result=save_config(body,path.endswith('/restore'))
    if not result['settings']['alerts']['enabled']:services()['alerts'].clear()
    return self.reply(result)
   if path=='/api/config/migrate':
    value=body.get('export') or {};value.setdefault('themeCatalogVersion',2 if value.get('schema')==3 else 1)
    if value.get('schema') not in [2,3,4,5]:raise ValueError('Kein gültiger Konfigurationsexport.')
    return self.reply({'settings':validate_settings(upgrade_config(value)['settings'])})
   if path=='/api/pairing':
    st=config()['settings']
    if not st['deployment']['dashboardUrl']:raise ValueError('Bitte zuerst die Dashboard-Adresse speichern.')
    return self.reply({'dashboardUrl':st['deployment']['dashboardUrl'],'agentToken':(STATE/'agent-token').read_text().strip(),'targetDataPath':st['paths']['destination']})
   if path=='/api/agent/log-batch':
    svc=services();result=svc['scanner'].ingest(body);svc['alerts'].observe();return self.reply(result)
   if path=='/api/ownership':
    owned=body.get('owned')
    if 'owned' not in body or (owned is not None and type(owned) is not bool):raise ValueError('Besitz muss Ja, Nein oder Automatisch sein.')
    svc=services();item=svc['catalog'].get(body.get('item'))
    with LOCK:
     manual=manual_ownership()
     if owned is None:manual.pop(item['ini'],None)
     else:manual[item['ini']]={'owned':owned,'setAt':now()}
     write_json(STATE/'manual-ownership.json',manual)
    return self.reply({'ok':True,'item':svc['catalog'].public(svc['catalog'].get(item['ini']))})
   if path=='/api/scanner/resolve':return self.reply(services()['scanner'].review(body))
   if path=='/api/agent-status':
    result={k:body.get(k) for k in ['revision','status','message','machine','lastSuccess','requestId']}
    if result['status'] not in ['applied','error','paused','syncing','ok'] or type(result['revision']) is not int or any(len(str(v))>2000 for v in result.values()):raise ValueError('Ungültige Agent-Rückmeldung.')
    scanner=body.get('scanner')
    if scanner is not None:
     if not isinstance(scanner,dict) or len(json.dumps(scanner))>10000:raise ValueError('Ungültiger Scanner-Status.')
     result['scanner']=scanner
    result['receivedAt']=now()
    with LOCK:write_json(STATE/'agent.json',result)
    return self.reply({'ok':True})
   if path=='/api/sync/request':
    request={'id':secrets.token_hex(8),'at':now(),'external':bool(body.get('external'))}
    with LOCK:write_json(STATE/'sync-request.json',request)
    if request['external']:services()['sources'].wake.set()
    return self.reply({'ok':True,'request':request,'message':'NAS prüft Katalog und Sprache im Hintergrund.' if request['external'] else 'Anforderung gespeichert. Der PC übernimmt sie beim nächsten Kontakt.'})
   if path=='/api/collection':
    with LOCK:
     current=read_json(STATE/'collection.json',{'revision':0,'favorites':[],'goals':[],'presets':[]})
     if body.get('revision')!=current['revision']:raise Conflict('Sammlung wurde geändert. Bitte erneut versuchen.')
     for key in ['favorites','goals']:
      values=body.get(key)
      if not isinstance(values,list) or len(values)>10000 or any(not isinstance(x,str) or len(x)>500 for x in values):raise ValueError('Ungültige Sammlung.')
     presets=body.get('presets')
     if not isinstance(presets,list) or len(presets)>50 or any(not isinstance(x,dict) or not isinstance(x.get('name'),str) or not x['name'].strip() or len(x['name'])>80 or not isinstance(x.get('filters'),dict) for x in presets):raise ValueError('Ungültige Filtervorlagen (maximal 50).')
     result={'revision':current['revision']+1,'favorites':list(dict.fromkeys(body['favorites'])),'goals':list(dict.fromkeys(body['goals'])),'presets':presets};write_json(STATE/'collection.json',result)
    return self.reply(result)
   svc=services()
   if path=='/api/media/delete':return self.reply(svc['media'].delete(svc['catalog'].get(body.get('id')),int(body.get('slot',0))))
   if path=='/api/media/refresh':
    if body.get('id'):return self.reply(svc['media'].response(svc['catalog'].get(body['id']),True,True))
    svc['media'].initialize();svc['media'].revision+=1;return self.reply({'ok':True,'message':'Eigene Bilder neu eingelesen.'})
   if path=='/api/media/prepare':return self.reply(svc['media'].prepare())
   if path=='/api/obs/test':
    keys=body.get('items') or [i['id'] for i in svc['catalog'].refresh()[:3]]
    if not isinstance(keys,list) or len(keys)>6:raise ValueError('Maximal sechs Test-Items auswählen.')
    ident=svc['alerts'].enqueue([svc['catalog'].get(k) for k in keys],'test','Vorschau · Testfund')
    return self.reply({'ok':True,'event':ident})
   if path=='/api/missions/close':return self.reply(svc['scanner'].close_mission(body))
   if path=='/api/obs/clear':svc['alerts'].clear();return self.reply({'ok':True})
   if path=='/api/obs':
    kind=body.get('kind')
    if kind not in ['item','mission','mission-details','mission-brief','archive-mission','found-item','cycle']:raise ValueError('Ungültige OBS-Auswahl.')
    result={k:str(body.get(k,'')).strip()[:500] for k in ['item','mission','title']};result.update({'kind':kind,'updatedAt':now(),'nonce':secrets.token_hex(8)})
    if kind in ['archive-mission','found-item']:
     status=svc['scanner'].status()
     if kind=='found-item':
      found=next((e for e in status['events'] if e['id']==body.get('event')),None)
      if not found or not found.get('ini'):raise ValueError('Zugeordneter Fund nicht gefunden.')
      svc['alerts'].enqueue([svc['catalog'].get(found['ini'])],'manual',found['name'])
     else:
      template=svc['scanner'].instance(body.get('guid'))
      if not template:raise ValueError('Archivauftrag nicht eindeutig zugeordnet.')
      svc['alerts'].enqueue([{'name':template.get('title'),'description':template.get('description'),'missionDetails':template}],'mission-brief',template.get('title') or '')
    if kind=='item':svc['alerts'].enqueue([svc['catalog'].get(result['item'])],'manual',result['title'])
    if kind=='mission':
     svc['alerts'].enqueue(mission_rewards(svc['catalog'],result['mission']),'mission',result['title'])
    if kind=='mission-brief':
     mission=next((m for m in svc['catalog'].mission_templates() if result['mission'] in (m.get('id'),m.get('debugName'))),None)
     if not mission:raise ValueError('Auftrag nicht im lokalen Bestand gefunden.')
     svc['alerts'].enqueue([{'name':mission.get('title'),'description':mission.get('description'),'missionDetails':mission}],'mission-brief',mission.get('title') or '')
    if kind=='mission-details':
     payload=mission_dossier(svc['catalog'],result['mission'],body.get('item'))
     svc['alerts'].enqueue([payload],'mission-details',payload['name'])
    with LOCK:write_json(STATE/'obs.json',result)
    return self.reply({'ok':True,'selection':result,'message':'Zur direkten OBS-Warteschlange hinzugefügt.'})
   if path=='/api/diagnostics':
    stats=svc['media'].stats();rows=[{'name':'Bauplanbestand','ok':not svc['catalog'].error,'detail':svc['catalog'].error or f'{len(svc["catalog"].items)} eindeutige Items'},{'name':'Dauerhafter Bildspeicher','ok':os.access(MEDIA,os.W_OK),'detail':f'{stats["files"]} Bilder · {stats["bytes"]//1024} KB'},{'name':'OBS-Ereignisspeicher','ok':(STATE/'events.sqlite3').is_file(),'detail':'Lokal · Browserquelle /obs.html'},{'name':'Integrierter Log-Leser' if STANDALONE else 'Windows-PC','ok':bool(read_json(STATE/'agent.json',{}).get('receivedAt')),'detail':read_json(STATE/'agent.json',{}).get('message','Noch kein Kontakt')}]
    rows += [{'name':name,'ok':row['ok'],'detail':row['detail']} for name,row in stats['health'].items()]
    return self.reply({'checks':rows})
   return self.reply({'error':'Endpunkt nicht gefunden.'},404)
  except Conflict as exc:return self.reply({'error':str(exc)},409)
  except (ValueError,OSError,TypeError) as exc:return self.reply({'error':str(exc)},400)

def start_local_agent():
 svc=services()
 def write_agent(result):
  with LOCK:write_json(STATE/'agent.json',result)
 agent=standalone_mode.LocalAgent(STATE,DATA,lambda:config()['settings'],svc['scanner'],svc['alerts'],write_agent,LOCK,lambda:config()['syncRevision'])
 agent.start();return agent

if __name__=='__main__':
 init_state();services();
 if os.environ.get('SCBP_CATALOG_WORKER','1')!='0':services()['sources'].start()
 threading.Thread(target=monitor,daemon=True).start()
 if not STANDALONE:
  from scbp import zentrale_report;zentrale_report.start(services,VERSION,STATE)
 port=int(os.environ.get('PORT','8188' if STANDALONE else '8080'))
 if STANDALONE:start_local_agent()
 # Einzelversion: nur dieser PC (OBS läuft auf demselben Rechner). Freigabe im Heimnetz mit SCBP_HOST=0.0.0.0.
 host=os.environ.get('SCBP_HOST','127.0.0.1' if STANDALONE else '0.0.0.0')
 print(f'SC Blueprint Dashboard {VERSION} · {"Einzelversion" if STANDALONE else "NAS"} · http://{"127.0.0.1" if host=="0.0.0.0" else host}:{port}/',flush=True)
 ThreadingHTTPServer((host,port),Handler).serve_forever()
