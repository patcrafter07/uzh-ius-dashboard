// Renders courses.json into a single self-contained dist/index.html.
// All links are in the markup; the inline script only filters what is shown.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('./courses.json', import.meta.url), 'utf8'));

const TYPES = {
  lehrstuhl: 'Kursseite',
  olat: 'OLAT',
  mediaspace: 'Podcast',
  moodle: 'Moodle',
  vvz: 'VVZ',
  pdf: 'PDF',
  app: 'App',
  lernhilfe: 'Lernhilfe',
  extern: 'Extern',
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let jsonLinks = 0;
let renderedLinks = 0;

function checkLink(l, where) {
  jsonLinks++;
  if (!TYPES[l.type]) throw new Error(`${where}: unknown link type "${l.type}"`);
  if (l.access !== 'public' && l.access !== 'login') throw new Error(`${where}: access must be public|login`);
  if (!/^https:\/\//.test(l.url)) throw new Error(`${where}: url must be https: ${l.url}`);
}

function renderLinks(links = [], where) {
  if (!links.length) return '';
  const items = links.map((l) => {
    checkLink(l, where);
    renderedLinks++;
    const login = l.access === 'login'
      ? ' <span class="badge login" title="Login mit SWITCH edu-ID nötig">🔒 edu-ID</span>'
      : '';
    return `<li class="link t-${l.type}"><span class="badge type">${TYPES[l.type]}</span> `
      + `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>${login}</li>`;
  });
  return `<ul class="links">${items.join('')}</ul>`;
}

const note = (text) => (text ? `<p class="note">${esc(text)}</p>` : '');

function renderGroup(lecture, g) {
  const who = g.lecturers?.length ? ` <span class="who">· ${esc(g.lecturers.join(', '))}</span>` : '';
  return `<div class="group" data-key="${esc(lecture.key)}" data-covers="${esc((g.covers ?? []).join(' '))}">`
    + `<h4>${esc(g.label)}${who}</h4>${note(g.note)}${renderLinks(g.links, `${lecture.key}/${g.label}`)}</div>`;
}

function renderLecture(lecture) {
  const shared = lecture.shared?.length
    ? `<div class="shared"><h4>Für alle Gruppen</h4>${renderLinks(lecture.shared, `${lecture.key}/shared`)}</div>`
    : '';
  return `<article class="lecture" id="${esc(lecture.key)}">`
    + `<h3>${esc(lecture.title)} <span class="kind">${esc(lecture.kind)}</span></h3>`
    + note(lecture.note) + shared + lecture.groups.map((g) => renderGroup(lecture, g)).join('')
    + `</article>`;
}

const renderModule = (m) =>
  `<section class="module"><h2>${esc(m.title)} <code>${esc(m.code)}</code></h2>${m.lectures.map(renderLecture).join('')}</section>`;

const lectures = data.modules.flatMap((m) => m.lectures);
const keys = new Set();
for (const l of lectures) {
  if (keys.has(l.key)) throw new Error(`duplicate lecture key "${l.key}"`);
  keys.add(l.key);
}

const selects = lectures
  .filter((l) => (l.groupOptions?.length ?? 0) > 1)
  .map((l) => `<label>${esc(l.title)}<select name="${esc(l.key)}"><option value="">– keine Auswahl –</option>`
    + l.groupOptions.map((o) => `<option value="${esc(o)}">Gruppe ${esc(o)}</option>`).join('')
    + `</select></label>`)
  .join('');

const [y, mo, d] = data.verifiedOn.split('-');
const verified = `${d}.${mo}.${y}`;

const css = `
:root{--bg:#f7f6f2;--card:#fff;--fg:#1d1d1f;--muted:#5f6368;--line:#dcd9d0;--accent:#0028a5;
--login-bg:#fff1dc;--login-fg:#8a4b00;--help-bg:#e6f4ea;--help-fg:#1e6b35;--type-bg:#eceae4}
@media (prefers-color-scheme:dark){:root{--bg:#141517;--card:#1e2023;--fg:#e8e8e6;--muted:#a3a7ad;--line:#33363b;
--accent:#8fb0ff;--login-bg:#3a2a12;--login-fg:#ffc987;--help-bg:#15301f;--help-fg:#8fd6a5;--type-bg:#2a2d31}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:52rem;margin:0 auto;padding:1rem}
header h1{margin:.5rem 0 0;font-size:1.6rem}
header p{margin:.2rem 0;color:var(--muted)}
#hello{font-weight:600}
a{color:var(--accent)}
code{font-size:.8em;color:var(--muted);font-weight:400}
.prefs{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:.75rem 1rem;margin:1rem 0}
.toggle{display:flex;flex-wrap:wrap;gap:.5rem;margin:.25rem 0 .5rem}
button{font:inherit;padding:.4rem .8rem;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg);cursor:pointer}
button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--card)}
button:disabled{opacity:.5;cursor:not-allowed}
details summary{cursor:pointer;font-weight:600}
form{display:grid;gap:.6rem;margin-top:.75rem}
form label{display:grid;gap:.2rem;font-size:.95rem}
input,select{font:inherit;padding:.35rem;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg);max-width:100%}
.form-actions{display:flex;flex-wrap:wrap;gap:.5rem}
.small{font-size:.85rem;color:var(--muted);margin:.25rem 0}
.legend{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;font-size:.85rem;color:var(--muted)}
.module{margin:1.75rem 0}
.module h2{font-size:1.25rem;border-bottom:2px solid var(--line);padding-bottom:.25rem}
.lecture{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:.75rem 1rem;margin:.75rem 0}
.lecture h3{margin:0 0 .4rem;font-size:1.1rem}
.kind{font-size:.75rem;font-weight:500;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:0 .5rem;vertical-align:middle}
.group,.shared{border-top:1px solid var(--line);padding:.5rem 0 .25rem}
.group h4,.shared h4{margin:0;font-size:.95rem}
.who{font-weight:400;color:var(--muted)}
.note{margin:.25rem 0;font-size:.85rem;color:var(--login-fg)}
.links{list-style:none;margin:.3rem 0;padding:0;display:grid;gap:.3rem}
.link{overflow-wrap:anywhere}
.badge{display:inline-block;font-size:.72rem;line-height:1.4;padding:0 .4rem;border-radius:4px;white-space:nowrap;vertical-align:1px}
.badge.type{background:var(--type-bg);color:var(--muted);min-width:4.6rem;text-align:center}
.badge.login{background:var(--login-bg);color:var(--login-fg)}
.t-lernhilfe .badge.type{background:var(--help-bg);color:var(--help-fg)}
.t-lernhilfe a{font-style:italic}
footer{margin:2rem 0 1rem;font-size:.85rem;color:var(--muted);border-top:1px solid var(--line);padding-top:.75rem}
`;

const js = `
(function () {
  var NAME = 'hs26prefs';
  var PATH = location.pathname.replace(/[^/]*$/, '') || '/';
  var ATTRS = '; Path=' + PATH + '; SameSite=Lax; Secure';
  var form = document.getElementById('prefs-form');
  var btnAll = document.getElementById('show-all');
  var btnMine = document.getElementById('show-mine');
  var hello = document.getElementById('hello');
  var status = document.getElementById('prefs-status');

  function read() {
    var m = document.cookie.match(/(?:^|; )hs26prefs=([^;]*)/);
    if (!m) return null;
    try {
      var p = JSON.parse(decodeURIComponent(m[1]));
      return p && typeof p.groups === 'object' && p.groups ? p : null;
    } catch (e) { return null; }
  }
  function write(p) { document.cookie = NAME + '=' + encodeURIComponent(JSON.stringify(p)) + '; Max-Age=31536000' + ATTRS; }
  function clear() { document.cookie = NAME + '=; Max-Age=0' + ATTRS; }
  function hasGroups(p) { return !!p && Object.keys(p.groups).length > 0; }

  function apply(p) {
    var mine = hasGroups(p) && !!p.onlyMine;
    document.querySelectorAll('.group').forEach(function (el) {
      var sel = p && p.groups[el.dataset.key];
      var covers = el.dataset.covers ? el.dataset.covers.split(' ') : [];
      el.hidden = !!(mine && sel && covers.length && covers.indexOf(sel) === -1);
    });
    btnMine.disabled = !hasGroups(p);
    btnMine.setAttribute('aria-pressed', String(mine));
    btnAll.setAttribute('aria-pressed', String(!mine));
    hello.textContent = p && p.name ? 'Hallo, ' + p.name : '';
    hello.hidden = !(p && p.name);
    form.elements.namedItem('displayName').value = (p && p.name) || '';
    form.querySelectorAll('select').forEach(function (s) { s.value = (p && p.groups[s.name]) || ''; });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var groups = {};
    form.querySelectorAll('select').forEach(function (s) { if (s.value) groups[s.name] = s.value; });
    var name = form.elements.namedItem('displayName').value.trim().slice(0, 40);
    if (!name && !Object.keys(groups).length) {
      clear(); apply(null); status.textContent = 'Nichts ausgewählt – Profil gelöscht.'; return;
    }
    var prev = read();
    var p = { groups: groups, onlyMine: prev ? !!prev.onlyMine : true };
    if (name) p.name = name;
    write(p); apply(p); status.textContent = 'Profil gespeichert.';
  });
  document.getElementById('prefs-clear').addEventListener('click', function () {
    clear(); apply(null); status.textContent = 'Profil gelöscht.';
  });
  btnAll.addEventListener('click', function () {
    var p = read(); if (p) { p.onlyMine = false; write(p); } apply(p);
  });
  btnMine.addEventListener('click', function () {
    var p = read(); if (!hasGroups(p)) return; p.onlyMine = true; write(p); apply(p);
  });

  document.getElementById('prefs').hidden = false;
  apply(read());
})();
`;

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex">
<title>${esc(data.title)}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%96%EF%B8%8F%3C/text%3E%3C/svg%3E">
<style>${css}</style>
</head>
<body>
<div class="wrap">
<header>
<h1>${esc(data.title)}</h1>
<p>${esc(data.subtitle)}</p>
<p id="hello" hidden></p>
</header>

<section class="prefs" id="prefs" hidden>
<div class="toggle" role="group" aria-label="Anzeige">
<button type="button" id="show-all" aria-pressed="true">Alle Gruppen</button>
<button type="button" id="show-mine" aria-pressed="false" disabled>Nur meine Gruppen</button>
</div>
<details>
<summary>Profil / Einstellungen</summary>
<p class="small">Wähle deine Gruppen, damit «Nur meine Gruppen» funktioniert. Die Auswahl wird nur als Cookie in diesem Browser gespeichert (1 Jahr). Es gibt kein Konto und keinen Server, und nichts auf dieser Seite ist privat. Auf geteilten Geräten teilen sich alle dasselbe Profil.</p>
<form id="prefs-form">
<label>Anzeigename <span class="small">(optional, nur für «Hallo, …»)</span><input name="displayName" autocomplete="off" maxlength="40"></label>
${selects}
<div class="form-actions"><button type="submit">Speichern</button><button type="button" id="prefs-clear">Profil löschen</button></div>
<p class="small" id="prefs-status" aria-live="polite"></p>
</form>
</details>
</section>

<p class="legend"><span class="badge login">🔒 edu-ID</span> Login nötig · <span class="badge type" style="background:var(--help-bg);color:var(--help-fg)">Lernhilfe</span> ergänzendes Selbststudium, keine offizielle Kursseite · Alle Links öffnen in einem neuen Tab.</p>

<main>
${data.modules.map(renderModule).join('\n')}
</main>

<footer>
<p><strong>Links zuletzt geprüft: ${verified}.</strong> Änderungen vorbehalten: UZH-Seiten wandern zwischen den Semestern, verbindlich ist das <a href="https://studentservices.uzh.ch/uzh/anonym/vvz/" target="_blank" rel="noopener noreferrer">Vorlesungsverzeichnis</a>.</p>
<p>Inoffizielle, private Linksammlung ohne Tracking und ohne externe Ressourcen. Das Cookie speichert nur die Gruppenauswahl und den optionalen Namen.</p>
</footer>
</div>
<script>${js}</script>
</body>
</html>
`;

if (jsonLinks !== renderedLinks) throw new Error(`link count mismatch: ${jsonLinks} in JSON, ${renderedLinks} rendered`);
const anchors = (html.match(/<a href=/g) ?? []).length - 1; // minus footer VVZ link
if (anchors !== renderedLinks) throw new Error(`anchor count mismatch: ${anchors} vs ${renderedLinks}`);

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), html);
writeFileSync(new URL('./dist/.nojekyll', import.meta.url), '');
console.log(`dist/index.html: ${data.modules.length} modules, ${lectures.length} lectures, `
  + `${lectures.reduce((n, l) => n + l.groups.length, 0)} group entries, ${renderedLinks} links`);
