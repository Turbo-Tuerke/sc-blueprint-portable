"""Read-only adapters. All item requests are keyed by the game's UUID."""
import hashlib
import html
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from datetime import datetime,timezone
from pathlib import Path
from .common import UUID, atomic_json, now, read_json

# 5.4.0: UEX, CitizenHQ und FleetYards entfernt (Quellen-Unabhaengigkeit, Phase 1).
HOSTS={'api.star-citizen.wiki','starcitizen.tools','media.starcitizen.tools','finder.cstone.space','cstone.space'}
class AllowedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        check_url(newurl)
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def check_url(url):
    parsed=urllib.parse.urlsplit(url)
    if parsed.scheme!='https' or parsed.hostname not in HOSTS or parsed.username or parsed.password or parsed.port not in (None,443):raise ValueError('Externe Adresse nicht freigegeben.')
    return parsed.hostname

class Fetcher:
    def __init__(self,state,settings):
        self.root=Path(state)/'providers';self.settings=settings;self.locks={};self.guard=threading.Lock();self.last={};self.health={};self.opener=urllib.request.build_opener(AllowedRedirect());self.local=threading.local()
    def request(self,url,limit=16*1024*1024):
        host=check_url(url)
        with self.guard:lock=self.locks.setdefault(host,threading.Lock())
        with lock:
            pause=1.15-(time.monotonic()-self.last.get(host,0))
            if pause>0:time.sleep(pause)
            self.last[host]=time.monotonic()
            req=urllib.request.Request(url,headers={'User-Agent':'SCBlueprintArchive/3.0 (private local catalogue; cached read-only requests)','Accept':'application/json, image/webp, image/png, image/jpeg, text/html;q=0.8'})
            with self.opener.open(req,timeout=self.settings()['sources']['timeoutSeconds']) as r:
                check_url(r.url);raw=r.read(limit+1)
                if len(raw)>limit:raise ValueError('Antwort überschreitet das Größenlimit.')
                return raw,r.headers.get_content_type(),r.url
    def get(self,provider,url,as_json=True,force=False):
        force=force or getattr(self.local,'force',False)
        key=hashlib.sha256(url.encode()).hexdigest();path=self.root/provider/(key+'.json');cached=read_json(path)
        ttl=self.settings()['sources']['cacheHours']*3600
        if cached and not force and time.time()-cached['at']<ttl:
            self.health[provider]={'ok':True,'at':datetime.fromtimestamp(cached['at'],timezone.utc).isoformat(),'detail':'Lokaler Quellenstand verfügbar','cached':True}
            return cached['value']
        try:
            raw,_,_=self.request(url);value=json.loads(raw) if as_json else raw.decode('utf-8','replace')
            atomic_json(path,{'at':time.time(),'value':value,'url':url});self.health[provider]={'ok':True,'at':now(),'detail':'Erreichbar'};return value
        except Exception as e:
            self.health[provider]={'ok':False,'at':now(),'detail':str(e)[:160],'stale':bool(cached)}
            if cached:return cached['value']
            raise
    def mw(self,**params):
        value=self.get('mediawiki','https://starcitizen.tools/api.php?'+urllib.parse.urlencode({'format':'json',**params}))
        if value.get('error'):raise ValueError('MediaWiki: '+str(value['error'].get('info','API-Fehler'))[:160])
        return value
    def wiki(self,item):
        data=self.get('wiki','https://api.star-citizen.wiki/api/items/'+item['uuid']).get('data') or {}
        if data.get('uuid','').lower()!=item['uuid']:raise ValueError('Wiki-API: UUID stimmt nicht überein.')
        return data
    def mediawiki(self,item):
        # A UUID appearing somewhere on an armor-set page is NOT enough.
        # It must be the primary infobox UUID; accept only image fields on that page.
        search=self.mw(action='query',list='search',srsearch='insource:"'+item['uuid']+'"',srnamespace=0,srlimit=8)
        ids=[str(x['pageid']) for x in search.get('query',{}).get('search',[])]
        if not ids:return {'images':[],'verified':False}
        pages=self.mw(action='query',prop='revisions',pageids='|'.join(ids),rvprop='content',rvslots='main').get('query',{}).get('pages',{})
        for page in pages.values():
            rev=(page.get('revisions') or [{}])[0].get('slots',{}).get('main',{}).get('*','')
            primary=re.search(r'^\s*\|\s*uuid\s*=\s*([0-9a-f-]{36})\s*$',rev,re.M|re.I)
            if not primary or primary[1].lower()!=item['uuid']:continue
            start=rev.rfind('{{',0,primary.start());end=rev.find('\n}}',primary.end())
            block=rev[start:end if end>=0 else len(rev)]
            if not re.match(r'{{(?:Entity|Infobox)',block,re.I):continue
            title=page['title'];names=re.findall(r'^\s*\|\s*image\d*\s*=\s*([^\n|{}]+)',block,re.M|re.I)
            names=[n.strip().removeprefix('File:') for n in names if re.search(r'\.(png|jpe?g|webp)$',n.strip(),re.I)][:3]
            out={'images':[],'verified':True,'page':title,'url':'https://starcitizen.tools/'+urllib.parse.quote(title.replace(' ','_'))}
            if not names:return out
            files=self.mw(action='query',prop='imageinfo',titles='|'.join('File:'+n for n in names),iiprop='url|extmetadata',iiurlwidth=1200).get('query',{}).get('pages',{})
            for f in files.values():
                info=(f.get('imageinfo') or [{}])[0]
                if info.get('url'):
                    meta=info.get('extmetadata',{})
                    plain=lambda key:html.unescape(re.sub('<[^>]+>','',str(meta.get(key,{}).get('value',''))))[:500]
                    out['images'].append({'url':info.get('thumburl') or info['url'],'original':info['url'],'source':'StarCitizen.tools','sourceUrl':info.get('descriptionurl') or out['url'],'credit':plain('Artist'),'license':plain('LicenseShortName'),'verifiedUuid':item['uuid'],'proof':out['url']})
            return out
        return {'images':[],'verified':False}
    def cornerstone(self,item):
        url='https://finder.cstone.space/Search/'+item['uuid'];text=self.get('cornerstone',url,False)
        if not re.search(r'_ReportDataUpdate\?id='+re.escape(item['uuid']),html.unescape(text),re.I):raise ValueError('Cornerstone: Item-Identität auf der Seite nicht bestätigt.')
        parser=CornerstoneParser();parser.feed(text)
        images=[]
        if parser.image and re.fullmatch(r'https://cstone\.space/uifimages/'+re.escape(item['uuid'])+r'\.(?:png|jpe?g|webp)',parser.image,re.I):
            images=[{'url':parser.image,'original':parser.image,'source':'Cornerstone','sourceUrl':url,'verifiedUuid':item['uuid'],'proof':url}]
        shops=[{'location':r[0],'priceText':r[1]+' aUEC','updatedAt':r[2] if len(r)>2 else ''} for r in parser.rows if len(r)>=2]
        return {'found':True,'shops':shops,'images':images,'url':url,'mode':'Öffentliche Itemseite · kein zugesicherter API-Vertrag'}

class CornerstoneParser(HTMLParser):
    def __init__(self):super().__init__();self.table=False;self.cell=False;self.row=[];self.rows=[];self.buffer=[];self.image_mode=False;self.image=''
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='table' and a.get('id')=='table':self.table=True
        if self.table and tag=='tr':self.row=[]
        if self.table and tag=='td':self.cell=True;self.buffer=[]
        if tag=='div' and a.get('id')=='tempforimg':self.image_mode=True
    def handle_data(self,text):
        if self.cell:self.buffer.append(text)
        if self.image_mode:self.image+=text.strip()
    def handle_endtag(self,tag):
        if tag=='td' and self.cell:self.row.append(' '.join(''.join(self.buffer).split()));self.cell=False
        if tag=='tr' and self.table and self.row:self.rows.append(self.row)
        if tag=='table':self.table=False
        if tag=='div':self.image_mode=False
