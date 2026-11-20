"""6.0.3: Ausgaben und Reiseverlauf aus dem Spiel-Log (Seite 5 der Akte).

Gelesen werden nur Ladenkäufe/-verkäufe und Reise-Meldungen (Rechtsgebiet, Waffenstillstandszone,
Privatgelände, kontrollierter Raum, Hangar, Schiff, Quantum-Ankunft). Spieler-IDs und Spielernamen
werden nicht gespeichert; aus der Kanal-Meldung bleibt nur der Schiffsname.
"""
import json
import re

BUY = re.compile(r'SendShopBuyRequest>.*?shopId\[(\d+)\].*?shopName\[([^\]]*)\].*?client_price\[([\d.]+)\].*?itemName\[([^\]]*)\].*?quantity\[(\d+)\]')
SELL = re.compile(r'SendCommoditySellRequest>.*?shopId\[(\d+)\].*?shopName\[([^\]]*)\].*?amount\[([\d.]+)\].*?resourceGUID\[([^\]]*)\].*?quantity\[(\d+)\]')
FLOW = re.compile(r'RmShopFlowResponse>.*?shopId\[(\d+)\].*?result\[(\w+)\].*?type\[(\w+)\]')
QUANTUM = re.compile(r'<Quantum Drive Arrived')
NOTE = re.compile(r'Added notification "(.*?)(?::\s*"|"\s*\[|$)')
CHANNEL = re.compile(r'(?:Kanal|channel)\s*\[\s*(.+?)\s*:', re.I)
# Deutsche Texte aus dem Spiel bestätigt (19./20.11.2026); englische Fassungen nach dem englischen Client.
NOTES = [
    ('jurisdiction', re.compile(r'^Rechtsgebiet von (.+?) betreten', re.I)),
    ('jurisdiction', re.compile(r'^Entered (.+?) Jurisdiction', re.I)),
    ('armistice-in', re.compile(r'^(?:Waffenstillstandszone - Kampfhandlung untersagt|Entering Armistice Zone)', re.I)),
    ('armistice-out', re.compile(r'^(?:Waffenstillstandszone (?:wird )?verlassen|Leaving Armistice Zone)', re.I)),
    ('private-in', re.compile(r'^(?:Privatgel\S*nde betreten|Entering Private Property)', re.I)),
    ('private-out', re.compile(r'^(?:Privatgel\S*nde (?:wird )?verlassen|Leaving Private Property)', re.I)),
    ('controlled-in', re.compile(r'^(?:Kontrollierten Raum betreten|Entering Controlled Space)', re.I)),
    ('controlled-out', re.compile(r'^(?:Kontrollierten Raum verlassen|Leaving Controlled Space)', re.I)),
    ('hangar', re.compile(r'^(?:Hangaranfrage genehmigt|Hangar Request Approved)', re.I)),
]
SCHEMA = ('CREATE TABLE IF NOT EXISTS journal(id TEXT PRIMARY KEY,channel TEXT,ts TEXT,kind TEXT,ref TEXT,data TEXT,status TEXT);'
          'CREATE INDEX IF NOT EXISTS journal_ts ON journal(channel,ts);')
CONFIRM_SECONDS = 120
LIMIT = 600


def parse(line):
    """(Art, Daten) für eine Logzeile oder None."""
    m = BUY.search(line)
    if m:
        return 'buy', {'shopId': m[1], 'shop': m[2], 'price': float(m[3]), 'item': m[4], 'quantity': int(m[5])}
    m = SELL.search(line)
    if m:
        return 'sell', {'shopId': m[1], 'shop': m[2], 'price': float(m[3]), 'item': m[4], 'quantity': int(m[5])}
    m = FLOW.search(line)
    if m:
        return 'flow', {'shopId': m[1], 'result': m[2], 'type': m[3]}
    if QUANTUM.search(line):
        return 'quantum', {}
    m = NOTE.search(line)
    if not m:
        return None
    text = m[1].strip()
    if re.match(r'^(?:Du bist Kanal|You (?:have )?joined channel)', text, re.I):
        ship = CHANNEL.search(text)
        return ('ship', {'ship': ship[1].strip()}) if ship else None
    for kind, pattern in NOTES:
        hit = pattern.search(text)
        if hit:
            return kind, ({'place': hit[1].strip()} if hit.groups() else {})
    return None


def store(db, channel, timestamp, epoch, parsed, key):
    """Speichert einen Eintrag; eine Laden-Antwort bestätigt den letzten offenen Kauf/Verkauf desselben Ladens."""
    kind, data = parsed
    if kind == 'flow':
        target = 'buy' if data['type'].lower().startswith('buy') else 'sell'
        row = db.execute("SELECT id,ts FROM journal WHERE channel=? AND kind=? AND ref=? AND status='pending' AND ts<=? ORDER BY ts DESC LIMIT 1",
                         (channel, target, data['shopId'], timestamp)).fetchone()
        if row and epoch - _epoch(row[1]) <= CONFIRM_SECONDS:
            db.execute('UPDATE journal SET status=? WHERE id=?', ('ok' if data['result'].lower() == 'success' else 'failed', row[0]))
        return
    ref = data.pop('shopId', None)
    status = 'pending' if kind in ('buy', 'sell') else 'ok'
    db.execute('INSERT OR IGNORE INTO journal VALUES(?,?,?,?,?,?,?)',
               (key(channel, 'journal-' + kind, timestamp, json.dumps(data, sort_keys=True, ensure_ascii=False)), channel, timestamp, kind, ref,
                json.dumps(data, ensure_ascii=False), status))


def _epoch(ts):
    from datetime import datetime
    return datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp()


def query(db, channel, start, end):
    rows = db.execute('SELECT ts,kind,data,status FROM journal WHERE channel=? AND ts>=? AND ts<=? ORDER BY ts LIMIT ?',
                      (channel, start, end, LIMIT)).fetchall()
    return [{'ts': r[0], 'kind': r[1], 'status': r[3], **json.loads(r[2])} for r in rows]
