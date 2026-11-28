// Binnenvaartschip De Drie Zusters (#1376, W3): de wereldkant van binnenvaartrules.js.
// Een bijbaan op het sidejob-contract van sidejobs.js: de speler stapt aan de thuiskade bij het rustpunt
// aan het Van Starkenborghkanaal aan boord van een vaste spits, laadt, vaart naar een andere kade en
// legt rustig aan. Het schip is een opdrachtschip (spawnJobBoat: missionCar), dus het AI-verkeer in
// vehicle/boatwater.js telt het niet mee en ruimt het niet op.
// Aangemeld in sidejobs.js (SIDE_JOBS) en in loopbaan.js (BAAN_VAK: binnenvaart is het vak Water; VAARDIGHEDEN.water bij niveau 4): het loon en de
// punten gaan naar het vak Water, het provinciespoor van de loopbaan (boatcareer.js).
// Eindeloze modus (W4): elke overtocht is een contract uit vaarvracht.js (lading, kade van en naar, tarief per km, laad- en lostijd); het loon is het
// netto contractloon (brandstof en kadegeld gaan eraf).
// Samen spelen (W6): een baan van wie het spel opende (de stuurman). Een gast vaart mee als bemanning (BIJBAAN_REGELS.binnenvaart): aan de kade helpt E
// bij het laden en lossen (de dekhulp), tijdens het varen vertelt E iets (de gids, één keer per overtocht, extra fooi voor iedereen). Is de stuurman even
// van het roer, dan ligt het schip voor anker: de overtocht staat stil. Later aansluiten: bij de volgende baan (coopbijbaan.js laatBijbaan).

import { SCHIP, REDERIJ, THUIS, KADES, kadeById, maakOvertocht, kiesOvertocht, stapOvertocht, doelVan, voortgangTekst, zetAnker, vertelAanBoord, helpAanKade, bemanningVan } from './binnenvaartrules.js';
import { maakAanbod, leveringUitslag, laadTijd, losTijd, contractTekst, overtochtKosten, HELP_STAP_S } from './vaarvracht.js';
import { hoofdspeler } from './spelersregister.js';
import { accentVan } from './sidejobprofiel.js';
import { kadePunt } from './sidejob_zeeschip.js';
import { spawnJobBoat, vehicleSpeed } from './sidejobkit.js';
import { BOAT_KINDS } from './boattypes.js';

const MELDING = {
  tehard: 'Rustig bij de kade: een schip van 38 meter stop je niet zomaar.',
  geladen: 'Geladen. Los de trossen en vaar naar de volgende kade.',
  aangelegd: 'Aangelegd. Even blijven liggen terwijl er gelost wordt.',
  anker: 'Je laat het schip voor anker: de overtocht wacht op je.',
  loskomen: 'Anker op. Verder met de overtocht.',
};
const HULP_R = 60;       // zo dichtbij moet de dekhulp zijn om te kunnen helpen
const STIL = 1.2;        // m/s: zo langzaam ligt het schip stil genoeg om te helpen

export const BINNENVAART_ID = 'binnenvaart';
export const binnenvaart = {
  id: 'binnenvaart',
  name: `${SCHIP.naam}`,
  color: accentVan('binnenvaart'),
  glyph: 'rondvaart',
  boss: 'De kadewachter',
  vehicleWord: 'het binnenvaartschip',
  boardText: `Ga aan boord van ${SCHIP.naam}`,
  blurb: 'Een binnenvaartschip van kade naar kade over het Van Starkenborghkanaal brengen',
  tagline: REDERIJ,
  intro: [`${REDERIJ}: ${SCHIP.naam} ligt klaar aan de kade bij het rustpunt.`, 'Laad, vaar naar de volgende kade en leg rustig aan. Een schip van 38 meter stop je niet zomaar.'],
  sikkom: (c) => `${REDERIJ}: ${c.streak} overtochten zonder klacht`,

  anchor: (map) => kadePunt(map, kadeById(THUIS)),

  start(c) {
    const o = kiesOvertocht(c.level, 0, THUIS);
    const s = o && maakOvertocht(o.id, c.level);
    if (!s) return 'De overtocht begint niet';
    const boot = spawnJobBoat(c.world, c.spot.x, c.spot.y, s.koers, BOAT_KINDS.spits);
    if (!boot) return `${SCHIP.naam} ligt niet klaar`;
    boot.fixedName = SCHIP.naam;
    boot.jobShip = SCHIP.id;
    c.vehicle = boot;
    c.data.beurt = 0;
    c.data.vanKade = THUIS;
    return true;
  },

  needsVehicle: () => true,

  round(c) {
    const d = c.data;
    const van = d.vanKade || THUIS;
    // het aanbod van deze kade (vaarvracht.js): de baan neemt er per ronde één van, zodat elk goed langskomt; zonder aanbod de gewone overtocht
    const aanbod = maakAanbod((c.round + 1) * 7919 + (d.beurt || 0) * 131, van, c.level);
    const contract = aanbod.length ? aanbod[(d.beurt || 0) % aanbod.length] : null;
    const o = contract ? { id: contract.overtocht } : kiesOvertocht(c.level, d.beurt || 0, van);
    const s = o && maakOvertocht(o.id, c.level, contract ? { ladenS: laadTijd(contract), lossenS: losTijd(contract) } : {});
    if (!s) return;
    d.overtocht = s;
    d.contract = contract;
    d.crew = d.crew || [];
    d.beurt = (d.beurt || 0) + 1;
    c.timeLeft = s.budget;
    c.msg(contract ? `${REDERIJ}: ${contractTekst(contract)}. Laden bij ${kadeById(s.van).naam}.` : `${REDERIJ}: ${kadeById(s.van).naam} naar ${kadeById(s.naar).naam}.`, 4);
    if (contract) c.msg(`Kosten van de overtocht: brandstof €${overtochtKosten(contract.afstandKm).brandstof} en kadegeld €${overtochtKosten(contract.afstandKm).kadegeld}; die gaan van het loon af.`, 3.5);
  },

  update(dt, c) {
    const d = c.data, v = c.vehicle, s = d.overtocht;
    if (!s || !v || dt <= 0) return;
    // voor anker: is de stuurman na het aan boord gaan van het roer, dan staat de overtocht stil (niets mislukt, niets wordt betaald voor wachten)
    const p = c.world ? hoofdspeler(c.world) : null, aanRoer = !!p && (p.inVehicle || p.inVeh) === v;
    if (aanRoer) d.aanBoord = true;
    if (p && d.aanBoord && !aanRoer) {
      if (zetAnker(s, true) && !d.ankerMelding) { c.msg(MELDING.anker, 3); d.ankerMelding = true; }
      v.speed = 0;
      return;
    }
    if (s.anker) { zetAnker(s, false); d.ankerMelding = false; c.msg(MELDING.loskomen, 2.4); }
    for (const e of stapOvertocht(s, { x: v.x, y: v.y, speed: vehicleSpeed(v) }, dt)) {
      if (e.type === 'tehard' && !d.melding) { c.msg(MELDING.tehard, 2.4); d.melding = 4; }
      if (e.type === 'geladen') c.msg(MELDING.geladen, 3);
      if (e.type === 'aangelegd') c.msg(MELDING.aangelegd, 3);
      if (e.type === 'fail') { c.fail(e.why); return; }
      if (e.type === 'klaar') {
        d.vanKade = s.naar;
        const r = leveringUitslag(d.contract, s);
        if (r.failed) c.fail(r.text);
        else c.complete({ base: r.base, tip: r.tip, flawless: r.flawless, text: r.text });
        return;
      }
    }
    d.melding = Math.max(0, (d.melding || 0) - dt);
    if (Number.isFinite(c.timeLeft)) c.timeLeft = Math.max(0, s.budget - s.t);
  },

  view(c) {
    const s = c.data.overtocht;
    if (!s) return {};
    const d = doelVan(s);
    return {
      marker: { x: d.x, y: d.y },
      progress: voortgangTekst(s),
      goal: { label: d.label, desc: 'Vaar rustig: bij de kade geldt een lage limiet.' },
    };
  },

  // Samen spelen (W6): een meespelende gast is bemanning. Aan de kade helpt E bij het laden en lossen (dekhulp), onder het varen vertelt E iets (gids).
  helperActie(c, h) {
    const d = c.data, v = c.vehicle, s = d.overtocht;
    if (!s || !v || !h || !Number.isFinite(h.x) || !Number.isFinite(h.y)) return false;
    if (Math.hypot(h.x - v.x, h.y - v.y) > HULP_R) return false;
    d.crew = d.crew || [];
    if (!d.crew.includes(h.slot)) d.crew.push(h.slot);
    const rol = bemanningVan(d.crew, 0)[h.slot] || 'bemanning';
    if (s.fase === 'varen') {
      if (!vertelAanBoord(s)) return false;
      c.msg(`${rol === 'gids' ? 'De gids' : 'De bemanning'} vertelt over het kanaal: de passagiers van de kade klappen. Extra fooi voor iedereen.`, 3);
      return true;
    }
    if (vehicleSpeed(v) > STIL) return false;
    const nieuw = helpAanKade(s, HELP_STAP_S);
    if (nieuw === null) return false;
    c.msg(`${rol === 'dekhulp' ? 'De dekhulp' : 'De bemanning'} pakt mee: ${s.fase === 'laden' ? 'laden' : 'lossen'} nog ${Math.ceil(nieuw)} s.`, 2.2);
    return true;
  },

  timeout: () => 'de kadewachter staat niet langer te wachten',

  stop() {},
};

export const BINNENVAART_KADES = KADES;
