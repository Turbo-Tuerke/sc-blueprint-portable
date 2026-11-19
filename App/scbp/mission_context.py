"""Explicit contract metadata; never infer a live mission's selected location."""
import re

TOKEN=re.compile(r'\[([A-Za-z][A-Za-z0-9_|]*)\]')
ALIASES={'RANK':'ReputationRank','CARGO_GRADE':'CargoGradeToken','CARGO_ROUTE':'CargoRouteToken','MAX_SCU':'MissionMaxSCUSize','SIGN_OFF':'Contractor|SignOff','OBJECTS':'Objects'}

def build_context(contract,source,keys,clean):
    tokens={}
    for key,value in (contract.get('tokenSubstitutions') or {}).items():
        if not isinstance(value,(str,int,float)):continue
        value=str(value)
        if value.startswith('@'):
            entry=keys.get(value.lstrip('@'),{})
            value=entry.get('tr') or entry.get('en') or ''
        value=clean(value)
        if value:tokens[key.upper()]=value
    for alias,key in ALIASES.items():
        if key.upper() in tokens:tokens[alias]=tokens[key.upper()]
    def places(ids):
        result=[];seen=set()
        for ident in ids or []:
            entry=source.get('locationPools',{}).get(ident)
            if not isinstance(entry,dict) or entry.get('type') in ('Star','Default'):continue
            name=clean(entry.get('name'))
            if not name or name.startswith('@') or ident in seen:continue
            seen.add(ident);result.append({'name':name,'type':clean(entry.get('type')),'system':clean(entry.get('system')),'planet':clean(entry.get('planet')),'moon':clean(entry.get('moon'))})
        return result
    routes=[{'locations':places(row.get('locations')),'destinations':places(row.get('destinations'))} for row in contract.get('locationSets') or [] if isinstance(row,dict)]
    locations=places(contract.get('locations'));destinations=places(contract.get('destinations'))
    if not locations:locations=[entry for route in routes for entry in route['locations']]
    if not destinations:destinations=[entry for route in routes for entry in route['destinations']]
    cargo=[]
    for order in contract.get('haulingOrders') or []:
        if not isinstance(order,dict):continue
        resource=source.get('resourcePools',{}).get(order.get('resource'),{})
        cargo.append({'name':clean(resource.get('name')) if isinstance(resource,dict) else '',**{key:order.get(key) for key in ['minSCU','maxSCU','maxContainerSize']}})
    # Only a positive, explicit container size can supply a missing size token.
    sizes=[row['maxContainerSize'] for row in cargo if isinstance(row.get('maxContainerSize'),(int,float)) and row['maxContainerSize']>0]
    if 'MAX_SCU' not in tokens and sizes:tokens['MAX_SCU']=str(max(sizes))+' SCU'
    return {'tokens':tokens,'locations':locations,'destinations':destinations,'routes':routes,'cargo':cargo,'association':'catalog-possibilities'}

def resolve_tokens(template,context):
    return TOKEN.sub(lambda match:context['tokens'].get(match[1].upper(),match[0]),template)
