"""Permanent binary cache and item-specific user image folders. No expiry deletion."""
import concurrent.futures
import hashlib
import itertools
import queue
import re
import struct
import threading
import time
import urllib.parse
from pathlib import Path
from .common import atomic_bytes,atomic_json,now,read_json,slug
from .catalog import TAXONOMY,LABELS
from .providers import Fetcher
REMOVED_PROVIDERS={'uex','citizenhq','fleetyards'}

MAX_IMAGE=12*1024*1024
EXTENSIONS={'.png','.jpg','.jpeg','.webp'}
def image_type(raw):
    if not 32<=len(raw)<=MAX_IMAGE:raise ValueError('Bild muss zwischen 32 Byte und 12 MB groß sein.')
    if raw.startswith(b'\x89PNG\r\n\x1a\n'):
        w,h=struct.unpack('>II',raw[16:24])
        if b'IEND' not in raw[-20:]:raise ValueError('PNG-Datei unvollständig.')
        ext='.png'
    elif raw.startswith(b'\xff\xd8\xff') and raw.endswith(b'\xff\xd9'):w=h=1;ext='.jpg'
    elif raw[:4]==b'RIFF' and raw[8:12]==b'WEBP':
        if struct.unpack('<I',raw[4:8])[0]+8!=len(raw):raise ValueError('WebP-Datei unvollständig.')
        w=h=1;ext='.webp'
    else:raise ValueError('Bitte ein gültiges PNG-, JPEG- oder WebP-Bild verwenden.')
    if not 0<w<=20000 or not 0<h<=20000:raise ValueError('Ungültige Bildabmessungen.')
    return ext

class Media:
    def __init__(self,root,state,catalog,settings):
        self.root=Path(root).resolve();self.root.mkdir(parents=True,exist_ok=True);self.state=Path(state);self.catalog=catalog;self.settings=settings
        self.lock=threading.RLock();self.fetcher=Fetcher(state,settings);self.queue=queue.PriorityQueue();self.serial=itertools.count();self.pending={};self.active={};self.revision=0;self.validated={};self.own_signature=None;self.folders=read_json(self.root/'ordner-index.json',{});self.stop=threading.Event()
    def initialize(self):
        for cat in TAXONOMY:
            for key,label in cat['children']:(self.root/'eigene'/slug(cat['label'])/slug(label)).mkdir(parents=True,exist_ok=True)
        for item in self.catalog.refresh():self.folder(item)
        atomic_json(self.root/'ordner-index.json',self.folders)
    def folder(self,item):
        with self.lock:
            rel=self.folders.get(item['id'])
            if not rel:
                rel='/'.join(['eigene',slug(item['category']),slug(item['subcategory']),item['id']+'--'+slug(item['name'])]);self.folders[item['id']]=rel
            path=self.confined(rel)
            if path is None:raise ValueError('Bildordner außerhalb des Medienspeichers.')
            path.mkdir(parents=True,exist_ok=True)
            meta=path/'item.json'
            if not meta.exists():atomic_json(meta,self.catalog.public(item))
            return path
    def confined(self,rel):
        path=(self.root/rel).resolve()
        return path if path.is_relative_to(self.root) and path!=self.root else None
    def own(self,item):
        folder=self.folder(item);out=[]
        for slot in range(1,4):
            for file in sorted(folder.glob(f'{slot:02d}.*')):
                if file.suffix.lower() not in EXTENSIONS or file.is_symlink() or not file.is_file():continue
                try:
                    if file.stat().st_size>MAX_IMAGE:continue
                    key=(str(file),file.stat().st_mtime_ns,file.stat().st_size)
                    if key not in self.validated:self.validated[key]=image_type(file.read_bytes())
                except (ValueError,OSError):continue
                rel=file.relative_to(self.root).as_posix()
                out.append({'thumbnail_url':'/media/'+urllib.parse.quote(rel)+'?v='+str(file.stat().st_mtime_ns),'original_url':'/media/'+urllib.parse.quote(rel),'source':'Eigenes Bild','slot':slot,'own':True,'verifiedUuid':item['id'],'path':rel});break
        return out
    def cached(self,item):
        cached=read_json(self.state/'dossiers'/(item['id']+'.json'))
        if cached:return cached
        # Bootstrap a persistent media volume even if the optional metadata cache was restored separately.
        images=[]
        for meta in sorted((self.root/'cache'/item['id']).glob('*.json')):
            value=read_json(meta,{})
            if value.get('verifiedUuid')==item['id'] and value.get('path') and self.confined(value['path']) and (self.root/value['path']).is_file():images.append(value)
        return {'data':{'description':{},'images':images[:3]},'at':0,'enriched':False}

    def response(self,item,enrich=False,refresh=False):
        cached=self.cached(item)
        stale=time.time()-cached.get('at',0)>self.settings()['sources']['cacheHours']*3600
        if not self.settings()['providers']['offline'] and (refresh or stale or (enrich and not cached.get('enriched'))):self.schedule(item['id'],enrich,0 if enrich else 1,refresh)
        value=cached.get('data') or {};value={**value}
        owned=self.own(item)
        auto=[x for x in value.get('images',[]) if self.confined(x.get('path','')) and (self.root/x['path']).is_file()]
        value['images']=(owned+auto)[:self.settings()['sources']['maxImages']]
        value['imageFolder']=self.folder(item).relative_to(self.root).as_posix()
        value['ownImages']=owned;value['automaticImages']=auto;value['id']=item['id']
        return {'data':value,'pending':item['id'] in self.pending or item['id'] in self.active,'updatedAt':cached.get('updatedAt'),'revision':self.revision,'offline':self.settings()['providers']['offline']}
    def upload(self,item,slot,raw):
        if slot not in [1,2,3]:raise ValueError('Bildplatz muss 1, 2 oder 3 sein.')
        ext=image_type(raw);folder=self.folder(item)
        with self.lock:
            dest=folder/(f'{slot:02d}'+ext);atomic_bytes(dest,raw)
            for old in folder.glob(f'{slot:02d}.*'):
                if old!=dest and old.suffix.lower() in EXTENSIONS and not old.is_symlink():old.unlink()
            self.revision+=1;atomic_json(self.root/'ordner-index.json',self.folders)
        return self.response(item)
    def delete(self,item,slot):
        if slot not in [1,2,3]:raise ValueError('Ungültiger Bildplatz.')
        with self.lock:
            for file in self.folder(item).glob(f'{slot:02d}.*'):
                if file.suffix.lower() in EXTENSIONS and not file.is_symlink():file.unlink()
            self.revision+=1
        return self.response(item)
    def download(self,item,candidate,namespace='cache'):
        if candidate.get('verifiedUuid')!=item['id']:raise ValueError('Bild ohne passende Item-Identität abgewiesen.')
        raw,_,_=self.fetcher.request(candidate['url'],MAX_IMAGE);ext=image_type(raw)
        digest=hashlib.sha256(raw).hexdigest();rel=namespace+'/'+item['id']+'/'+digest[:24]+ext
        dest=self.confined(rel)
        if not dest.exists():atomic_bytes(dest,raw)
        info={k:v for k,v in candidate.items() if k not in ['url','original']}
        info.update({'path':rel,'thumbnail_url':'/media/'+rel,'original_url':'/media/'+rel,'remoteUrl':candidate['url'],'savedAt':now(),'sha256':digest})
        atomic_json(dest.with_suffix(ext+'.json'),info)
        return info
    def schedule(self,ident,enrich=False,priority=1,force=False):
        with self.lock:
            old=self.pending.get(ident)
            if ident in self.active:
                if (enrich and not self.active[ident]) or force:self.pending[ident]=(next(self.serial),enrich,priority,force)
                return
            if old and (old[1] or not enrich) and not force:return
            number=next(self.serial);self.pending[ident]=(number,enrich,priority,force);self.queue.put((priority,number,ident))
    def start(self):
        for _ in range(2):threading.Thread(target=self.worker,daemon=True).start()
    def worker(self):
        while not self.stop.is_set():
            try:priority,number,ident=self.queue.get(timeout=1)
            except queue.Empty:continue
            with self.lock:
                pending=self.pending.get(ident)
                if not pending or pending[0]!=number:self.queue.task_done();continue
                del self.pending[ident];self.active[ident]=pending[1]
            try:self.resolve(self.catalog.get(ident),pending[1],pending[3])
            except Exception as exc:
                self.fetcher.health['worker']={'ok':False,'at':now(),'detail':str(exc)[:160]}
            finally:
                with self.lock:
                    self.active.pop(ident,None)
                    follow=self.pending.get(ident)
                    if follow:self.queue.put((follow[2],follow[0],ident))
                self.queue.task_done()
    def resolve(self,item,enrich,force=False):
        if self.settings()['providers']['offline'] or not item.get('uuid'):return
        flags=self.settings()['providers'];cached=self.cached(item);data=cached.get('data') or {};data={**data};notes=[];sources={k:v for k,v in data.get('sources',{}).items() if k not in REMOVED_PROVIDERS};images=list(data.get('images',[]));candidates=[]
        def run(name,fn):
            self.fetcher.local.force=force
            try:
                val=fn();health=self.fetcher.health.get(name,{})
                sources[name]={'ok':health.get('ok',True),'checkedAt':health.get('at') or now(),'stale':health.get('stale',False),'cached':health.get('cached',False),'data':val};return val
            except Exception as e:
                previous=sources.get(name,{});sources[name]={**previous,'ok':False,'error':str(e)[:160],'checkedAt':now()};return previous.get('data')
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            w=pool.submit(run,'wiki',lambda:self.fetcher.wiki(item)) if flags['wiki'] else None
            m=pool.submit(run,'mediawiki',lambda:self.fetcher.mediawiki(item)) if flags['mediawiki'] else None
            wiki=w.result() if w else None
            mw=m.result() if m else None
        if wiki:
            data['description']=wiki.get('description') or {};data['web_url']=wiki.get('web_url');data['version']=wiki.get('version')
        if mw:
            data['wikiPage']=mw.get('url');candidates+=mw.get('images',[])
            if wiki and wiki.get('images') and not candidates:notes.append('Wiki-API-Bild nicht übernommen: Auf der UUID-geprüften Itemseite ist kein passendes Bild hinterlegt.')
            # The API may confuse identically named entities. Never accept its image solely on UUID.
            # Direct MediaWiki candidates already identify the primary image of the exact item page.
        if flags['cornerstone'] and (enrich or not candidates):
            cs=run('cornerstone',lambda:self.fetcher.cornerstone(item))
            if cs:candidates+=cs.get('images',[])
        for candidate in candidates[:3]:
            if any(x.get('remoteUrl')==candidate['url'] and (self.root/x.get('path','missing')).is_file() for x in images):continue
            try:
                value=self.download(item,candidate)
                if not any(x.get('sha256')==value['sha256'] for x in images):images.append(value)
            except (OSError,ValueError) as e:notes.append(candidate['source']+': Bild derzeit nicht abrufbar.')
        data.update({'images':images[:3],'sources':sources,'notes':notes,'identity':{'uuid':item['id'],'category':item['category'],'subcategory':item['subcategory'],'manufacturer':item['manufacturer']}})
        atomic_json(self.state/'dossiers'/(item['id']+'.json'),{'data':data,'at':time.time(),'updatedAt':now(),'enriched':cached.get('enriched',False)})
        with self.lock:self.revision+=1
        data.update({'images':images[:3],'sources':sources,'notes':notes,'identity':{'uuid':item['id'],'category':item['category'],'subcategory':item['subcategory'],'manufacturer':item['manufacturer']}})
        # Keep useful old content on failure. Binary files are never evicted automatically.
        atomic_json(self.state/'dossiers'/(item['id']+'.json'),{'data':data,'at':time.time(),'updatedAt':now(),'enriched':enrich or cached.get('enriched',False)})
        with self.lock:self.revision+=1
    def scan_own(self):
        files=[(str(p.relative_to(self.root)),p.stat().st_mtime_ns,p.stat().st_size) for p in (self.root/'eigene').rglob('*') if p.suffix.lower() in EXTENSIONS and p.is_file() and not p.is_symlink()]
        signature=tuple(sorted(files))
        if signature!=self.own_signature:
            self.own_signature=signature
            with self.lock:self.revision+=1
    def totals(self):
        # Every upload, deletion, download and own-folder change raises the revision,
        # so the full folder walk is only repeated after a change (or after 5 minutes).
        with self.lock:
            cached=getattr(self,'_totals',None)
            if cached and cached[0]==self.revision and time.time()-cached[1]<300:return cached[2]
            revision=self.revision
        files=[p for p in self.root.rglob('*') if p.suffix.lower() in EXTENSIONS and p.is_file() and not p.is_symlink()]
        value=(len(files),sum(p.stat().st_size for p in files))
        with self.lock:self._totals=(revision,time.time(),value)
        return value
    def stats(self):
        count,size=self.totals()
        return {'files':count,'bytes':size,'pending':len(self.pending),'active':len(self.active),'revision':self.revision,'root':str(self.root),'health':self.fetcher.health,'offline':self.settings()['providers']['offline']}
    def prepare(self):
        self.initialize()
        for item in self.catalog.refresh():
            if not self.cached(item).get('at'):self.schedule(item['id'],False,2)
        return {'ok':True,'queued':len(self.pending),'message':'Bildprüfung läuft im Hintergrund. Bei vielen Items kann dies länger dauern.'}
    def ships(self):
        # 5.4.0: FleetYards wird nicht mehr abgerufen. Die zuletzt gespeicherte Schiffsliste bleibt lesbar.
        return {**read_json(self.state/'ships.json',{'ships':[],'at':0}),'offline':True,'frozen':True}
