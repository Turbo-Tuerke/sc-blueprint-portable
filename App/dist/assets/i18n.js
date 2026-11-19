/* SC Blueprint Dashboard 5.1.0 – Sprachumschaltung Deutsch / Englisch.
 *
 * Deutsch ist Standard. Die Wahl liegt im Browser (localStorage) und als Cookie
 * "scbp-lang", damit der Server die Spielinhalte (Missionen, Auftraggeber …) in
 * derselben Sprache liefert. ?lang=en in der Adresse (z. B. OBS-Browserquelle)
 * gilt nur für diese Seite.
 *
 * Die Oberfläche wird ohne Umbau der übrigen Skripte übersetzt: Texte, die genau
 * einem Eintrag im Wörterbuch entsprechen, werden nach dem Anzeigen ersetzt,
 * auch wenn sie später nachgeladen werden. Fehlt ein Eintrag, bleibt Deutsch stehen.
 */
(function () {
  'use strict';
  var KEY = 'scbp-lang';
  var url = new URLSearchParams(location.search).get('lang');
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* privat/gesperrt */ }
  var lang = (url === 'en' || url === 'de') ? url : (stored === 'en' ? 'en' : 'de');
  document.cookie = KEY + '=' + lang + '; path=/; max-age=31536000; SameSite=Lax';
  document.documentElement.lang = lang;

  // Wörterbuch Deutsch -> Englisch. Etappe 1: Kopf, Menü, Startbereich.
  var DICT = {
    'Live-Aufträge': 'Live missions',
    'Sammlung': 'Collection',
    'Blueprint Aufträge': 'Blueprint missions',
    'Alle Aufträge': 'All missions',
    'Sammelziele': 'Collection goals',
    'Quellen': 'Sources',
    'Logscanner': 'Log scanner',
    'Einstellungen': 'Settings',
    'Freiwillige Unterstützung': 'Voluntary support',
    'Bilder': 'Images',
    'Dein Fund. Dein Antrieb.': 'Your find. Your drive.',
    'Baupläne entdecken. Ziele verfolgen. Dein Archiv im Verse.': 'Discover blueprints. Track goals. Your archive in the verse.',
    'Jeder Fund zählt.': 'Every find counts.',
    'Dein persönliches Observatorium. Entdecken. Sammeln. Weiterziehen.': 'Your personal observatory. Discover. Collect. Move on.',
    'Raum für das Besondere.': 'Room for the extraordinary.',
    'Deine Baupläne, sorgfältig kuratiert. Das nächste Stück wartet schon.': 'Your blueprints, carefully curated. The next piece is waiting.',
    'Das Unentdeckte wartet.': 'The undiscovered awaits.',
    'Aus einzelnen Funden wird deine Geschichte im Verse.': 'Single finds become your story in the verse.',
    'Meine Sammlung': 'My collection',
    'Datenstatus & Quellen': 'Data status & sources',
    'MEHR ALS SPIELEN.': 'MORE THAN PLAYING.',
    'EINE SAMMLUNG.': 'A COLLECTION.',
    'Inoffizielles Fanprojekt. Programmcode unter MIT-Lizenz; Daten und Bilder Dritter gehören ihren Rechteinhabern (siehe LIZENZEN.md).':
      'Unofficial fan project. Code under the MIT licence; third-party data and images belong to their owners (see LIZENZEN.md).'
  };
  // Ergänzungen späterer Etappen (eigene Dateien) hängen sich hier an.
  window.SCBP_I18N = window.SCBP_I18N || {};
  for (var k in DICT) if (!(k in window.SCBP_I18N)) window.SCBP_I18N[k] = DICT[k];
  var ATTRS = ['placeholder', 'title', 'aria-label'];

  function tr(text) {
    var raw = text.trim();
    if (!raw) return null;
    var t = raw.replace(/\s+/g, ' ');                 // Zeilenumbrüche im HTML wie Leerzeichen behandeln
    if (t !== raw) text = text.replace(raw, t);
    var hit = window.SCBP_I18N[t];
    if (hit) return text.replace(t, hit);
    // Muster für Texte mit Zahlen oder Datum: [Regex, Ersatz] ganz, [Regex, Ersatz, true] als Teilersatz
    var rules = window.SCBP_I18N_RULES || [], out = t, i;
    for (i = 0; i < rules.length; i++) {
      if (!rules[i][2] && rules[i][0].test(t)) {
        var done = t.replace(rules[i][0], rules[i][1]);
        return done !== t ? text.replace(t, done) : null;   // unverändert = nichts tun (sonst Endlosschleife)
      }
    }
    for (i = 0; i < rules.length; i++) if (rules[i][2]) out = out.replace(rules[i][0], rules[i][1]);
    return out !== t ? text.replace(t, out) : null;
  }

  function walk(root) {
    if (lang !== 'en' || !root) return;
    if (root.nodeType === 3) { var r = tr(root.nodeValue); if (r !== null && r !== root.nodeValue) root.nodeValue = r; return; }
    if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE' || root.closest('[data-i18n-skip]')) return;
    attrs(root);
    for (var n = root.firstChild; n; n = n.nextSibling) walk(n);
  }

  function attrs(el) {
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var old = el.getAttribute(a), r = tr(old);
      if (r !== null && r !== old) el.setAttribute(a, r);
    });
  }

  // ---------------------------------------------------------------- Flaggen
  var FLAG_DE = '<svg viewBox="0 0 5 3" aria-hidden="true"><rect width="5" height="1" y="0" fill="#000"/><rect width="5" height="1" y="1" fill="#dd0000"/><rect width="5" height="1" y="2" fill="#ffce00"/></svg>';
  var FLAG_EN = '<svg viewBox="0 0 60 30" aria-hidden="true"><clipPath id="i18n-uk"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>' +
    '<path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>' +
    '<path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#i18n-uk)" stroke="#C8102E" stroke-width="4"/>' +
    '<path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></svg>';

  function flags() {
    var box = document.createElement('div');
    box.className = 'i18n-flags';
    box.setAttribute('data-i18n-skip', '');
    box.innerHTML = '<div class="i18n-note" hidden></div>' +
      '<button type="button" data-lang="de" title="Deutsch" aria-label="Deutsch" aria-pressed="' + (lang === 'de') + '">' + FLAG_DE + '</button>' +
      '<button type="button" data-lang="en" title="English" aria-label="English" aria-pressed="' + (lang === 'en') + '">' + FLAG_EN + '</button>';
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-lang]');
      if (!b || b.dataset.lang === lang) return;
      try { localStorage.setItem(KEY, b.dataset.lang); } catch (e) { /* egal */ }
      document.cookie = KEY + '=' + b.dataset.lang + '; path=/; max-age=31536000; SameSite=Lax';
      var u = new URL(location.href); u.searchParams.delete('lang');
      location.replace(u.toString());
    });
    return box;
  }

  var note = '', noteState = '';   // noteState: ok (Deutsch passt) | pending (Deutsch fehlt noch)
  function place() {
    if (document.documentElement.hasAttribute('data-i18n-noflags')) return;   // OBS-Overlay: keine Knöpfe im Stream
    var host = document.querySelector('.obsidian-overline');
    var existing = document.querySelector('.i18n-flags');
    if (existing) {   // Kopfzeile erst später aufgebaut: Flaggen dorthin umziehen
      if (host && existing.classList.contains('floating')) { existing.classList.remove('floating'); host.appendChild(existing); }
      return;
    }
    var box = flags();
    if (host) host.appendChild(box); else { box.classList.add('floating'); document.body.appendChild(box); }
    showNote();
  }
  function showNote() {
    var el = document.querySelector('.i18n-note');
    if (!el) return;
    el.textContent = note; el.hidden = !note;
    el.setAttribute('data-state', noteState);
    el.title = noteState === 'ok' ? 'Die deutsche Übersetzung passt zum aktuellen Spiel-Build.' :
      noteState === 'pending' ? 'Die deutsche Übersetzung passt noch nicht zum Spiel-Build. Das Dashboard prüft alle 30 Minuten.' : '';
  }

  // Stand der deutschen Übersetzung neben der Flagge, alle 10 Minuten neu gelesen
  function checkTranslation() {
    fetch('/api/sources/catalog', {credentials: 'same-origin'}).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
      var p = s && s.translationPending, build = s && String(s.version || '').split('-')[0];
      if (p && p.expected) { noteState = 'pending'; note = 'Deutsch für ' + String(p.expected).split('-')[0] + ' folgt · Spieltexte auf Englisch'; }
      else if (s && s.status === 'ready' && build) { noteState = 'ok'; note = '✓ Deutsch aktuell · ' + build; }
      else { noteState = ''; note = ''; }
      showNote();
    }).catch(function () {});
  }

  function css() {
    var s = document.createElement('style');
    s.textContent = '.i18n-flags{display:inline-flex!important;align-items:center;gap:6px;margin-left:14px;vertical-align:middle;flex:none}' +
      '.i18n-flags.floating{position:fixed;top:8px;right:12px;z-index:9999}' +
      '.i18n-flags button{width:30px;height:20px;padding:0;border:1px solid rgba(255,255,255,.25);border-radius:3px;background:none;cursor:pointer;opacity:.45;line-height:0;overflow:hidden}' +
      '.i18n-flags button svg{width:100%;height:100%;display:block}' +
      '.i18n-flags button[aria-pressed="true"]{opacity:1;border-color:currentColor;box-shadow:0 0 0 1px currentColor}' +
      '.i18n-flags button:hover{opacity:.85}' +
      '@media (max-width:760px){.obsidian-overline{flex-wrap:wrap;row-gap:4px}.i18n-flags{margin-left:auto}.i18n-note{display:none!important}}' +
      '.i18n-note{display:inline-block;font-size:11px;letter-spacing:.02em;text-transform:none;opacity:.85;margin-right:4px;cursor:default}.i18n-note[hidden]{display:none}' +
      '.i18n-note[data-state="ok"]{color:#6fcf97}.i18n-note[data-state="pending"]{color:#e5b46a}' +
      (lang === 'en' ? '.reference-layout #detailDialog .dialog-header>div:after{content:"Blueprint dossier"}' : '');
    document.head.appendChild(s);
  }

  // 6.0.1: Seitentitel („Einstellungen · SC Blueprint Dashboard“) teilweise übersetzen
  function title() {
    if (lang !== 'en') return;
    var t = document.title.split(' · ').map(function (p) { return window.SCBP_I18N[p] || p; }).join(' · ');
    if (t !== document.title) document.title = t;
  }

  function start() {
    css();
    place();
    title();
    walk(document.body);
    new MutationObserver(function (list) {
      place();
      list.forEach(function (m) {
        if (m.type === 'characterData') walk(m.target);
        else if (m.type === 'attributes') { if (lang === 'en' && !m.target.closest('[data-i18n-skip]')) attrs(m.target); }
        else m.addedNodes.forEach(walk);
      });
    }).observe(document.body, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS});
    // Stand der deutschen Übersetzung (nur in der deutschen Ansicht)
    if (lang === 'de' && !document.documentElement.hasAttribute('data-i18n-noflags')) {
      checkTranslation();
      setInterval(checkTranslation, 10 * 60 * 1000);
    }
  }

  window.SCBP_LANG = lang;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
