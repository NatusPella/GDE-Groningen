// "Wat is er nieuw" and "Over": the changelog loader and the version-seen bookkeeping, shared by
// the pause menu's Over tab and the old start screen (QA/trailer). The start screen used to own
// this; the pause menu is now the normal place, so the loader lives here.
import { VERSION } from './version.js';
import { checkWhatsNew, markVersionSeen, compareVersions } from './whatsnew.js';
import { ABOUT_HTML } from './credits.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>');

// Just enough Markdown for CHANGELOG.md: version headings, section headings, bullets (with
// wrapped continuation lines) and paragraphs. The title, the intro and an empty [Unreleased]
// section are left out. `fresh` marks the versions newer than the one last played.
function changelogHtml(md, fresh = () => false) {
  const out = [];
  let block = null; // { kind: 'p' | 'li', text }
  let inList = false;
  let started = false;
  const flush = () => {
    if (!block) return;
    if (block.kind === 'li') {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(block.text)}</li>`);
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p>${inline(block.text)}</p>`);
    }
    block = null;
  };
  const closeList = () => { flush(); if (inList) { out.push('</ul>'); inList = false; } };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const ver = line.match(/^## \[([^\]]+)\](?:\s*-\s*(.+))?/);
    if (ver) {
      closeList();
      started = true;
      if (ver[1].toLowerCase() === 'unreleased') { started = false; continue; }
      const date = ver[2] ? new Date(ver[2]).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const isNew = fresh(ver[1]);
      out.push(`<h3${isNew ? ' class="ss-news-new"' : ''}>Versie ${esc(ver[1])}${date ? `<small>${esc(date)}</small>` : ''}${isNew ? '<span class="ss-news-tag">Nieuw sinds je vorige keer</span>' : ''}</h3>`);
      continue;
    }
    if (!started) continue;
    const sec = line.match(/^###\s+(.+)/);
    if (sec) { closeList(); out.push(`<h4>${inline(sec[1])}</h4>`); continue; }
    const li = line.match(/^\s*[-*]\s+(.+)/);
    if (li) { flush(); block = { kind: 'li', text: li[1] }; continue; }
    if (!line.trim()) { flush(); continue; }
    if (block) block.text += ' ' + line.trim();
    else { if (inList) { out.push('</ul>'); inList = false; } block = { kind: 'p', text: line.trim() }; }
  }
  closeList();
  return out.join('');
}

// since: the version last played; null marks only the newest version
let newsSince;
let changelogCache = null;

export function setNewsSince(since) {
  newsSince = since;
  changelogCache = null;
}

// Marks this version seen and remembers what is new; call when the Over tab opens.
export function newsOnStart() {
  const update = checkWhatsNew(VERSION);
  if (update) setNewsSince(update.since);
  markVersionSeen(VERSION);
  return update;
}

export function loadChangelog() {
  if (!changelogCache) {
    let first = null;
    const fresh = newsSince === undefined ? () => false
      : (v) => {
        if (first === null) first = v;
        return newsSince ? compareVersions(v, newsSince) > 0 : v === first;
      };
    changelogCache = fetch('./CHANGELOG.md', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
      .then((md) => changelogHtml(md, fresh))
      .catch(() => { changelogCache = null; return '<p>De lijst met wijzigingen kon niet worden geladen.</p>'; });
  }
  return changelogCache;
}

export { ABOUT_HTML, VERSION };
