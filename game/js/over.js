// "Wat is er nieuw" and "Over": the changelog loader and the version-seen bookkeeping, shared by
// the pause menu's Over section and the old start screen (QA/trailer). The start screen used to own
// this; the pause menu is now the normal place, so the loader lives here.
import { VERSION } from './version.js';
import { checkWhatsNew, markVersionSeen, compareVersions } from './whatsnew.js';
import { CREDITS_HTML, LICENSES_HTML, ABOUT_HTML } from './credits.js';
import { wordCount } from './hudtext.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>');
const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>';

// Just enough Markdown for CHANGELOG.md: version headings, section headings, bullets (with
// wrapped continuation lines) and paragraphs. The title, the intro and the [Unreleased] section
// are left out (they are not in the player's version); every version becomes its own block, so a
// screen can show only the newest one or two (#612).
export function changelogVersions(md) {
  const out = [];
  let cur = null;            // { version, date, parts }
  let block = null;          // { kind: 'p' | 'li', text }
  let inList = false;
  const put = (s) => { if (cur) cur.parts.push(s); };
  const flush = () => {
    if (!block) return;
    if (block.kind === 'li') {
      if (!inList) { put('<ul>'); inList = true; }
      put(`<li>${inline(block.text)}</li>`);
    } else {
      if (inList) { put('</ul>'); inList = false; }
      put(`<p>${inline(block.text)}</p>`);
    }
    block = null;
  };
  const closeList = () => { flush(); if (inList) { put('</ul>'); inList = false; } };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const ver = line.match(/^## \[([^\]]+)\](?:\s*-\s*(.+))?/);
    if (ver) {
      closeList();
      if (ver[1].toLowerCase() === 'unreleased') { cur = null; continue; }
      const date = ver[2] ? new Date(ver[2]).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      cur = { version: ver[1], date, parts: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    const sec = line.match(/^###\s+(.+)/);
    if (sec) { closeList(); put(`<h4>${inline(sec[1])}</h4>`); continue; }
    const li = line.match(/^\s*[-*]\s+(.+)/);
    if (li) { flush(); block = { kind: 'li', text: li[1] }; continue; }
    if (!line.trim()) { flush(); continue; }
    if (block) block.text += ' ' + line.trim();
    else { if (inList) { put('</ul>'); inList = false; } block = { kind: 'p', text: line.trim() }; }
  }
  closeList();
  return out.map((v) => ({ version: v.version, date: v.date, html: v.parts.join('') }));
}

// since: the version last played; null marks only the newest version
let newsSince;
let mdPromise = null;
let versionsPromise = null;
let changelogCache = null;

// Which versions are newer than the one last played (the newest only on a first start).
function freshFn(versions) {
  if (newsSince === undefined) return () => false;
  const first = versions.length ? versions[0].version : null;
  return (v) => (newsSince ? compareVersions(v, newsSince) > 0 : v === first);
}

function versionHead(v, fresh) {
  return `<h3${fresh ? ' class="g"' : ''}>Versie ${esc(v.version)}${v.date ? `<small>${esc(v.date)}</small>` : ''}` +
    (fresh ? '<span class="m-eb g">Nieuw sinds je vorige keer</span>' : '') + '</h3>';
}

export function setNewsSince(since) {
  newsSince = since;
}

// Marks this version seen and remembers what is new; call when the Over tab opens.
export function newsOnStart() {
  const update = checkWhatsNew(VERSION);
  if (update) setNewsSince(update.since);
  markVersionSeen(VERSION);
  return update;
}

function loadMarkdown() {
  if (!mdPromise) {
    mdPromise = fetch('./CHANGELOG.md', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
      .catch(() => { mdPromise = null; return null; });
  }
  return mdPromise;
}

// The whole changelog as HTML (the old start screen's "Wat is er nieuw" and the credits page).
export function loadChangelog() {
  if (!changelogCache) {
    changelogCache = loadMarkdown().then((md) => {
      if (md === null) { changelogCache = null; return '<p>De lijst met wijzigingen kon niet worden geladen.</p>'; }
      const versions = changelogVersions(md);
      const fresh = freshFn(versions);
      return versions.map((v) => versionHead(v, fresh(v.version)) + v.html).join('');
    });
  }
  return changelogCache;
}

// The parsed versions for the Over screen (#612); null when the changelog could not be loaded.
export function loadChangelogVersions() {
  if (!versionsPromise) {
    versionsPromise = loadMarkdown().then((md) => {
      if (md === null) { versionsPromise = null; return null; }
      return changelogVersions(md);
    });
  }
  return versionsPromise;
}

// At most two versions and 270 words on the reference screen (#612): the newest version always
// shows, the one before it only while there is budget for it.
export const OVER_MAX_VERSIONS = 2;
export const OVER_MAX_WORDS = 270;
export function recentVersions(versions, { maxVersions = OVER_MAX_VERSIONS, maxWords = OVER_MAX_WORDS } = {}) {
  const out = [];
  let words = 0;
  for (const v of versions) {
    if (out.length >= maxVersions) break;
    const w = wordCount(versionHead(v, false)) + wordCount(v.html);
    if (out.length && words + w > maxWords) break;
    // Een release met heel veel regels (bijv. 0.58.0) past niet op het eerste beeld; toon een korte
    // samenvatting en laat de volledige lijst achter "Alles".
    if (!out.length && w > maxWords) {
      out.push({ ...v, html: '<p class="mut">Deze release heeft veel regels; open Alles voor de volledige lijst.</p>' });
      break;
    }
    out.push(v);
    words += w;
  }
  return out;
}

// The visible part of the Over screen: version line, the newest version(s), "Alles" (filled in
// when opened) and the two folded reference blocks. The fold bodies are left empty here, so the
// word budget of what the player sees can be measured on this HTML alone.
export function overBodyHtml(versions) {
  const fresh = freshFn(versions);
  const shown = recentVersions(versions);
  let news = shown.map((v) => versionHead(v, fresh(v.version)) + v.html).join('');
  if (!shown.length) news = '<p class="mut">Nog geen wijzigingen.</p>';
  const rest = versions.length - shown.length;
  return `<p class="mut">Versie ${esc(VERSION)} · NatusPella</p>` +
    '<h3>Wat is er nieuw</h3>' + news +
    (rest > 0 ? `<button type="button" class="m-disc" data-over-alles aria-expanded="false">${CHEV}<b>Alles</b><span class="mut">Alle ${versions.length} versies</span></button>` +
      '<div class="m-fold" data-over-alles-body hidden></div>' : '') +
    `<button type="button" class="m-disc" data-fold="over-credits" aria-expanded="false">${CHEV}<b>Credits</b><span class="mut">Kaart, muziek, stemmen en software</span></button>` +
    '<div class="m-fold" data-fold-body="over-credits" hidden></div>' +
    `<button type="button" class="m-disc" data-fold="over-licenses" aria-expanded="false">${CHEV}<b>Licenties en privacy</b><span class="mut">GPL, CC BY-NC-SA, wat het spel bewaart</span></button>` +
    '<div class="m-fold" data-fold-body="over-licenses" hidden></div>';
}

// Everything, for the "Alles" fold (loaded when the player opens it, not before).
export function allVersionsHtml(versions) {
  const fresh = freshFn(versions);
  return versions.map((v) => versionHead(v, fresh(v.version)) + v.html).join('');
}

export { CREDITS_HTML, LICENSES_HTML, ABOUT_HTML, VERSION };
