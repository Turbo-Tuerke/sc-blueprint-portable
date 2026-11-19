"""NAS-owned, atomic SCMDB snapshots. No network work runs in the log reader."""
import hashlib
import json
import math
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from .common import atomic_json, now, read_json, UUID
from .mission_context import build_context, resolve_tokens

SOURCE_SCHEMA = 13   # 11: translatedMissionLinks im _meta, 12: materialLocations (Fundorte aus mining_data), 13: ohne Launcher
KEY_TABLE_PATH = Path(__file__).resolve().parent / 'key_table.json'
# Katalogfelder, die beim Neubau aus dem vorherigen Snapshot erhalten bleiben (Beschreibung, Werte).
CATALOG_FIELDS = ('descKey','description','divider','fix','grade','itemType','manufacturer','size')


def load_name_overrides(path=None):
    # Item-Namen aus der festen Tabelle, wo die SCMDB anders oder falsch benennt.
    value=read_json(Path(path) if path else KEY_TABLE_PATH,{}) or {}
    names=value.get('names') if isinstance(value,dict) else None
    return {k:v for k,v in (names or {}).items() if isinstance(k,str) and isinstance(v,str) and v}


def load_item_types(path=None):
    # 5.6.0: Item-Typ je Schluessel (z. B. 'Heavy Helmet'); frueher bp_item_types_v3.json des Launchers.
    value=read_json(Path(path) if path else KEY_TABLE_PATH,{}) or {}
    types=value.get('types') if isinstance(value,dict) else None
    return {k:v for k,v in (types or {}).items() if isinstance(k,str) and isinstance(v,str) and v}


def load_name_aliases(path=None):
    # 5.6.0: Alte Spielnamen -> Item-Schluessel fuer den Logscanner (frueher renames.json des Launchers).
    value=read_json(Path(path) if path else KEY_TABLE_PATH,{}) or {}
    aliases=value.get('aliases') if isinstance(value,dict) else None
    return {k:v for k,v in (aliases or {}).items() if isinstance(k,str) and isinstance(v,str) and k and v}


def load_key_table(path=None):
    # 5.4.1: Feste Schluesseltabelle SCMDB-UUID -> Item-Schluessel. Haelt die Schluessel (und damit den Besitz)
    # auch ohne alten Katalog-Snapshot stabil.
    value=read_json(Path(path) if path else KEY_TABLE_PATH,{}) or {}
    keys=value.get('keys') if isinstance(value,dict) else None
    return {str(k).lower():v for k,v in (keys or {}).items() if isinstance(v,str) and v}


def event_rewards(contract, contracts):
    scopes=contracts.get('eventScopes',{})
    result=[];seen=set()
    for row in contract.get('completionTags') or []:
        scope=scopes.get(row.get('tag'))
        amount=row.get('count')
        if not scope or type(amount) not in (int,float) or not math.isfinite(amount):continue
        split=row.get('splitPointsForParty') is True
        key=(row['tag'],amount,split)
        if key in seen:continue
        seen.add(key)
        result.append({'amount':amount,'event':scope.get('eventName') or 'Unbekanntes Event','category':scope.get('category'),'scopeGuid':row['tag'],'splitPointsForParty':split,'source':'SCMDB'})
    return result


def reputation_rewards(contract, contracts, keys):
    index=contract.get('factionRewardsIndex')
    pools=contracts.get('factionRewardsPools',[])
    if type(index) is not int or not isinstance(pools,list) or not 0<=index<len(pools):return []
    rows=pools[index]
    if not isinstance(rows,list):return []
    factions=contracts.get('factions',{});scopes=contracts.get('scopes',{})
    def label(row,field):
        key=str(row.get(field+'Key') or '').lstrip('@')
        return text(keys.get(key,{}).get('tr')) or text(row.get(field))
    result=[]
    for row in rows:
        amount=row.get('amount')
        if type(amount) not in (int,float) or not math.isfinite(amount):continue
        faction=factions.get(row.get('factionGuid'),{});scope=scopes.get(row.get('scopeGuid'),{})
        result.append({'amount':amount,'factionGuid':row.get('factionGuid'),'faction':label(faction,'name') or 'Unbekannte Fraktion','scopeGuid':row.get('scopeGuid'),'scope':label(scope,'displayName') or scope.get('scopeName') or 'Ruf','source':'SCMDB'})
    return result


def derive_key(tag, language_keys):
    # 5.4.2: Schluessel fuer neue Items ohne Launcher. Aus dem SCMDB-Bauplan-Tag (BP_CRAFT_<Klasse>) werden die
    # ueblichen Schreibweisen gebildet; gilt nur, wenn genau eine davon als Item-Name in der Sprachdatei steht.
    # Gegen den heutigen Katalog: 498 richtig, 1 falsch, 224 ohne Treffer (dann bleibt es bei uuid:).
    tag=str(tag or '')
    if not tag.startswith('BP_CRAFT_') or len(tag)<=9:return None
    cls=tag[9:];lower={str(k).lower():k for k in language_keys}
    hits={lower[c.lower()] for c in ('item_Name_'+cls,'item_Name'+cls,'item_Name_'+cls+'_SCItem','item_Name'+cls+'_SCItem') if c.lower() in lower}
    return hits.pop() if len(hits)==1 else None


def material_base(name):
    """'Lindinium (Ore)' -> 'Lindinium'; Rezepte und Mining-Datei nennen Rohstoffe unterschiedlich."""
    return re.sub(r'\s*\([^)]*\)\s*$','',str(name or '')).strip()


def material_locations(mining):
    """5.5.0: Fundorte je Rohstoff aus SCMDB mining_data. Anteil = Gewicht der Lagerstaetten
    mit diesem Rohstoff an allen Lagerstaetten der Gruppe (Prozent, je Ort und Gruppe)."""
    if not isinstance(mining,dict):return {}
    elements=mining.get('mineableElements') or {};compositions=mining.get('compositions') or {}
    by_element={guid:material_base(e.get('materialName') or e.get('name')) for guid,e in elements.items() if isinstance(e,dict)}
    result={}
    for loc in mining.get('locations') or []:
        if not isinstance(loc,dict):continue
        for group in loc.get('groups') or []:
            deposits=[d for d in group.get('deposits') or [] if isinstance(d,dict)]
            total=sum(float(d.get('relativeProbability') or 0) for d in deposits)
            shares={}
            for dep in deposits:
                comp=compositions.get(dep.get('compositionGuid')) or {}
                for mat in {by_element.get(part.get('elementGuid')) for part in comp.get('parts') or []}-{None,''}:
                    shares[mat]=shares.get(mat,0.0)+float(dep.get('relativeProbability') or 0)
            for mat,weight in shares.items():
                result.setdefault(mat,[]).append({'location':loc.get('locationName'),'system':loc.get('system'),'type':loc.get('locationType'),'group':group.get('groupName'),'share':round(min(100.0,weight/total*100),1) if total else None})
    for rows in result.values():rows.sort(key=lambda r:(-(r['share'] or 0),r['system'] or '',r['location'] or ''))
    return dict(sorted(result.items()))


def input_fingerprint(crafting, profiles, contracts, language, seed, limit, fixed=None):
    # Only the retained identity map affects the next build, not the generated
    # timestamp or mission links of the previous snapshot.
    identities=sorted((str(i.get('blueprint',{}).get('entityClass','')).lower(),i.get('ini','')) for i in seed.get('items',[]) if i.get('blueprint',{}).get('entityClass'))
    digest=hashlib.sha256()
    fixed=load_key_table() if fixed is None else fixed
    for value in (SOURCE_SCHEMA,crafting,profiles,contracts,language,identities,limit,sorted(fixed.items())):
        digest.update(json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode())
        digest.update(b'\n')
    return digest.hexdigest()


def text(value):
    value=re.sub(r'<[^>]+>', '', str(value or '').replace('\\n','\n'))
    return re.sub(r'[ \t]+',' ',value).strip()


def select_version(versions, channel):
    flavor='live' if channel in ('LIVE','HOTFIX') else channel.lower()
    matches=[v for v in versions if isinstance(v,dict) and re.fullmatch(r'[A-Za-z0-9._-]+',v.get('version','')) and re.search('-'+flavor+r'[.-]',v['version'],re.I)]
    if not matches:raise ValueError('Keine passende SCMDB-Version für '+channel+'.')
    # SCMDB orders the newest snapshots first; never silently select a different channel.
    return matches[0]['version']


def translate(contract, field, keys, fallback=''):
    original=text(contract.get(field) or fallback)
    key=str(contract.get(field+'LocKey') or contract.get(field+'Key') or '').lstrip('@')
    entry=keys.get(key,{})
    value=text(entry.get('tr')) or original
    return value,original,key,bool(entry.get('tr') and value!=text(entry.get('en') or original))


def mission_hash(value):
    number=5381
    for ch in value:number=(number*33+ord(ch))&0xffffffff
    alphabet='0123456789abcdefghijklmnopqrstuvwxyz';result=''
    while number:result=alphabet[number%36]+result;number//=36
    return result or '0'


def build_snapshot(crafting, profiles, contracts, language, seed, limit=12, fixed=None):
    fixed=load_key_table() if fixed is None else fixed
    version=crafting.get('version')
    if not version or any(x.get('version')!=version for x in (profiles,contracts)):
        raise ValueError('SCMDB-Dateien stammen aus unterschiedlichen Spielversionen.')
    # 5.1.0: Englisch ist die Grundlage. Deutsch kommt nur dazu, wenn die Übersetzung genau zum Build passt;
    # sonst wird der aktuelle Katalog trotzdem gebaut, mit englischen Texten (translationPending).
    pending=None
    # Die Schluessel-Ableitung nutzt die Sprachdatei auch bei abweichendem Build (nur Schluesselnamen, keine Texte).
    language_keys=(language or {}).get('keys') or {}
    if language and language.get('version')!=version:
        pending={'expected':version,'found':str(language.get('version'))}
        language=None
    for data,key in [(crafting,'blueprints'),(profiles,'items'),(contracts,'contracts')]:
        if not isinstance(data.get(key),list) or not data[key] or any(not isinstance(r,dict) for r in data[key]):raise ValueError('Ungültige SCMDB-Struktur: '+key)
    if not isinstance(contracts.get('blueprintPools'),dict):raise ValueError('Belohnungs-Pools fehlen.')
    if language and (not isinstance(language.get('keys'),dict) or not language['keys']):raise ValueError('Ungültige Sprachdatei.')
    keys=(language or {}).get('keys',{})
    by_uuid={r['entityClass'].lower():r for r in profiles['items'] if UUID.fullmatch(str(r.get('entityClass','')))}
    seed_uuid={str(r.get('blueprint',{}).get('entityClass','')).lower():r for r in seed.get('items',[]) if r.get('blueprint',{}).get('entityClass')}
    seed_entries={str(e.get('entityClass','')).lower():e for e in (seed.get('catalog') or {}).get('entries',[]) if isinstance(e,dict) and e.get('entityClass')}
    # Ein abgeleiteter Schluessel darf nie einen schon vergebenen treffen (sonst haengt Besitz am falschen Item).
    taken={str(v).removesuffix(',P').lower() for v in fixed.values()}|{str(r.get('ini','')).lower() for r in seed_uuid.values()}
    derived=0
    pool_map={}
    eligible=set()
    pool_links={}
    for ident,pool in contracts['blueprintPools'].items():
        entries=pool.get('blueprints',[])
        if not isinstance(entries,list):raise ValueError('Ungültiger Belohnungs-Pool.')
        pool_map[ident]=pool
        for entry in entries:
            guid=entry.get('blueprintRecord')
            if guid:eligible.add(guid);pool_links.setdefault(guid,set()).add(ident)
    missions=[];links={}
    for c in contracts['contracts']+contracts.get('legacyContracts',[]):
        pools=[]
        for reward in c.get('blueprintRewards') or []:
            ident=reward.get('blueprintPool');pool=pool_map.get(ident)
            if not pool:continue
            chance=100*float(reward.get('chance',1));entries=pool['blueprints'];weight=sum(float(e.get('weight',1)) for e in entries)
            pools.append({'id':ident,'name':reward.get('poolName') or pool.get('name') or ident,'chancePercent':round(chance,2),'drawCount':reward.get('count',reward.get('quantity',1)) or 1,'trigger':reward.get('trigger','complete'),'size':len(entries),'items':[{**e,'chancePercent':round(chance*float(e.get('weight',1))/weight,2) if weight else None} for e in entries]})
        debug=c.get('debugName') or c.get('id') or ''
        m={'id':c.get('id'),'debugName':debug,'debugNames':c.get('debugNames') or [debug],'contractDefinitionIds':c.get('contractDefinitionIds') or [c.get('id')],'hash':mission_hash(debug),'scmdbUrl':'https://scmdb.net/?m='+mission_hash(debug),'category':c.get('category'),'rewardUEC':c.get('rewardUEC'),'systems':c.get('systems') or c.get('availableSystems') or [],'illegal':bool(c.get('illegal')),'shareable':bool(c.get('canBeShared')),'onceOnly':bool(c.get('onceOnly')),'active':not c.get('requiredScenarios') or any(s.get('enabled') for s in c['requiredScenarios']),'timeToCompleteMinutes':c.get('timeToComplete'),'minStanding':(c.get('minStanding') or {}).get('name'),'maxStanding':(c.get('maxStanding') or {}).get('name'),'prerequisites':list(dict.fromkeys(r['name'] for rows in (c.get('prerequisites') or {}).values() for r in (rows if isinstance(rows,list) else []) if isinstance(r,dict) and r.get('name'))),'rewardPools':pools}
        translated=[];translation={'source':'StarCitizen-Deutsch-INI'};english={}
        for source,target in [('title','title'),('description','description'),('contractorName','contractor'),('missionType','missionType')]:
            value,original,key,changed=translate(c,source,keys,debug if source=='title' else '')
            m[target]=value;m[target+'Original']=original if changed else None;translation[target+'Key']=key
            english[target]=original
            if changed:translated.append(target)
        translation['translatedFields']=translated;m['translation']=translation
        m['reputationRewards']=reputation_rewards(c,contracts,keys)
        m['eventRewards']=event_rewards(c,contracts)
        m['missionContext']=build_context(c,contracts,keys,text)
        for field in ['title','description']:
            m[field+'Template']=m[field];m[field]=resolve_tokens(m[field],m['missionContext'])
        # Englische Fassung für die Sprachumschaltung (der Server legt sie bei ?lang=en / Cookie darüber)
        if translated:
            context_en=build_context(c,contracts,{},text)
            english['title']=resolve_tokens(english['title'],context_en);english['description']=resolve_tokens(english['description'],context_en)
            m['en']={k:v for k,v in english.items() if v!=m.get(k)}
        missions.append(m)
        for pool in pools:
            for e in pool['items']:
                guid=e.get('blueprintRecord')
                if not guid:continue
                linked={**m,'poolId':pool['id'],'poolName':pool['name'],'poolChancePercent':pool['chancePercent'],'poolItemSharePercent':100*float(e.get('weight',1))/sum(float(x.get('weight',1)) for x in pool['items']) if pool['items'] else 0,'combinedChancePercent':e['chancePercent'],'poolSize':pool['size'],'trigger':pool['trigger']}
                links.setdefault(guid,[]).append(linked)
    output=[];entries=[];seen=set();translated_links=0
    for bp in crafting['blueprints']:
        uuid=str(bp.get('productEntityClass','')).lower()
        if not UUID.fullmatch(uuid) or not UUID.fullmatch(str(bp.get('guid',''))):raise ValueError('Ungültige Bauplan-UUID.')
        # Keep existing entries and all reward-pool blueprints, omit unpublished test recipes.
        if bp['guid'] not in eligible and uuid not in seed_uuid and uuid not in fixed:continue
        if uuid in seen:continue
        seen.add(uuid);profile=by_uuid.get(uuid,{})
        old=seed_uuid.get(uuid,{})
        stat={k:v for k,v in seed_entries.get(uuid,{}).items() if k in CATALOG_FIELDS}
        # Reihenfolge: alter Snapshot, feste Tabelle, abgeleitet aus dem Bauplan-Tag, sonst UUID.
        ini=(old.get('ini') or fixed.get(uuid) or '').removesuffix(',P')
        if not ini:
            guess=derive_key(bp.get('tag'),language_keys)
            if guess and guess.lower() not in taken:ini=guess;derived+=1
            else:ini='uuid:'+uuid
        taken.add(ini.lower())
        name=bp.get('productName') or profile.get('name')
        if not name:raise ValueError('Bauplan ohne Produktname.')
        candidates={}
        for m in links.get(bp['guid'],[]):
            ident=m.get('id') or m['debugName'];previous=candidates.get(ident)
            if previous is None or (m.get('combinedChancePercent') or 0)>(previous.get('combinedChancePercent') or 0):candidates[ident]=m
        linked=sorted(candidates.values(),key=lambda m:(not m['active'],-(m.get('combinedChancePercent') or 0),-(m.get('rewardUEC') or 0),m['title']))
        recipe={'tiers':[{'tier':i+1,'craftTimeSeconds':tier.get('craftTimeSeconds'),'slots':[{'name':s.get('name') or 'Material','options':[{**o,'name':o.get('resourceName') or o.get('itemName') or 'Unbekannt'} for o in s.get('options',[])]} for s in tier.get('slots',[])]} for i,tier in enumerate(bp.get('tiers',[]))]}
        translated_links+=sum(1 for m in linked[:limit] if (m.get('translation') or {}).get('translatedFields'))
        compact_links=[{**{k:v for k,v in m.items() if k not in ('rewardPools','description','descriptionOriginal','titleOriginal','contractorOriginal','missionTypeOriginal','translation','debugNames','contractDefinitionIds','prerequisites','missionContext','titleTemplate','descriptionTemplate','en')},**({'en':{k:v for k,v in m['en'].items() if k!='description'}} if m.get('en') and any(k!='description' for k in m['en']) else {})} for m in linked[:limit]]
        output.append({'name':name,'ini':ini,'matched':True,'blueprint':{'guid':bp['guid'],'tag':bp.get('tag'),'entityClass':uuid,'gear':bp.get('gear'),'type':bp.get('type'),'subtype':bp.get('subtype'),'manufacturer':bp.get('manufacturer'),'scmdbUrl':'https://scmdb.net/?page=fab&fab='+urllib.parse.quote(bp.get('tag') or '')},'profile':profile,'recipe':recipe,'missionCount':len(linked),'missions':compact_links})
        desc_key=str(stat.get('descKey') or '').lstrip('@');desc=text(keys.get(desc_key,{}).get('tr')) or stat.get('description','')
        entries.append({**stat,**profile,'entityClass':uuid,'nameKey':ini,'name':name,'description':desc})
    if not output:raise ValueError('SCMDB-Katalog enthält keine zuordenbaren Baupläne.')
    # IDs of existing items must survive source updates (INI rename would orphan ownership).
    for row in output:
        old=seed_uuid.get(row['blueprint']['entityClass'])
        if old and old.get('ini'):
            row['ini']=old['ini']
            for entry in entries:
                if entry['entityClass']==row['blueprint']['entityClass']:entry['nameKey']=old['ini'];break
    return {'_meta':{'schema':SOURCE_SCHEMA,'generatedAt':now(),'scmdbVersion':version,'translationVersion':(language or {}).get('version'),'translationPending':pending,'translatedMissionLinks':translated_links,'source':'https://scmdb.net/','localBlueprints':len(output),'derivedKeys':derived,'fixedKeys':sum(1 for row in output if fixed.get(row['blueprint']['entityClass'])==row['ini']),'matchedBlueprints':len(output),'rawRecipes':len(crafting['blueprints']),'rewardBlueprints':len({str(b['productEntityClass']).lower() for b in crafting['blueprints'] if b['guid'] in eligible}),'retainedBlueprints':sum(i['blueprint']['guid'] not in eligible for i in output),'selection':'reward-pools-and-retained-items','missionsPerItemLimit':limit,'allMissions':True,'missionCount':len(missions)},'items':output,'missions':missions,'catalog':{'entries':entries}}


class SourceCatalog:
    def __init__(self,state,data,settings):
        self.root=Path(state)/'catalog';self.root.mkdir(parents=True,exist_ok=True)
        self.data=Path(data);self.settings=settings;self.wake=threading.Event();self.stop=threading.Event();self.lock=threading.Lock()
        self.status_path=self.root/'status.json';self.snapshot_path=self.root/'snapshot.json'
        self.snapshot_lock=threading.RLock();self.snapshot_stamp=None;self.snapshot_value={}

    def snapshot(self):
        with self.snapshot_lock:
            stamp=self.snapshot_path.stat().st_mtime_ns if self.snapshot_path.exists() else 0
            if stamp!=self.snapshot_stamp:
                self.snapshot_value=read_json(self.snapshot_path,{});self.snapshot_stamp=stamp
            return self.snapshot_value

    def compatible(self,value):
        version=value.get('_meta',{}).get('scmdbVersion') or value.get('version')
        channel=self.settings()['paths']['channel'];flavor='live' if channel in ('LIVE','HOTFIX') else channel.lower()
        return not version or bool(re.search('-'+re.escape(flavor)+r'[.-]',str(version),re.I))

    def active_snapshot(self):
        value=self.snapshot()
        return value if self.compatible(value) else {}

    def legacy_snapshot(self):
        # 4.1.5: The 20-MB legacy file is parsed once per file version, not per request.
        path=self.data/'scmdb-items.json'
        stamp=(path.stat().st_mtime_ns,path.stat().st_size) if path.exists() else None
        with self.snapshot_lock:
            if getattr(self,'_legacy_stamp',False)!=stamp:
                self._legacy_value=read_json(path,{});self._legacy_stamp=stamp
            value=self._legacy_value
        if self.compatible(value):return value
        return {**value,'missions':[],'items':[{**i,'missions':[],'missionCount':0} for i in value.get('items',[])]}

    def signature(self,cfg=None):
        cfg=cfg or self.settings()
        return hashlib.sha256(json.dumps([SOURCE_SCHEMA,cfg['paths']['channel'],cfg['sources'],cfg['providers']['offline']],sort_keys=True).encode()).hexdigest()

    def status(self):
        status=read_json(self.status_path,{})
        snapshot=self.snapshot()
        counts={k:v for k,v in snapshot.get('_meta',{}).items() if k in ('rawRecipes','rewardBlueprints','retainedBlueprints','selection','missionCount')}
        return {**status,**counts,'mode':'nas','offline':self.settings()['providers']['offline'],'available':bool(snapshot.get('items')) and self.compatible(snapshot),'compatible':self.compatible(snapshot),'version':snapshot.get('_meta',{}).get('scmdbVersion'),'items':len(snapshot.get('items',[]))}

    def fetch(self,url,timeout):
        key=hashlib.sha256(url.encode()).hexdigest();cache=self.root/(key+'.json');meta_path=self.root/(key+'.meta.json');meta=read_json(meta_path,{})
        headers={'User-Agent':'SCBlueprintDashboard/3.2','Accept':'application/json','Referer':'https://scmdb.net/'}
        if cache.exists():
            if meta.get('etag'):headers['If-None-Match']=meta['etag']
            if meta.get('modified'):headers['If-Modified-Since']=meta['modified']
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=timeout) as response:
                raw=response.read(32*1024*1024+1)
                if len(raw)>32*1024*1024:raise ValueError('Quelldatei ist zu groß.')
                value=json.loads(raw)
                if not isinstance(value,(list,dict)):raise ValueError('Ungültige JSON-Quelle.')
                atomic_json(cache,value);atomic_json(meta_path,{'etag':response.headers.get('ETag'),'modified':response.headers.get('Last-Modified'),'sha256':hashlib.sha256(raw).hexdigest()})
                return value
        except urllib.error.HTTPError as exc:
            if exc.code==304 and cache.exists():return read_json(cache,{})
            raise

    def refresh(self):
        if not self.lock.acquire(blocking=False):return self.status()
        cfg=self.settings();previous=self.status();status={**previous,'checkedAt':now(),'status':'updating','error':None,'attemptSignature':self.signature(cfg)}
        atomic_json(self.status_path,status)
        try:
            if cfg['providers']['offline']:raise ValueError('Offline-Modus aktiv. Gespeicherter Katalog bleibt verfügbar.')
            base=cfg['sources']['scmdbUrl'].rstrip('/');timeout=cfg['sources']['timeoutSeconds']
            version=select_version(self.fetch(base+'/versions.json',timeout),cfg['paths']['channel'])
            # Independent requests share the same selected game version. The
            # snapshot is still validated and committed as a single unit.
            with ThreadPoolExecutor(max_workers=5,thread_name_prefix='catalog-fetch') as pool:
                requests=[pool.submit(self.fetch,base+'/'+name+'-'+version+'.json',timeout) for name in ('crafting_blueprints','crafting_items','merged')]
                translation=pool.submit(self.fetch,cfg['sources']['translationUrl'],timeout)
                mining_request=pool.submit(self.fetch,base+'/mining_data-'+version+'.json',timeout)
                crafting,profiles,contracts=[request.result() for request in requests]
                language=translation.result()
            if not language:raise ValueError('Ausgewählte Übersetzung fehlt; letzter gültiger Katalog bleibt aktiv.')
            seed=read_json(self.snapshot_path,{}) or read_json(self.data/'scmdb-items.json',{})
            fingerprint=input_fingerprint(crafting,profiles,contracts,language,seed,cfg['sources']['maxMissions'])
            previous_snapshot=read_json(self.snapshot_path,{})
            reused=bool(previous_snapshot.get('items') and previous_snapshot.get('_meta',{}).get('inputFingerprint')==fingerprint)
            snapshot=previous_snapshot if reused else build_snapshot(crafting,profiles,contracts,language,seed,cfg['sources']['maxMissions'])
            # Store the fingerprint using the resulting retained identities so
            # newly discovered items do not cause another unnecessary rebuild.
            if not reused:snapshot['_meta']['inputFingerprint']=input_fingerprint(crafting,profiles,contracts,language,snapshot,cfg['sources']['maxMissions'])
            # 5.5.0: Fundorte sind optional. Fehlt die Mining-Datei, bleiben die letzten bekannten stehen.
            try:locations=material_locations(mining_request.result())
            except Exception:locations={}
            locations=locations or previous_snapshot.get('materialLocations') or {}
            if locations:snapshot={**snapshot,'materialLocations':locations}
            if self.signature(cfg)!=self.signature():raise ValueError('Quellenauswahl wurde während des Abrufs geändert. Bitte erneut prüfen.')
            def content(value):
                return {**value,'_meta':{k:v for k,v in value.get('_meta',{}).items() if k!='generatedAt'}}
            changed=content(snapshot)!=content(previous_snapshot)
            if changed:atomic_json(self.snapshot_path,snapshot)
            pending=snapshot.get('_meta',{}).get('translationPending')
            message=('Katalog '+version+' aktiv, Texte auf Englisch: die deutsche Übersetzung ('+pending['found']+') passt noch nicht. Neue Prüfung alle 30 Minuten.') if pending else ('Katalog und deutsche Aufträge auf der Synology aktualisiert.' if changed else 'Katalog und Sprache geprüft · Datenstand unverändert.')
            status.update(status='ready',message=message,lastSuccess=now(),signature=self.signature(cfg),version=version,items=len(snapshot['items']),changed=changed,reusedSnapshot=reused,translationPending=pending)
        except Exception as exc:status.update(status='offline' if cfg['providers']['offline'] else 'error',error=str(exc)[:500],message='Letzter gültiger Datenstand bleibt erhalten.')
        finally:
            atomic_json(self.status_path,status);self.lock.release()
        return status

    def start(self):
        def work():
            while not self.stop.is_set():
                cfg=self.settings();status=read_json(self.status_path,{})
                try:last=time.strptime(status.get('checkedAt','')[:19],'%Y-%m-%dT%H:%M:%S');elapsed=time.time()-__import__('calendar').timegm(last)
                except ValueError:elapsed=float('inf')
                forced=self.wake.is_set();self.wake.clear()
                interval=min(300,cfg['sync']['externalRefreshHours']*3600) if status.get('status') in ('error','updating') else min(1800,cfg['sync']['externalRefreshHours']*3600) if status.get('translationPending') else cfg['sync']['externalRefreshHours']*3600
                if forced or (not cfg['providers']['offline'] and (elapsed>=interval or status.get('attemptSignature')!=self.signature(cfg))):self.refresh()
                self.wake.wait(30)
        threading.Thread(target=work,daemon=True,name='nas-catalog').start()
