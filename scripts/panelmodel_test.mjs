// Panelmodel (21-11, DESIGN_SYSTEM.md > Panels): Boerderij als eigen rail-item met tabs en compacte veldregels.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './node3d.mjs';
const { boerderijBegonnen } = await import('../game/js/boerderijui.js');
const { veldKaartHtml } = await import('../game/js/farmcards.js');

const lees = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
let n = 0;
const t = (name, f) => { f(); n++; };

t('Boerderij is begonnen zodra er een akker is gekozen of er uren zijn gewerkt', () => {
  assert.equal(boerderijBegonnen({ perceel: null, uren: 0 }), false);
  assert.equal(boerderijBegonnen({ perceel: { x: 1, y: 2 }, uren: 0 }), true);
  assert.equal(boerderijBegonnen({ perceel: null, uren: 3 }), true);
  assert.equal(boerderijBegonnen(null), false);
});

t('een veld is een kaart: stand met woord, gewas, oppervlakte, volgende stap en twee knoppen (Naar veld, Markeer op kaart)', () => {
  const html = veldKaartHtml({ id: 'zonnehoek', naam: 'Akker De Zonnehoek', statusId: 'braak', stand: 'kaal', standNaam: 'Kaal', actief: true, ha: 2.5, gewasNaam: '', planNaam: 'Aardappelen', volgende: 'Ploegen', soort: 'akker', groeit: false, groei: 0, verwachting: { kg: 1800, euro: 900 } });
  assert.match(html, /class="ds-z-kaart ds-z-kaart--recht bd-veld"/);
  assert.match(html, /2,5 ha/);
  assert.match(html, /Kaal/);
  assert.match(html, /Volgende stap/);
  assert.match(html, /<b>€900<\/b><small>ca\.<\/small>/, 'de verwachte opbrengst staat als groot getal met icoon (22-11)');
  assert.match(html, /data-bd-naar="zonnehoek" data-bd-sluit="1" aria-label="Naar veld Akker De Zonnehoek">Naar veld</, 'elke knop noemt zijn veld (schermlezer, controllerhulp)');
  assert.match(html, /data-goto="map" aria-label="Markeer Akker De Zonnehoek op kaart">Markeer op kaart</);
  assert.ok(!/role="list"/.test(lees('game/js/farmcards.js')), 'artikelen in een role=list zijn ongeldig: de container is een groep');
});

t('de bron: eigen rail-item onder Bezit, tabs in het paneel, dynamisch label, actie in Spel en zoekvenster', () => {
  const pm = lees('game/js/pausemenu.js');
  assert.match(pm, /\['doen', 'Doen', \['verhaal', 'todo', 'loopbaan', 'map'\]\]/);
  assert.match(pm, /\['bezit', 'Bezit', \['spullen', 'garage', 'boerderij'\]\]/);
  assert.match(pm, /['bezit', 'Bezit', ['spullen', 'garage', 'boerderij']]/);
  assert.doesNotMatch(pm, /const CHILD = \{[^}]*boerderij/);
  assert.match(pm, /'Begin je boerderij'/);
  assert.match(pm, /begonnen \? 'Land en bedrijf' : 'Begin je boerderij'/, 'de rail noemt het onderdeel zoals de kop van het scherm (review 22-11)');
  assert.match(pm, /\['boerderij', 'Land en bedrijf'/, 'Land en bedrijf is een eigen railrij (Spel-ontwerp 24-11: de rij Naar mijn boerderij in Opslaan en stoppen is weg)');
  const ui = lees('game/js/boerderijui.js');
  assert.match(ui, /role="tab" class="[^"]*" data-bd=/, 'de onderdelen zijn tabs'); // #1243 (wensen-m): een segmentbalk (ds-z-tab), role=tab blijft
  assert.match(ui, /Begin je boerderij/);
});

t('Spullen: Phosphor-pictogrammen, Enter-hint op de hoofdactie en Q/E tussen de groepen', () => {
  const sp = lees('game/js/spullen.js');
  assert.ok(sp.includes("import { icoon } from './icons.js'"));
  assert.doesNotMatch(sp, /<svg class="pm-ic"/);
  assert.match(sp, /\$\{glyphHtml\('ENTER'\)\}/); // de Enter-hint is een toetsplaatje (keycap.js, key_literals_test)
  assert.ok(lees('game/js/pausemenu.js').includes("if (tab === 'spullen' && cycleSpullenDelen(dir)) return;"));
});

console.log(`panelmodel_test: ${n}/${n} ok`);
