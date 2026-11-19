"""All joins use localization keys or UUIDs, never the display name."""
from datetime import datetime
import hashlib
import json
import threading
from pathlib import Path
from .common import UUID, atomic_json, read_json, slug, token
from .source_catalog import load_item_types, load_name_overrides

TAXONOMY=read_json(Path(__file__).with_name('taxonomy.json'),[])
LABELS={c['id']:c['label'] for c in TAXONOMY}
LABELS.update({k:v for c in TAXONOMY for k,v in c['children']})

def classify(row, local, raw):
    bp=row.get('blueprint') or {}; p=row.get('profile') or {}
    gear=token(bp.get('gear')); typ=token(bp.get('type')); sub=token(bp.get('subtype'))
    attach=token(p.get('attachType') or local.get('attachType')); raw=raw.lower()
    if typ=='clothing' or 'charclothing' in attach or any(x in raw for x in ['bekleidung','clothing']):
        for keys,out in [('hat head helmet','hats'),('feet shoe boot','shoes'),('hand glove','gloves'),('leg pant','pants'),('eye glass','glasses'),('jacket torso1','jackets')]:
            if any(k in attach for k in keys.split()): return 'clothing','clothing-'+out
        return 'clothing','clothing-tops'
    if (gear=='fpsgear' and typ=='armour') or 'chararmor' in attach or any(x in raw for x in ['armor','rüstung','helmet','helm','undersuit','basisanzug','backpack','rucksack']):
        for key,out in [('undersuit','undersuits'),('helmet','helmets'),('torso','torso'),('arms','arms'),('legs','legs'),('backpack','backpacks')]:
            if key in attach: return 'armor','armor-'+out
        for key,out in [('undersuit','undersuits'),('basisanzug','undersuits'),('helm','helmets'),('brust','torso'),('core armor','torso'),('backpack','backpacks'),('rucksack','backpacks')]:
            if key in raw: return 'armor','armor-'+out
        return 'armor','armor-flair'
    if (gear=='fpsgear' and typ=='weapons') or (gear!='vehiclegear' and (p.get('itemType')=='weapon' or raw.startswith('fps'))):
        if 'attachment' in attach: return 'weapons','weapons-attachments'
        for keys,out in [('melee knife messer nahkampf','melee'),('throw grenade wurf','throwables'),('pistol','pistols'),('lmg rifle gewehr shotgun schrot smg sniper','longarms')]:
            if any(k in sub+raw for k in keys.split()):return 'weapons','weapons-'+out
        return 'weapons','weapons-special'
    if (gear=='fpsgear' and typ=='ammo') or any(k in raw for k in ['magazine','magazin','munition']): return 'ammunition','ammunition-all'
    if gear=='vehiclegear':
        mapping={'artillery':'artillery','cooler':'coolers','emp':'emp','mininglaser':'mining','miningmodule':'mining-modules','miningmodifier':'mining-modules','orepod':'ore-pods','missilerack':'missile-racks','powerplant':'powerplants','quantumdrive':'quantumdrives','shield':'shields','decoy':'decoys','paint':'paints','jumpmodule':'jumpmodules','radar':'radar','refuelling':'refuelling','salvage':'salvage','salvagehead':'salvage','tractorbeam':'tractorbeam'}
        return 'vehicle','vehicle-'+('turrets' if typ=='weapons' and any(k in raw for k in ['turret','geschütz']) else mapping.get(typ,'weapons'))
    for keys,out in [('medical medizin','medical'),('cryptokey crypto key','cryptokeys'),('accessory zubehör','accessories'),('tool werkzeug','tools')]:
        if any(k in raw+sub+typ for k in keys.split()):return 'tools','tools-'+out
    return 'tools','tools-technology'

def unique_index(rows,key):
    out={}
    for row in rows:
        value=row.get(key)
        if key=='nameKey' and isinstance(value,str):value=value.removesuffix(',P')
        if value: out[value]=row if value not in out else None
    return out

class Catalog:
    def __init__(self,data,source=None,settings=None):
        self.source=source;self.settings=settings
        self.data=Path(data); self.lock=threading.RLock(); self.signature=None; self.ownership=None; self.manual=lambda: {}; self.confirmations=lambda: {}; self.items=[]; self.by_id={};self.by_key={}; self.error=None
    def refresh(self):
        with self.lock:
            # 5.6.0: Ohne Launcher. Itemliste nur aus dem SCMDB-Snapshot (Rückfall: alter scmdb-items.json).
            legacy=self.data/'scmdb-items.json'
            overlay_signature,owned=self.ownership() if self.ownership else (None,{})
            source_signature=self.source.snapshot_path.stat().st_mtime_ns if self.source and self.source.snapshot_path.exists() else 0
            manual=self.manual()
            # Positionen: 0 Rückfalldatei, 1 Besitz-Overlay, 2 Snapshot, 3 Handmarkierungen (Scanner nutzt 0 und 2).
            signature=(legacy.stat().st_mtime_ns if legacy.exists() else 0,overlay_signature,source_signature,json.dumps(manual,sort_keys=True))
            if signature==self.signature:return self.items
            try:
                snapshot=self.source.active_snapshot() if self.source else {}
                base=snapshot if snapshot.get('items') else ((self.source.legacy_snapshot() if self.source else read_json(legacy,{})) or {})
                source_items=[r for r in base.get('items') or [] if isinstance(r,dict) and r.get('ini') and r.get('name')]
                if not source_items: raise ValueError('Itemkatalog wird geladen. Beim ersten Start ist dafür eine Internetverbindung nötig (SCMDB).')
                fixed_names=load_name_overrides()
                rows=[];existing=set()
                for r in source_items:
                    if r['ini'] in existing:continue
                    existing.add(r['ini']);rows.append({'key':fixed_names.get(r['ini'],r['name']),'ini':r['ini'],'isDone':False})
                scmdb=unique_index(source_items,'ini')
                local=unique_index((base.get('catalog') or {}).get('entries',[]),'nameKey')
                items=[]
                for row in rows:
                    src=scmdb.get(row['ini']) or {}; cat=local.get(row['ini']) or {}; bp=src.get('blueprint') or {}
                    uuid=bp.get('entityClass') or cat.get('entityClass') or ''
                    uuid=uuid.lower() if UUID.fullmatch(uuid) else ''
                    if uuid and cat.get('entityClass') and cat['entityClass'].lower()!=uuid:cat={}
                    ident=uuid or 'ini-'+hashlib.sha256(row['ini'].encode()).hexdigest()[:32]
                    main,sub=classify(src,cat,'')
                    items.append({'id':ident,'uuid':uuid,'ini':row['ini'],'name':row.get('key') or cat.get('name') or row['ini'], 'isDone':row['isDone'],'acquiredAt':row.get('atTime'), 'mainCategory':main,'subCategory':sub,'category':LABELS[main],'subcategory':LABELS[sub],'manufacturer':cat.get('manufacturer') or src.get('profile',{}).get('manufacturer') or bp.get('manufacturer') or '—','description':cat.get('description',''),'blueprint':bp.get('guid'),'size':cat.get('size') or src.get('profile',{}).get('size'),'missionCount':src.get('missionCount',0),'scmdb':src})
                merged={}
                for item in items:
                    previous=merged.get(item['id'])
                    if previous:
                        if previous['ini']!=item['ini'] or previous['blueprint']!=item['blueprint']:raise ValueError('Widersprüchliche UUID-Zuordnung im Katalog.')
                        previous['isDone']=previous['isDone'] or item['isDone']
                        previous['acquiredAt']=max(previous['acquiredAt'] or '',item['acquiredAt'] or '') or None
                    else:merged[item['id']]=item
                items=list(merged.values())
                confirmations=self.confirmations();item_types=load_item_types()
                for item in items:
                    item['rawType']=item_types.get(item['ini'])
                    # Besitz kommt nur aus dem Game.log (scan_owned) und aus Handmarkierungen.
                    item['isDone']=item['ini'] in owned
                    if item['ini'] in owned:item['acquiredAt']=item['acquiredAt'] or owned[item['ini']]
                    evidence=confirmations.get(item['ini'],{})
                    item['automaticOwned']=item['isDone']
                    item['logConfirmed']=bool(evidence.get('log'))
                    item['ownershipSource']='log' if item['logConfirmed'] and item['isDone'] else 'sync'
                    entry=manual.get(item['ini']);value=entry.get('owned') if isinstance(entry,dict) else entry
                    live=evidence.get('latestLive');set_at=entry.get('setAt') if isinstance(entry,dict) else None
                    newer=bool(live and set_at and datetime.fromisoformat(live.replace('Z','+00:00'))>datetime.fromisoformat(set_at.replace('Z','+00:00')))
                    item['manualOwned']=value if type(value) is bool and not newer else None
                    if type(item['manualOwned']) is bool:
                        item['isDone']=item['manualOwned'];item['ownershipSource']='manual'
                    elif newer:
                        item['isDone']=True;item['ownershipSource']='log'

                self.items=items;self.by_id={x['id']:x for x in items};self.by_key={x['ini']:x for x in items};self.signature=signature;self.error=None
            except (OSError,ValueError,KeyError,TypeError) as exc:self.error=str(exc)
            return self.items
    def get(self,key):
        self.refresh(); item=self.by_id.get(key) or self.by_key.get(key)
        if not item:raise ValueError('Item nicht im lokalen Katalog gefunden.')
        return item
    def public(self,item): return {k:v for k,v in item.items() if k!='scmdb'}
    def mission_templates(self):
        self.refresh()
        if hasattr(self,'templates') and getattr(self,'template_signature',None)==self.signature:return self.templates
        snapshot=self.source.active_snapshot() if self.source else {}
        definitions=snapshot.get('missions') or (self.source.legacy_snapshot() if self.source else read_json(self.data/'scmdb-items.json',{})).get('missions',[])
        if definitions:
            self.template_signature=self.signature;self.templates=definitions;return definitions
        result={}
        for item in self.items:
            for mission in item['scmdb'].get('missions',[]):result[mission.get('id') or mission.get('debugName')]=mission
        self.template_signature=self.signature;self.templates=list(result.values());return self.templates
    def snapshot(self):return {'items':[self.public(x) for x in self.refresh()],'categories':TAXONOMY,'error':self.error}
