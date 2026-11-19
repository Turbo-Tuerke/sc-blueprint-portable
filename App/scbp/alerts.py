"""Persistent ownership baseline and atomic, synchronized OBS playback queue."""
import json
from contextlib import contextmanager
import sqlite3
import threading
import time
from pathlib import Path
from .common import now

class Alerts:
    def __init__(self,path,catalog,settings,clock=time.time):
        self.path=Path(path);self.path.parent.mkdir(parents=True,exist_ok=True); self.catalog=catalog;self.settings=settings;self.clock=clock;self.lock=threading.RLock();self.observed_signature=None
        with self.db() as db:
            db.executescript('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT);CREATE TABLE IF NOT EXISTS seen (ini TEXT PRIMARY KEY);CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT,created REAL,started REAL,expires REAL,kind TEXT,items TEXT,title TEXT,status TEXT DEFAULT "queued");')
    @contextmanager
    def db(self):
        connection=sqlite3.connect(self.path,timeout=10)
        try:
            with connection:yield connection
        finally:connection.close()
    def enqueue(self,items,kind='acquired',title=''):
        if not items:return None
        last=None
        with self.lock,self.db() as db:
            for offset in range(0,len(items),9):
                data=[self.catalog.public(i) if 'scmdb' in i else i for i in items[offset:offset+9]]
                last=db.execute('INSERT INTO events(created,kind,items,title) VALUES(?,?,?,?)',(self.clock(),kind,json.dumps(data,ensure_ascii=False),title)).lastrowid
        return last
    def observe(self):
        items=self.catalog.refresh()
        if self.catalog.error or not items:return
        if self.observed_signature==self.catalog.signature:return
        with self.lock,self.db() as db:
            owned=[i for i in items if i['isDone']]
            baseline=db.execute('SELECT value FROM meta WHERE key="baseline"').fetchone()
            known={r[0] for r in db.execute('SELECT ini FROM seen')}
            new=[i for i in owned if i['ini'] not in known]
            for i in new:db.execute('INSERT OR IGNORE INTO seen VALUES(?)',(i['ini'],))
            db.execute('INSERT OR REPLACE INTO meta VALUES("baseline",?)',(now(),))
            # Same transaction: a restart cannot replay or lose an acquisition after marking it seen.
            if baseline and self.settings()['alerts']['enabled']:
                new=[i for i in new if i.get('ownershipSource')!='manual']
                for offset in range(0,len(new),9):
                    data=[self.catalog.public(i) for i in new[offset:offset+9]]
                    db.execute('INSERT INTO events(created,kind,items,title) VALUES(?,?,?,?)',(self.clock(),'acquired',json.dumps(data,ensure_ascii=False),''))
            db.execute('DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT 500)')
        self.observed_signature=self.catalog.signature
    def current(self,consume=False):
        cfg=self.settings();ts=self.clock();settings=cfg['alerts']
        with self.lock,self.db() as db:
            db.row_factory=sqlite3.Row
            db.execute('UPDATE events SET status="expired" WHERE status="queued" AND created<?',(ts-settings['queueMaxAgeSeconds'],))
            db.execute('UPDATE events SET status="shown" WHERE status="playing" AND expires<=?',(ts,))
            if not settings['enabled']:
                db.execute('UPDATE events SET status="skipped" WHERE status IN ("queued","playing")')
            row=db.execute('SELECT * FROM events WHERE status="playing" ORDER BY id LIMIT 1').fetchone()
            if not row and consume and settings['enabled']:
                row=db.execute('SELECT * FROM events WHERE status="queued" ORDER BY id LIMIT 1').fetchone()
                if row:
                    db.execute('UPDATE events SET started=?,expires=?,status="playing" WHERE id=?',(ts,ts+(20 if row['kind']=='mission-accepted' else settings.get('detailDurationSeconds',settings['durationSeconds']) if row['kind'] in ('mission-details','mission-brief') else settings.get('rewardDurationSeconds',settings['durationSeconds'])),row['id']))
                    row=db.execute('SELECT * FROM events WHERE id=?',(row['id'],)).fetchone()
            event=dict(row) if row else None
            if event:event['items']=json.loads(event['items'])
            pending=db.execute('SELECT count(*) FROM events WHERE status="queued"').fetchone()[0]
        return {'event':event,'pending':pending,'serverTime':ts,'enabled':settings['enabled'],'duration':settings['durationSeconds']}
    def archive(self,limit=30):
        """Nur lesend (ohne Status-Fortschreibung): letzte OBS-Meldungen für den Stream Control Hub."""
        from datetime import datetime,timezone
        labels={'acquired':'Neue Baupläne','mission-accepted':'Auftrag angenommen','mission-details':'Auftragsdetails','mission-brief':'Auftragsbriefing'}
        with self.lock,self.db() as db:
            rows=db.execute('SELECT id,created,kind,title,status,items FROM events ORDER BY id DESC LIMIT ?',(int(limit),)).fetchall()
        out=[]
        for event_id,created,kind,title,status,items in rows:
            try:count=len(json.loads(items or '[]'))
            except ValueError:count=0
            stamp=datetime.fromtimestamp(float(created or 0),timezone.utc).isoformat() if created else ''
            out.append({'id':event_id,'title':title or f"{labels.get(kind,kind or 'Meldung')} ({count})",'kind':kind,'status':status,
                        'items':count,'updated_at':stamp,'permalink':'/obs.html?status=open&interval=20'})
        return out
    def history(self):
        with self.lock,self.db() as db:
            db.row_factory=sqlite3.Row
            rows=[dict(r) for r in db.execute('SELECT * FROM events ORDER BY id DESC LIMIT 30')]
        for r in rows:r['items']=json.loads(r['items'])
        return {'events':rows,**self.current(), 'baselineReady':bool(self.catalog.items) and not self.catalog.error}
    def clear(self):
        with self.lock,self.db() as db:db.execute('UPDATE events SET status="skipped" WHERE status IN ("queued","playing")')
