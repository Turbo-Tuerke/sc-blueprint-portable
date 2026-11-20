"""Parse selected game log lines; persist ownership and reviewable mission evidence.

No game process access. The authenticated Windows helper sends complete log lines.
Historical discoveries and OBS suppression share one SQLite transaction.
"""
import copy
import hashlib
from contextlib import contextmanager
import json
import re
import sqlite3
import threading
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from .common import now
from .source_catalog import load_name_aliases
from . import journal

STAMP = re.compile(r'^<([0-9T:\-.Z]+)>')
MARKER = re.compile(r'CreateMarker.*missionId \[([^\]]+)\].*generator name \[([^\]]+)\].*contract \[([^\]]+)\]')
DEFINITION = re.compile(r'contractDefinitionId\[([^\]]+)\]')
ACCEPT = re.compile(r'Added notification "(?:Auftrag angenommen|Contract Accepted):.*?MissionId: \[([^\]]+)\]', re.I)
END = re.compile(r'<EndMission>.*MissionId\[([^\]]+)\].*CompletionType\[(\w+)\].*Reason\[([^\]]+)\]')
BLUEPRINT = re.compile(r'<SHUDEvent_OnNotification>.*Added notification "(?:Bauplan erhalten|Received Blueprint):\s*(.*?)\s*:\s*"', re.I)
COMPONENT_SUFFIX = re.compile(r'\s+\((?:S\d+\s+[A-D]\s+(?:Industrial|Military|Civilian|Stealth|Competition)|(?:Civ|Mil|Ind|Stl|Sth|Cmp)/\d+/[A-D])\)$', re.I)
ALIASES = {'BlueFlame Racing Flight Suit':'Neutrino Racing Flight Suit BlueFlame',
           'BlueFlame Racing Helmet':'Neutrino Racing Helmet BlueFlame',
           'WhiteHot Racing Helmet':'Neutrino Racing Helmet WhiteHot',
           'S0 Hofstede':'S00 Hofstede'}

def normalized(value):
    value=unicodedata.normalize('NFKC',value).strip()
    value=COMPONENT_SUFFIX.sub('',value)
    value=re.sub(r'\((\d+)\s+(?:Schuss|Cap)\)',r'(\1 cap)',value,flags=re.I)
    return ' '.join(value.casefold().split())

def event_key(channel,kind,ts,name):
    return hashlib.sha256(json.dumps([channel,kind,ts,name],ensure_ascii=False).encode()).hexdigest()

def effective_mode(cfg):
    # 5.6.0: Ohne Launcher gibt es nur noch eine Besitzquelle: das Game.log.
    return 'logs'

LIVE_LIMIT=50  # Standard-Seitengröße der Live-Aufträge (vor 4.1.7: 20)
LIVE_PAGE_SIZES=(10,20,50,100,150,200)  # 6.0.4: Akten pro Seite, keine feste Obergrenze mehr
OPEN_MISSIONS="m.channel=? AND m.start IS NOT NULL AND m.status!='Abandon' AND NOT EXISTS(SELECT 1 FROM mission_closed c WHERE c.channel=m.channel AND c.guid=m.guid)"

class Scanner:
    def __init__(self,path,catalog,settings,clock=time.time):
        self.path=Path(path);self.catalog=catalog;self.settings=settings;self.clock=clock;self.lock=threading.RLock()
        with self.db() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS mission_context(channel TEXT,guid TEXT,data TEXT,PRIMARY KEY(channel,guid));
            CREATE TABLE IF NOT EXISTS mission_closed(channel TEXT,guid TEXT,PRIMARY KEY(channel,guid));
            CREATE TABLE IF NOT EXISTS mission_feed(seq INTEGER PRIMARY KEY AUTOINCREMENT,event TEXT UNIQUE,channel TEXT,guid TEXT,ts TEXT,historical INTEGER);
            CREATE TABLE IF NOT EXISTS scan_meta(key TEXT PRIMARY KEY,value TEXT);
            CREATE TABLE IF NOT EXISTS scan_owned(channel TEXT,ini TEXT,at TEXT,source TEXT,PRIMARY KEY(channel,ini));
            CREATE TABLE IF NOT EXISTS scan_sources(id TEXT PRIMARY KEY,context TEXT);
            CREATE TABLE IF NOT EXISTS scan_batches(id TEXT PRIMARY KEY,at TEXT);
            CREATE TABLE IF NOT EXISTS scan_events(id TEXT PRIMARY KEY,channel TEXT,kind TEXT,ts TEXT,name TEXT,ini TEXT,historical INTEGER,mission TEXT,source TEXT,status TEXT);
            CREATE TABLE IF NOT EXISTS scan_missions(channel TEXT,guid TEXT,debug TEXT,definition TEXT,status TEXT,start TEXT,end TEXT,PRIMARY KEY(channel,guid));
            '''+journal.SCHEMA)
        self.seed()

    @contextmanager
    def db(self):
        connection=sqlite3.connect(self.path,timeout=20)
        try:
            with connection:yield connection
        finally:connection.close()
    def seed(self,force=False):
        # 5.6.0: Früher kam hier der Startbestand aus der Launcher-Datei. Er liegt seit dem 08.10. fest in
        # scan_owned (source 'baseline') und bleibt dort; neue Kanäle starten leer und füllen sich aus dem Log.
        return

    def bump(self,db):
        db.execute('INSERT INTO scan_meta VALUES("revision","1") ON CONFLICT(key) DO UPDATE SET value=CAST(value AS INTEGER)+1')

    def overlay(self):
        cfg=self.settings();channel=cfg['paths']['channel'];mode=effective_mode(cfg)
        with self.db() as db:
            rev=db.execute('SELECT value FROM scan_meta WHERE key="revision"').fetchone()
            owned={r[0]:r[1] for r in db.execute('SELECT ini,at FROM scan_owned WHERE channel=?',(channel,))}
        return (channel,mode,int(rev[0]) if rev else 0),owned

    def confirmations(self):
        channel=self.settings()['paths']['channel']
        with self.db() as db:
            return {r[0]:{'log':True,'latestLive':r[1]} for r in db.execute('SELECT ini,MAX(CASE WHEN historical=0 THEN ts END) FROM scan_events WHERE channel=? AND ini IS NOT NULL GROUP BY ini',(channel,))}

    def name_index(self):
        """Alias index, rebuilt only when the catalog or a mapping file changes."""
        items=self.catalog.refresh()
        # Names depend on the SCMDB snapshot and the fallback file, not on ownership overlays
        # or manual marks (catalog.signature positions 1 and 3).
        base=self.catalog.signature
        base=(base[0],base[2]) if isinstance(base,tuple) and len(base)>=4 else (base,id(items))
        signature=(base,len(items))
        with self.lock:
            if getattr(self,'_name_signature',None)==signature:return self._name_index
        index={}
        def add(alias,ini):
            if alias:index.setdefault(normalized(alias),set()).add(ini)
        for i in items:
            add(i['name'],i['ini'])
            add(i.get('scmdb',{}).get('name'),i['ini'])
            add(i.get('scmdb',{}).get('profile',{}).get('name'),i['ini'])
        # Feste Zusatznamen (alte Spielnamen) aus der Schlüsseltabelle: explizite Zuordnungen, keine Vermutung.
        for alias,ini in load_name_aliases().items():
            if ini in self.catalog.by_key:add(alias,ini)
        for alias,target in ALIASES.items():
            for ini in list(index.get(normalized(target),set())):add(alias,ini)
        with self.lock:self._name_index=index;self._name_signature=signature
        return index

    def resolve_name(self,name):
        candidates=self.name_index().get(normalized(name),set())
        if COMPONENT_SUFFIX.search(name):candidates={k for k in candidates if self.catalog.by_key[k]['mainCategory']=='vehicle'}
        return sorted(candidates)

    def ingest(self,body):
        cfg=self.settings();channel=body.get('channel')
        if channel!=cfg['paths']['channel']:raise ValueError('Spielkanal stimmt nicht mit der Konfiguration überein.')
        lines=body.get('lines');source=body.get('source');generation=body.get('generation');historical=body.get('historical')
        if not isinstance(lines,list) or len(lines)>1024 or any(not isinstance(l,str) or len(l)>32768 for l in lines):raise ValueError('Ungültige Logzeilen.')
        if not isinstance(source,str) or not source or len(source)>2000 or not isinstance(generation,str) or len(generation)>128 or type(historical) is not bool:raise ValueError('Ungültige Scanner-Herkunft.')
        for k in ['start','end']:
            if type(body.get(k)) is not int or body[k]<0:raise ValueError('Ungültige Leseposition.')
        if body['end']<body['start']:raise ValueError('Ungültiger Logbereich.')
        # Ohne Itemkatalog ließe sich kein Fund zuordnen und er bliebe dauerhaft „offen“. Ablehnen:
        # Helfer bzw. integrierter Leser behalten ihre Position und versuchen es später erneut.
        if not self.catalog.refresh():raise ValueError('Itemkatalog wird noch geladen – Spielmeldungen werden danach gelesen.')
        ident=hashlib.sha256(json.dumps([channel,source,generation,body['start'],body['end'],lines],ensure_ascii=False).encode()).hexdigest()
        session=event_key(channel,'source',generation,source)
        self.seed()
        acquired=[]
        with self.lock,self.db() as db:
            self.capture_context(db,channel,lines)
            if db.execute('SELECT 1 FROM scan_batches WHERE id=?',(ident,)).fetchone():return {'ok':True,'duplicate':True,'end':body['end']}
            row=db.execute('SELECT context FROM scan_sources WHERE id=?',(session,)).fetchone()
            context=json.loads(row[0]) if row else {'markers':{},'recent':[]}
            for line in lines:
                ts=STAMP.match(line)
                if not ts:continue
                timestamp=ts.group(1)
                try:epoch=datetime.fromisoformat(timestamp.replace('Z','+00:00')).timestamp()
                except ValueError:continue
                marker=MARKER.search(line)
                if marker:
                    definition=DEFINITION.search(line)
                    context['markers'][marker[1]]={'guid':marker[1],'debugName':marker[3],'generator':marker[2],'contractDefinitionId':definition[1] if definition else None}
                    # Keep a bounded session context while persistent mission history remains in SQLite.
                    if len(context['markers'])>2000:context['markers'].pop(next(iter(context['markers'])))
                    continue
                acceptance=ACCEPT.search(line);ended=END.search(line)
                if acceptance or ended:
                    guid=acceptance[1] if acceptance else ended[1];entry=context['markers'].get(guid,{'guid':guid,'debugName':None,'contractDefinitionId':None})
                    status='accepted' if acceptance else ended[2]
                    old=db.execute('SELECT start,end FROM scan_missions WHERE channel=? AND guid=?',(channel,guid)).fetchone()
                    start=timestamp if acceptance else old[0] if old else None
                    db.execute('INSERT INTO scan_missions VALUES(?,?,?,?,?,?,?) ON CONFLICT(channel,guid) DO UPDATE SET debug=COALESCE(excluded.debug,debug),definition=COALESCE(excluded.definition,definition),status=excluded.status,start=COALESCE(start,excluded.start),end=excluded.end WHERE COALESCE(excluded.end,excluded.start)>=COALESCE(scan_missions.end,scan_missions.start)',(channel,guid,entry.get('debugName'),entry.get('contractDefinitionId'),status,start,None if acceptance else timestamp))
                    if acceptance:
                        silent=historical or epoch<self.clock()-cfg['alerts']['queueMaxAgeSeconds']
                        inserted=db.execute('INSERT OR IGNORE INTO mission_feed(event,channel,guid,ts,historical) VALUES(?,?,?,?,?)',(event_key(channel,'accept',timestamp,guid),channel,guid,timestamp,int(silent))).rowcount
                        if inserted and not silent and cfg['scanner'].get('autoMissionObs',True) and cfg['alerts']['enabled']:
                            template=self.match_mission(entry.get('contractDefinitionId'),entry.get('debugName'))
                            title=(template or {}).get('title') or entry.get('debugName') or guid
                            description=(template or {}).get('description') or 'Keine eindeutige Auftragsbeschreibung im Katalog verfügbar.'
                            payload=[{'name':title,'category':'Auftrag angenommen','description':description}]
                            db.execute('INSERT INTO events(created,kind,items,title) VALUES(?,?,?,?)',(self.clock(),'mission-accepted',json.dumps(payload,ensure_ascii=False),title))
                    if acceptance or status=='Complete':
                        context['recent'].append({**entry,'epoch':epoch,'trigger':'accept' if acceptance else 'complete'})
                        context['recent']=context['recent'][-32:]
                    continue
                # 6.0.3: Ladenkäufe und Reise-Meldungen für Seite 5 der Akte
                entry=journal.parse(line)
                if entry:
                    journal.store(db,channel,timestamp,epoch,entry,event_key)
                    continue
                match=BLUEPRINT.search(line)
                if not match:continue
                name=match[1].strip();key=event_key(channel,'blueprint',timestamp,name)
                if db.execute('SELECT 1 FROM scan_events WHERE id=?',(key,)).fetchone():continue
                candidates=self.resolve_name(name);ini=candidates[0] if len(candidates)==1 else None
                recent=[e for e in context['recent'] if 0<=epoch-e['epoch']<=cfg['scanner']['correlationSeconds']]
                mission=None
                if recent:
                    best=min(epoch-e['epoch'] for e in recent);nearest=[e for e in recent if epoch-e['epoch']==best]
                    if len({e['guid'] for e in nearest})==1:
                        mission={k:v for k,v in nearest[-1].items() if k!='epoch'};mission['association']='zeitlich';mission['deltaSeconds']=round(best,3)
                silent=historical or epoch < self.clock()-cfg['alerts']['queueMaxAgeSeconds']
                db.execute('INSERT INTO scan_events VALUES(?,?,?,?,?,?,?,?,?,?)',(key,channel,'blueprint',timestamp,name,ini,int(silent),json.dumps(mission,ensure_ascii=False),source,'resolved' if ini else 'unresolved'))
                if ini:
                    # 5.6.3: Frühester Logfund zählt, auch wenn ältere Logs später gelesen werden (Einzelversion liest neueste zuerst).
                    db.execute("INSERT INTO scan_owned VALUES(?,?,?,?) ON CONFLICT(channel,ini) DO UPDATE SET at=excluded.at WHERE scan_owned.source='log' AND excluded.at<scan_owned.at",(channel,ini,timestamp,'log'))
                    if silent:db.execute('INSERT OR IGNORE INTO seen VALUES(?)',(ini,))
                    acquired.append(ini)
            db.execute('INSERT OR REPLACE INTO scan_sources VALUES(?,?)',(session,json.dumps(context,ensure_ascii=False)))
            db.execute('INSERT INTO scan_batches VALUES(?,?)',(ident,now()))
            # 4.1.5: Replay protection only needs recent batches; event tables deduplicate on their own.
            if self.clock()-getattr(self,'_batches_pruned',0)>3600:
                self._batches_pruned=self.clock()
                db.execute('DELETE FROM scan_batches WHERE at<?',(datetime.fromtimestamp(self.clock()-90*86400,timezone.utc).isoformat(),))
            db.execute('INSERT OR REPLACE INTO scan_meta VALUES("lastScan",?)',(now(),))
            db.execute('INSERT OR REPLACE INTO scan_meta VALUES("lastFile",?)',(source,))
            if acquired:self.bump(db)
        return {'ok':True,'end':body['end'],'matched':len(acquired)}

    def review(self,body):
        ident=body.get('event');item=self.catalog.get(body.get('item'))
        with self.lock,self.db() as db:
            row=db.execute('SELECT channel,ts,historical,status FROM scan_events WHERE id=?',(ident,)).fetchone()
            if not row or row[3]!='unresolved':raise ValueError('Offener Scanner-Treffer nicht gefunden.')
            db.execute('UPDATE scan_events SET ini=?,status="reviewed" WHERE id=?',(item['ini'],ident))
            db.execute('INSERT OR IGNORE INTO scan_owned VALUES(?,?,?,?)',(row[0],item['ini'],row[1],'review'))
            # Manual correction of old evidence must not surprise the stream.
            db.execute('INSERT OR IGNORE INTO seen VALUES(?)',(item['ini'],));self.bump(db)
        return {'ok':True}

    def status(self):
        channel=self.settings()['paths']['channel']
        with self.db() as db:
            db.row_factory=sqlite3.Row
            meta={r['key']:r['value'] for r in db.execute('SELECT * FROM scan_meta')}
            events=[dict(r) for r in db.execute('SELECT * FROM scan_events WHERE channel=? ORDER BY ts DESC LIMIT 40',(channel,))]
            unresolved=[dict(r) for r in db.execute('SELECT * FROM scan_events WHERE channel=? AND status="unresolved" ORDER BY ts DESC LIMIT 100',(channel,))]
            missions=[dict(r) for r in db.execute('SELECT * FROM scan_missions WHERE channel=? ORDER BY COALESCE(end,start) DESC LIMIT 15',(channel,))]
            totals=dict(db.execute('SELECT status,count(*) FROM scan_events WHERE channel=? GROUP BY status',(channel,)))
            owned=db.execute('SELECT count(*) FROM scan_owned WHERE channel=?',(channel,)).fetchone()[0]
        for e in events+unresolved:e['mission']=json.loads(e['mission'])
        for m in missions:
            template=self.match_mission(m.get('definition'),m.get('debug'))
            template=self.instance(m['guid'],template) if template else None
            m['mission']=template;m['matched']=bool(template)
            if template:m.update(title=template.get('title'),description=template.get('description'),translation=template.get('translation'))
            if m['start'] and m['end']:
                try:m['durationSeconds']=(datetime.fromisoformat(m['end'].replace('Z','+00:00'))-datetime.fromisoformat(m['start'].replace('Z','+00:00'))).total_seconds()
                except ValueError:pass
        return {'channel':channel,'mode':effective_mode(self.settings()),'lastScan':meta.get('lastScan'),'lastFile':meta.get('lastFile'),'owned':owned,'counts':totals,'events':events,'unresolved':unresolved,'missions':missions}

    def capture_context(self,db,channel,lines):
        for line in lines:
            guid=re.search(r'(?:MissionId|missionId)\s*:?\s*\[([^\]]+)\]',line,re.I)
            if not guid:continue
            row=db.execute('SELECT data FROM mission_context WHERE channel=? AND guid=?',(channel,guid[1])).fetchone()
            data=json.loads(row[0]) if row else {}
            title=re.search(r'Added notification "(?:Auftrag angenommen|Contract Accepted|Auftrag abgeschlossen|Contract Complete):\s*(.*?)"',line,re.I)
            if title:
                clean=re.sub(r'<[^>]+>','',title[1]);clean=re.sub(r'\s*\[BP\]\s*:?\s*$','',clean).strip().rstrip(':').strip();data['title']=clean
                target=re.fullmatch(r'Bounty Assignment:\s*(.+?)\s*\([^()]+\)',clean,re.I)
                if target and '[' not in target[1]:data['target']=target[1]
            for label,key in [('LocationName','location'),('TargetName','target')]:
                match=re.search(r'\b'+label+r'\[([^\]]+)\]',line)
                if match and not any(c in match[1] for c in ['~','[','@']):data[key]=match[1]
            if data:db.execute('INSERT OR REPLACE INTO mission_context VALUES(?,?,?)',(channel,guid[1],json.dumps(data,ensure_ascii=False)))

    def instance(self,guid,template=None):
        channel=self.settings()['paths']['channel']
        with self.db() as db:
            state=db.execute('SELECT status,start,end FROM scan_missions WHERE channel=? AND guid=?',(channel,guid)).fetchone()
            if template is None:
                row=db.execute('SELECT definition,debug FROM scan_missions WHERE channel=? AND guid=?',(channel,guid)).fetchone()
                if not row:return None
                template=self.match_mission(row[0],row[1])
            row=db.execute('SELECT data FROM mission_context WHERE channel=? AND guid=?',(channel,guid)).fetchone()
        if not template:return None
        result=copy.deepcopy(template);data=json.loads(row[0]) if row else {};result['logInstance']={'guid':guid,'target':data.get('target'),'location':data.get('location'),'status':state[0] if state else None,'startedAt':state[1] if state else None,'endedAt':state[2] if state else None}
        tokens=result.setdefault('missionContext',{}).setdefault('tokens',{})
        for token,key in [('TARGET','target'),('LOCATION','location')]:tokens[token]=data.get(key) or ('Ziel unbekannt' if key=='target' else 'Einsatzort unbekannt')
        for field in ['title','description']:
            raw=result.get(field+'Template') or result.get(field) or ''
            result[field+'Template']=raw
            result[field]=re.sub(r'\[([A-Za-z][A-Za-z0-9_|]*)\]',lambda m:tokens.get(m[1].upper(),m[0]),raw)
        if data.get('title'):result['title']=data['title'];result['titleTemplate']=data['title']
        return result

    def match_mission(self,definition,debug):
        by_definition,by_debug=self.mission_index()
        unique=by_definition.get(definition,{}) if definition else {}
        if not unique and debug:unique=by_debug.get(debug,{})
        return next(iter(unique.values())) if len(unique)==1 else None

    def mission_index(self):
        """Lookup tables with the same matching rules as the former linear search."""
        templates=self.catalog.mission_templates()
        with self.lock:
            if getattr(self,'_mission_templates',None) is templates:return self._mission_index
        by_definition={};by_debug={}
        for m in templates:
            key=m.get('id') or m.get('debugName')
            # Later duplicates replace earlier ones, as in the former dict comprehension.
            for value in dict.fromkeys([m.get('id')]+list(m.get('contractDefinitionIds') or [])):
                if value is not None:by_definition.setdefault(value,{})[key]=m
            for value in dict.fromkeys([m.get('debugName')]+list(m.get('debugNames') or [])):
                if value is not None:by_debug.setdefault(value,{})[key]=m
        with self.lock:self._mission_templates=templates;self._mission_index=(by_definition,by_debug)
        return by_definition,by_debug

    def live_missions(self,after=0):
        channel=self.settings()['paths']['channel']
        if after<0:raise ValueError('Ungültiger Ereignisstand.')
        with self.db() as db:
            db.row_factory=sqlite3.Row
            latest=db.execute('SELECT COALESCE(MAX(seq),0) FROM mission_feed WHERE channel=?',(channel,)).fetchone()[0]
            rows=[dict(r) for r in db.execute('SELECT f.*,m.debug,m.definition FROM mission_feed f LEFT JOIN scan_missions m ON f.channel=m.channel AND f.guid=m.guid WHERE f.channel=? AND f.seq>? ORDER BY f.seq LIMIT 50',(channel,after))]
        for row in rows:
            template=self.match_mission(row.get('definition'),row.get('debug'))
            row['mission']=self.instance(row['guid'],template)
            row['matched']=bool(row['mission'])
        return {'channel':channel,'latest':latest,'cursor':rows[-1]['seq'] if rows else max(after,latest),'events':rows}

    def journal(self,start,end):
        """6.0.3: Ausgaben und Reiseverlauf zwischen zwei Zeitpunkten (ISO, UTC)."""
        for value in (start,end):
            if not isinstance(value,str) or not re.fullmatch(r'\d{4}-\d\d-\d\dT[0-9:.]+Z?',value):raise ValueError('Ungültiger Zeitraum.')
        channel=self.settings()['paths']['channel']
        with self.db() as db:return {'channel':channel,'from':start,'to':end,'entries':journal.query(db,channel,start,end)}

    MINI_FIELDS=('id','debugName','title','contractor','illegal','category','missionType','logInstance')
    def blueprint_count(self,mission):
        """6.0.5: Bauplan-Stand eines Auftrags (erhalten/gesamt, ohne doppelte Items) für die Miniatur-Akte."""
        items=self.catalog.refresh() or []
        sig=getattr(self.catalog,'signature',None)
        if getattr(self,'_bp_index_sig',object())!=sig:
            uuid,bp,names={},{},{}
            for i in items:
                if i.get('uuid'):uuid[i['uuid']]=i
                if i.get('blueprint'):bp[i['blueprint']]=i
                n=normalized(i.get('name') or '');names[n]=None if n in names else i
            self._bp_index=(uuid,bp,names);self._bp_index_sig=sig
        uuid,bp,names=self._bp_index
        seen={}
        for pool in mission.get('rewardPools') or []:
            for entry in pool.get('items') or []:
                item=uuid.get(entry.get('entityClass')) or bp.get(entry.get('blueprintRecord')) or names.get(normalized(entry.get('name') or ''))
                key=item['id'] if item else normalized(entry.get('name') or '')
                if key not in seen:seen[key]=(entry.get('name'),bool(item and item.get('isDone')))
        return {'ok':sum(1 for _,done in seen.values() if done),'total':len(seen),'open':[n for n,done in seen.values() if not done][:6]}
    def mini_mission(self,mission):
        if not mission:return mission
        out={k:mission[k] for k in self.MINI_FIELDS if k in mission}
        en=mission.get('en') if isinstance(mission.get('en'),dict) else {}
        if en:out['en']={k:en[k] for k in ('title','contractor','missionType') if en.get(k)}
        out['bp']=self.blueprint_count(mission)
        return out

    def active_missions(self,limit=LIVE_LIMIT,offset=0,view='full'):
        """Offene Live-Aufträge seitenweise (6.0.4). newest = jüngste Annahme über alle Seiten, für „Alle schließen“."""
        if limit not in LIVE_PAGE_SIZES:raise ValueError('Ungültige Seitengröße.')
        if type(offset) is not int or offset<0:raise ValueError('Ungültige Seite.')
        if view not in ('full','mini'):raise ValueError('Ungültige Ansicht.')
        channel=self.settings()['paths']['channel']
        with self.db() as db:
            db.row_factory=sqlite3.Row
            rows=[dict(r) for r in db.execute("SELECT m.* FROM scan_missions m WHERE "+OPEN_MISSIONS+" ORDER BY start DESC,guid LIMIT ? OFFSET ?",(channel,limit,offset))]
            total,newest=db.execute("SELECT count(*),MAX(m.start) FROM scan_missions m WHERE "+OPEN_MISSIONS,(channel,)).fetchone()
        for row in rows:
            row['mission']=self.instance(row['guid'],self.match_mission(row.get('definition'),row.get('debug')))
            row['matched']=bool(row['mission'])
            if view=='mini':row['mission']=self.mini_mission(row['mission'])
        return {'channel':channel,'missions':rows,'total':total,'limit':limit,'view':view,'offset':offset,'newest':newest,'pageSizes':list(LIVE_PAGE_SIZES)}

    def close_mission(self,body):
        """Close one entry (guid), a selection (guids) or all open entries (all).
        "all" only closes entries accepted up to the newest entry the user saw (upTo),
        so a mission accepted in the meantime stays visible."""
        channel=self.settings()['paths']['channel']
        if body.get('channel')!=channel:raise ValueError('Spielkanal wurde gewechselt. Bitte neu laden.')
        if body.get('all') is True:
            up_to=body.get('upTo')
            if not isinstance(up_to,str) or not up_to or len(up_to)>64:raise ValueError('Stand der Liste fehlt. Bitte neu laden.')
            with self.lock,self.db() as db:
                guids=[r[0] for r in db.execute("SELECT m.guid FROM scan_missions m WHERE "+OPEN_MISSIONS+" AND m.start<=?",(channel,up_to))]
                db.executemany('INSERT OR IGNORE INTO mission_closed VALUES(?,?)',[(channel,g) for g in guids])
            return {'ok':True,'closed':len(guids)}
        guids=body.get('guids') if 'guids' in body else [body.get('guid')]
        if not isinstance(guids,list) or not guids or len(guids)>500 or any(not isinstance(g,str) or not g or len(g)>200 for g in guids):raise ValueError('Auftragskennung fehlt.')
        guids=list(dict.fromkeys(guids))
        with self.lock,self.db() as db:
            known={r[0] for r in db.execute('SELECT guid FROM scan_missions WHERE channel=? AND guid IN (%s)'%','.join('?'*len(guids)),(channel,*guids))}
            if not known:raise ValueError('Auftrag nicht gefunden.')
            db.executemany('INSERT OR IGNORE INTO mission_closed VALUES(?,?)',[(channel,g) for g in guids if g in known])
        return {'ok':True,'closed':len(known),'unknown':len(guids)-len(known)}
