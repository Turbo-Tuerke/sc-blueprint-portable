"""Explicit mission selections for the persistent OBS queue."""
def mission_rewards(catalog, key):
    mission=next((m for m in catalog.mission_templates() if key in (m.get('id'),m.get('debugName'))),None)
    if not mission:raise ValueError('Auftrag nicht im lokalen Bestand gefunden.')
    items=catalog.refresh();by_guid={i.get('blueprint'):i for i in items};result={}
    for pool in mission.get('rewardPools') or []:
        for entry in pool.get('items') or []:
            guid=entry.get('blueprintRecord');item=by_guid.get(guid)
            ident=guid or entry.get('name')
            if ident:result[ident]=item or {'name':entry.get('name') or 'Unbekannter Bauplan','description':'Nicht im lokalen Katalog zugeordnet','isDone':False}
    if not result:
        result={i['ini']:i for i in items if any(key in (m.get('id'),m.get('debugName')) for m in i['scmdb'].get('missions',[]))}
    if not result:raise ValueError('Keine Bauplan-Belohnungen für diesen Auftrag vorhanden.')
    return sorted(result.values(),key=lambda i:i.get('isDone',False))

def mission_dossier(catalog,key,item_key):
    item=catalog.get(item_key)
    link=next((m for m in item['scmdb'].get('missions',[]) if key in (m.get('id'),m.get('debugName'))),None)
    mission=next((m for m in catalog.mission_templates() if key in (m.get('id'),m.get('debugName'))),None)
    # Full pool membership also permits missions outside the per-item display limit.
    member=mission and any(e.get('blueprintRecord')==item.get('blueprint') for p in mission.get('rewardPools',[]) for e in p.get('items',[]))
    if not mission or not (link or member):raise ValueError('Auftrag und Bauplan sind nicht eindeutig zugeordnet.')
    src=item['scmdb']
    return {'name':mission.get('title') or mission.get('debugName'),'description':mission.get('description') or 'Keine Beschreibung vorhanden.','missionDetails':{**mission,**(link or {})},'selectedBlueprint':catalog.public(item),'profile':src.get('profile') or {},'recipe':src.get('recipe') or {}}
