// Panelmodel (21-11, DESIGN_SYSTEM.md > Panels): Boerderij als eigen rail-item met tabs en compacte veldregels.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './node3d.mjs';
const { boerderijBegonnen } = await import('../game/js/boerderijui.js');
const { veldRegelHtml } = await import('../game/js/farmcards.js');

const lees = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
let n = 0;
const t = (name, f) => { f(); n++; };

t('Boerderij is begonnen zodra er een akker is gekozen of er uren zijn gewerkt', () => {
  assert.equal(boerderijBegonnen({ perceel: null, uren: 0 }), false);
  assert.equal(boerderijBegonnen({ perceel: { x: 1, y: 2 }, uren: 0 }), true);
  assert.equal(boerderijBegonnen({ perceel: null, uren: 3 }), true);
  assert.equal(boerderijBegonnen(null), false);
});

t('een veld is één regel: icoon, naam met status, oppervlakte en de knop naar de kaart', () => {
  const html = veldRegelHtml({ id: 'zonnehoek', naam: 'Akker De Zonnehoek', statusId: 'braak', status: 'Braak', klaar: false, actief: true, ha: 2.5, gewasNaam: '', volgendeNaam: 'Ploegen', soort: 'akker', stadium: -1, groei: 0 });
  assert.match(html, /class="ds-lijst__rij bd-veldregel"/);
  assert.match(html, /2,5 ha/);
  assert.match(html, /data-bd-naar="zonnehoek"/);
  assert.doesNotMatch(html, /ds-kaart/, 'geen kaart in een lijst');
});

t('de bron: eigen rail-item onder Doen, tabs in het paneel, dynamisch label, actie in Spel en zoekvenster', () => {
  const pm = lees('game/js/pausemenu.js');
  assert.match(pm, /\['doen', 'Doen', \['verhaal', 'todo', 'loopbaan', 'boerderij', 'map'\]\]/);
  assert.doesNotMatch(pm, /const CHILD = \{[^}]*boerderij/);
  assert.match(pm, /'Begin je boerderij'/);
  assert.match(pm, /data-goto="boerderij">Boerderij<\/button>/, 'Naar mijn boerderij staat in Spel > Opslaan & stoppen');
  const ui = lees('game/js/boerderijui.js');
  assert.match(ui, /role="tab" class="m-tab" data-bd=/, 'de onderdelen zijn tabs');
  assert.match(ui, /Begin je boerderij/);
});

t('Spullen: Phosphor-pictogrammen, Enter-hint op de hoofdactie en Q/E tussen de groepen', () => {
  const sp = lees('game/js/spullen.js');
  assert.ok(sp.includes("import { icoon } from './icons.js'"));
  assert.doesNotMatch(sp, /<svg class="pm-ic"/);
  assert.match(sp, /m-kc dark">Enter/);
  assert.ok(lees('game/js/pausemenu.js').includes("if (tab === 'spullen' && cycleSpullenDelen(dir)) return;"));
});

console.log(`panelmodel_test: ${n}/${n} ok`);
