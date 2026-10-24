// Bijbaan: Overlast bij de snackbar (#400). Een groepje verzonnen jongeren met fatbikes hangt rond de snackbar van de Kroketkoning
// in de Herenstraat; de snackbarhouder vraagt je ze weg te sturen. Loop erheen, kies per poging een grappige actie (1, 2 of 3) en
// zie hoe ze reageren. De regels staan in missie_snackbar.js (puur, getest); dit is de adapter op het sidejob-contract van
// sidejobs.js, naar het voorbeeld van sidejob_boa.js. Alleen tekst, geen opname. Backspace laat de groep voor wat hij is.
import { pick, kerbSide, nearestOnStreet, namedBuildingSpot, spawnPed, pedAlive, holdPed, freePed, walkPed, say, euro } from './sidejobkit.js';
import { createChoicePanel, keycap } from './choicepanel.js';
import { SNACKBAR, MAX_POGINGEN, maakRonde, kies, rondeResultaat, voortgang } from './missie_snackbar.js';
import { dist } from './util.js';

const REACH = 4.2;
const FAR = 60;
const GIVE_UP_S = 90;
const SHOW_RESULT_S = 3.2;
const WEG_AFSTAND = 30;
const SHIRTS = ['#e0902f', '#3a7ab8', '#a05ab0', '#6a9a5a', '#d8b030', '#c04a3a'];
const KOP = 'OVERLAST BIJ DE SNACKBAR';

let panel = null;
const ensurePanel = () => panel || (panel = createChoicePanel('#e0902f'));

function closePanel(c) {
  if (panel) panel.hide();
  c.data.open = false;
}

// Het groepje staat een paar meter van de aanloop, op open grond.
function groepSpots(map, base) {
  const out = [];
  for (const [dx, dy] of [[4.2, 0.6], [5.6, -1.0], [5.0, 2.0]]) {
    const o = map.findOpenSpawn(base.x + dx, base.y + dy, 8);
    out.push(o ? { x: o.x, y: o.y } : { x: base.x + dx, y: base.y + dy });
  }
  return out;
}

export default {
  id: 'snackoverlast',
  name: 'Overlast bij de snackbar',
  color: '#e0902f',
  glyph: 'snackbar',
  boss: SNACKBAR.baas,
  kicker: 'Bijbaan',
  noIntro: false,
  allowWanted: false,
  blurb: 'Stuur de fatbikers weg bij de snackbar in de Herenstraat',
  tagline: `${SNACKBAR.zaak}: kies een grappige actie, en ze fietsen vanzelf weg. Overslaan mag altijd.`,
  intro: [
    `${SNACKBAR.zaak} belt: voor de deur hangt ${SNACKBAR.groep} met hun fatbikes, en de klanten durven niet meer naar binnen.`,
    'Niet boos worden. Praat, zet een bord neer of verzin iets. Het zijn lieve gasten, ze moeten alleen even weg.',
  ],

  // in de Herenstraat zelf; zonder die straat in de kaart bij het Stadhuis
  anchor(map) {
    const hit = nearestOnStreet(map, SNACKBAR.straat, 100, 76, 900);
    if (hit) {
      const k = kerbSide(map, hit);
      return { x: k.x, y: k.y };
    }
    const s = namedBuildingSpot(map, 'Stadhuis');
    if (s) return { x: s.x, y: s.y };
    const o = map.findOpenSpawn(100, 76, 80);
    return o ? { x: o.x, y: o.y } : { x: 100, y: 76 };
  },

  start(c) {
    c.msg(`${SNACKBAR.baas}: "Daar zijn ze weer, voor de deur. Ga maar praten."`, 3.5);
    return true;
  },

  round(c) {
    const d = c.data;
    closePanel(c);
    d.phase = 'walk';
    d.ronde = maakRonde(Math.random);
    d.flash = '';
    d.tekst = `${SNACKBAR.groep} hangt bij de snackbar, met drie fatbikes tegen de gevel.`;
    d.farFor = 0;
    d.resultT = 0;
    const spots = groepSpots(c.world.map, c.spot);
    d.peds = spots.map((s, i) => c.track(spawnPed(c.world, s.x, s.y, Math.PI + i * 0.5, { shirt: pick(SHIRTS), bag: false })));
    if (c.round === 0) c.msg('Loop op het groepje af, tot 4 meter.', 3);
  },

  update(dt, c) {
    const { world } = c;
    const d = c.data, p = world.player;
    const peds = d.peds.filter((q) => pedAlive(world, q));
    if (!peds.length) { closePanel(c); c.skip('De groep is verdwenen. Volgende.'); return; }
    const lead = peds[0];
    const dd = dist(p.x, p.y, lead.x, lead.y);
    if (d.phase !== 'weg') for (const q of peds) holdPed(q, p.x, p.y);
    if (d.phase === 'walk') {
      d.farFor = dd > FAR ? d.farFor + dt : 0;
      if (d.farFor > GIVE_UP_S) { c.skip('De groep is al doorgefietst. Volgende.'); return; }
      if (dd <= REACH && !p.inVehicle && !p.swimming) {
        d.phase = 'actie';
        say(world, lead, 'Hé, een BOA? Of een snackbarmedewerker?', 3.5);
        ensurePanel().show();
        d.open = true;
      }
      return;
    }
    world.minigameUntil = world.time + 0.25;
    const input = world.input;
    if (d.phase === 'actie') {
      const keys = ['1', '2', '3'];
      for (let i = 0; i < d.ronde.acties.length; i++) {
        if (input.wasPressed(keys[i])) { input.consume(keys[i]); keuze(c, i, lead); return; }
      }
      if (input.wasPressed('backspace') || input.wasPressed('0')) {
        input.consume('backspace'); input.consume('0');
        say(world, lead, 'Tot ziens dan maar!', 3);
        closePanel(c);
        for (const q of peds) freePed(q);
        c.skip('Groep laten voor wat hij is. Volgende.');
        return;
      }
      if (dd > REACH + 8 || p.inVehicle) { closePanel(c); d.phase = 'walk'; return; }
      paint(c);
    } else if (d.phase === 'weg') {
      d.resultT -= dt;
      // de fatbikes rijden weg: de groep loopt in een rechte lijn van de speler vandaan, sneller dan wandelen
      peds.forEach((q, i) => {
        const a = Math.atan2(q.y - p.y, q.x - p.x) + (i - 1) * 0.35;
        walkPed(world, q, q.x + Math.cos(a) * WEG_AFSTAND, q.y + Math.sin(a) * WEG_AFSTAND, 4.6, dt, 2);
      });
      paint(c);
      if (d.resultT <= 0) {
        closePanel(c);
        for (const q of peds) freePed(q);
        const r = rondeResultaat(d.ronde);
        c.complete({ base: r.base, tip: r.tip, flawless: r.flawless, text: r.text });
      }
    }
  },

  view(c) {
    const d = c.data;
    const lead = d.peds && d.peds.find((q) => pedAlive(c.world, q));
    if (!lead) return {};
    return {
      marker: d.phase === 'walk' ? { x: lead.x, y: lead.y } : null,
      progress: `Overlast ${c.streak + 1}${c.earned ? ` · verdiend ${euro(c.earned)}` : ''}`,
      goal: { label: d.phase === 'walk' ? 'De fatbikers' : 'Stuur ze weg', desc: d.phase === 'walk' ? 'Loop erheen, tot 4 meter' : 'Kies een grappige actie' },
    };
  },

  stop(c) {
    closePanel(c);
    c.msg(`${SNACKBAR.baas}: "Jammer, ze zijn er nog. Morgen maar weer."`, 3);
  },
};

function keuze(c, i, lead) {
  const d = c.data;
  const uit = kies(d.ronde, i);
  if (!uit) return;
  d.tekst = uit.tekst;
  d.flash = uit.kracht === 0 ? 'Dat werkte niet: ze vinden het geweldig' : uit.bonus ? `Goede afwisseling: +${uit.punten} punten` : `+${uit.punten} ${uit.punten === 1 ? 'punt' : 'punten'}`;
  d.slecht = uit.kracht === 0;
  say(c.world, lead, uit.tekst, 4);
  if (uit.klaar) {
    d.phase = 'weg';
    d.resultT = SHOW_RESULT_S;
  }
  paint(c);
}

function paint(c) {
  const d = c.data, r = d.ronde;
  const klaar = d.phase === 'weg';
  const options = klaar ? [] : r.acties.map((a, i) => ({ key: String(i + 1), label: a.label, note: a.note }));
  ensurePanel().set({
    kicker: `${KOP} · POGING ${Math.min(r.poging + (klaar ? 0 : 1), MAX_POGINGEN)} VAN ${MAX_POGINGEN}`,
    text: d.tekst,
    options,
    meter: { v: voortgang(r), from: null, to: null },
    flash: klaar ? (r.uitkomst === 'weg' ? 'Ze fietsen lachend weg!' : 'Ze zijn vanzelf vertrokken') : d.flash,
    bad: !klaar && !!d.slecht,
    help: klaar ? '' : `${keycap('1')}${keycap('2')}${keycap('3')} actie kiezen · ${keycap('BACKSPACE')} laat maar`,
  });
}
