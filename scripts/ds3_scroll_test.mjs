// DS3-scrollbalk (22-11): één component voor alle scrollcontainers, alles uit tokens, geen verborgen balk op verticale scrollgebieden.
//   node scripts/ds3_scroll_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { scrollSelectors } from '../game/js/dsscroll.js';
import { scrollRanden } from '../game/js/dsmicro.js';

let n = 0, fout = 0;
const ok = (c, w) => { n++; if (!c) { fout++; console.error('FOUT: ' + w); } };
const dir = new URL('../game/js/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const css = strip(fs.readFileSync(path.join(dir, 'ds-scroll.css'), 'utf8'));
const tokens = strip(fs.readFileSync(path.join(dir, 'ds-tokens.css'), 'utf8'));
const html = fs.readFileSync(path.join(dir, '..', 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(dir, 'main.js'), 'utf8');

// 1. het component
ok(/<link rel="stylesheet" href="js\/ds-scroll\.css">/.test(html), 'index.html laadt ds-scroll.css');
ok(!/#[0-9a-fA-F]{3,8}\b/.test(css) && !/rgba?\(/.test(css), 'ds-scroll.css heeft geen hexkleuren of rgb');
const breed = /--ds-scroll-breed:\s*(\d+)px/.exec(tokens);
ok(breed && +breed[1] >= 8 && +breed[1] <= 10, 'scrollbalk is dun: 8 tot 10 px (token --ds-scroll-breed)');
for (const t of ['--ds-scroll-duim', '--ds-scroll-spoor', '--ds-scroll-rond', '--ds-scroll-schaduw', '--ds-scroll-duim-hover', '--ds-scroll-fade']) ok(new RegExp(t + ':').test(tokens), 'token ' + t);
ok(/::-webkit-scrollbar-thumb \{[^}]*border-radius: var\(--ds-scroll-rond\)[^}]*box-shadow: var\(--ds-scroll-schaduw\)/.test(css), 'ronde duim met schaduw uit tokens');
ok(/::-webkit-scrollbar-thumb:hover/.test(css) && /::-webkit-scrollbar-thumb:active/.test(css), 'hover- en actief-staat');
ok(/scrollbar-width: auto !important/.test(css) && /scrollbar-color: auto !important/.test(css), 'Chromium: oude scrollbar-width en -color vallen weg (anders geen webkit-opmaak)');
ok(/@supports not selector\(::-webkit-scrollbar\)[\s\S]*scrollbar-width: thin !important[\s\S]*scrollbar-color: var\(--ds-scroll-duim\) var\(--ds-scroll-spoor\)/.test(css), 'Firefox: thin met de tokenkleuren');
ok(/data-boven="1"/.test(css) && /data-onder="1"/.test(css), 'meer-boven en meer-onder aanwijzing');
ok(/initScrollAanwijzing\(\);/.test(main) && /from '\.\/dsscroll\.js'/.test(main), 'main.js start de scrollaanwijzing');

// 2. alle CSS in game/js: geen eigen scrollbalkkleur met hex, en verborgen balken alleen op horizontale strips
const allowedHidden = /tablist|hub-stappen|ds-scroll-uit/;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.css'))) {
  const t = strip(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const m of t.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    if ((/scrollbar/.test(sel) || /scrollbar-color:[^;]*(#[0-9a-fA-F]{3,8}\b|rgba?\()/.test(body)) && /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(body)) ok(false, `${f}: scrollbalk met hexkleur of rgb in "${sel.slice(0, 60)}"`);
    if (/scrollbar-width:\s*none/.test(body) && /overflow-y:\s*auto|overflow:\s*auto/.test(body) && !allowedHidden.test(sel)) {
      // verticaal scrollgebied met verborgen balk: de globale override zet hem terug; vastleggen dat dat zo blijft
      ok(/scrollbar-width: auto !important/.test(css), `${f}: "${sel.slice(0, 50)}" verbergt de balk; ds-scroll.css moet dat terugzetten`);
    }
  }
}

// 3. alle scrollregels worden gevonden en krijgen het component
const sheet = { cssRules: [
  { selectorText: '#a .b, .c', style: { overflowY: 'auto', overflow: '' } },
  { selectorText: '.d', style: { overflowY: '', overflow: 'hidden auto' } },
  { selectorText: '.e', style: { overflowY: 'hidden', overflow: 'hidden' } },
  { selectorText: '.f::-webkit-scrollbar', style: { overflowY: 'auto' } },
  { cssRules: [{ selectorText: '.g', style: { overflowY: 'scroll' } }] },
] };
const sels = scrollSelectors([sheet]);
ok(['#a .b', '.c', '.d', '.g'].every((s) => sels.includes(s)) && !sels.includes('.e') && !sels.some((s) => s.includes('::')), 'scrollSelectors vindt overflow auto/scroll, ook in @media, en slaat pseudo en hidden over');
ok(scrollRanden({ scrollTop: 0, clientHeight: 100, scrollHeight: 300 }).onder && !scrollRanden({ scrollTop: 0, clientHeight: 100, scrollHeight: 300 }).boven, 'bovenaan: alleen meer onder');
ok(!scrollRanden({ scrollTop: 0, clientHeight: 100, scrollHeight: 101 }).onder, 'geen overflow: geen aanwijzing');

console.log(`${n - fout}/${n} ok`);
process.exit(fout ? 1 : 0);
