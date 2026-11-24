// De typografische rollen van de HUD-kaarten (DESIGN_SYSTEM.md, "HUD-kaarten: typografische rollen"): elke kaart haalt zijn
// lettergrootte uit de rollen eyebrow, titel, body, hulp en getal, nooit uit een eigen px-waarde. Pure test: leest alleen CSS.
//   node scripts/hud_typo_test.mjs
import { readFileSync } from 'node:fs';

const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
let n = 0; let fouten = 0;
const ok = (c, m) => { n++; if (!c) { fouten++; console.log('FAIL', m); } };

// Een naïeve CSS-lezer: [{ sel, body }] voor elke regel buiten @media-kopjes.
const regels = (css) => {
  const schoon = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const uit = [];
  for (const m of schoon.matchAll(/([^{}]+)\{([^{}]*)\}/g)) uit.push({ sel: m[1].trim().replace(/^@media[^{]*$/, ''), body: m[2] });
  return uit.filter((r) => r.sel && !r.sel.startsWith('@'));
};
const maten = (body) => {
  const uit = [];
  for (const m of body.matchAll(/(?:^|[;\s])font-size\s*:\s*([^;]+)/g)) uit.push(m[1].trim());
  for (const m of body.matchAll(/(?:^|[;\s])font\s*:\s*(?:(?:italic|bold|normal|\d{3})\s+)*([^/;\s]+)\//g)) uit.push(m[1].trim());
  return uit;
};
const TOEGESTAAN = /^(var\(--ds-t-kaart-(eyebrow|titel|body|hulp|getal)\)|var\(--ds-t-moment-getal\)|calc\(var\(--ds-t-moment-getal\) \* [\d.]+\)|[\d.]+em|[\d.]+%|inherit)$/;

// 1. tokens: vijf rollen met vloer 13 px, vaste regelhoogtes, ook op #hud (daar bestaat --hud-min)
const tokens = lees('game/js/ds-tokens.css');
for (const r of ['eyebrow', 'titel', 'body', 'hulp', 'getal']) {
  ok(new RegExp(`--ds-t-kaart-${r}:\\s*max\\((\\d+)px, var\\(--hud-min, 13px\\)\\)`).test(tokens), `rol ${r} heeft een vloer die met --hud-min meeschaalt`);
  const m = new RegExp(`#hud \\{[^}]*--ds-t-kaart-${r}:`).test(tokens);
  ok(m, `rol ${r} staat ook op #hud`);
}
const px = (r) => Number((new RegExp(`--ds-t-kaart-${r}:\\s*max\\((\\d+)px`).exec(tokens) || [])[1]);
ok(px('eyebrow') === 13 && px('hulp') === 13, 'eyebrow en hulp zijn 13 px');
ok(px('body') >= 15 && px('body') <= 16, 'body is 15 of 16 px');
ok(px('titel') >= 20 && px('titel') <= 22, 'titel is 20 tot 22 px');
ok(px('getal') === 28, 'getal is 28 px');
ok(px('eyebrow') < px('body') && px('body') < px('titel') && px('titel') < px('getal'), 'de rollen lopen op: eyebrow < body < titel < getal');
ok(/--ds-lh-kaart-kop:\s*1\.1/.test(tokens) && /--ds-lh-kaart-tekst:\s*1\.3/.test(tokens), 'regelhoogtes staan vast');

// 2. geen losse px in de kaart-CSS
const bronnen = [
  ['game/js/hudcards.css', () => regels(lees('game/js/hudcards.css')).filter((r) => !/hud-key/.test(r.sel))],
  ['game/js/phonefeed.css (HUD-deel)', () => regels(lees('game/js/phonefeed.css').split('Telefoon in het menu')[0]).filter((r) => /#hud/.test(r.sel))],
  ['game/js/regelwidget.css', () => regels(lees('game/js/regelwidget.css')).filter((r) => !/rw-key|kbd/.test(r.sel))],
  ['game/js/hud_panel.css (prestatietoast en muziekkaart)', () => regels(lees('game/js/hud_panel.css')).filter((r) => /ach-toast|hud-nowplaying/.test(r.sel))],
  ['game/js/achievements.js (CSS)', () => regels(lees('game/js/achievements.js').slice(lees('game/js/achievements.js').indexOf('const CSS'))).filter((r) => /ach-/.test(r.sel))],
];
for (const [naam, haal] of bronnen) {
  const rs = haal();
  ok(rs.length > 3, `${naam}: regels gelezen (${rs.length})`);
  for (const r of rs) for (const m of maten(r.body)) ok(TOEGESTAAN.test(m), `${naam}: "${r.sel.slice(0, 60)}" heeft font-size ${m}; gebruik een rol`);
}

// 3. dezelfde rol, dezelfde maat, ongeacht de kaartsoort
const alle = [...regels(lees('game/js/hudcards.css')), ...regels(lees('game/js/phonefeed.css')), ...regels(lees('game/js/hud_panel.css')), ...regels(lees('game/js/achievements.js').slice(lees('game/js/achievements.js').indexOf('const CSS')))];
const rol = (selDeel, verwacht, exact = false, zonder = null) => {
  const gevonden = alle.filter((r) => !(zonder && zonder.test(r.sel))).filter((r) => (exact ? r.sel.split(',').map((x) => x.trim()).some((x) => x.endsWith(selDeel)) : r.sel.includes(selDeel))).flatMap((r) => maten(r.body)).filter((g) => !/em$|%$/.test(g));
  ok(gevonden.length > 0 && gevonden.every((g) => g === `var(--ds-t-kaart-${verwacht})`), `${selDeel} is de rol ${verwacht} (${gevonden.join(' | ')})`);
};
rol('.hc-text small', 'eyebrow'); rol('.pf-from', 'eyebrow'); rol('.pf-speaker', 'eyebrow'); rol('.ach-kicker', 'eyebrow'); rol('.hud-nowplaying small', 'eyebrow');
rol('.hc-text b', 'titel'); rol('.pf-title', 'titel'); rol('.ach-title', 'titel'); rol('.hud-nowplaying b', 'titel'); rol('.pf-callwho b', 'titel');
rol('.hc-text span', 'body', false, /.sk-/); // de labels van de startkaart (ds3-v2): eyebrow
rol('span.sk-l', 'eyebrow'); rol('span.sk-chip', 'eyebrow'); rol('.sk-m i', 'eyebrow'); rol('.pf-body', 'body'); rol('.pf-say', 'body'); rol('.ach-desc', 'body');
rol('.pf-time', 'hulp'); rol('.pf-appnaam', 'hulp'); rol('.pf-sub', 'hulp'); rol('.hud-card .hc-close', 'hulp'); rol('.hud-nowplaying span:not(.np-ic)', 'hulp');
// de telefoonkaart schaalt zijn lange tekst niet met een eigen groot formaat
ok(!/pf-title[^}]*--ds-t-kop\b/.test(lees('game/js/phonefeed.css')), 'de nieuwskop gebruikt de titelrol, niet de 44 px-kop');
ok(!/@media[^{]*\{\s*#hud \.hc-text (b|span)/.test(lees('game/js/hudcards.css')), 'geen mediaregel zet de kaartmaat opnieuw');

// 4. de HUD zoomt mee met Tekstgrootte (a11y) en --ui
ok(/#hud \.hc-text[^}]*zoom:\s*var\(--text-scale/.test(lees('game/js/a11y.css')), 'Tekstgrootte (a11y) zoomt de kaarttekst');

console.log(`hud_typo_test: ${n} controles, ${fouten} fouten`);
process.exit(fouten ? 1 : 0);
