// Zijmissie "De rit naar Tjalke" (#411): één keer, van een café in de stad over de A7 naar het westen, met een paar biertjes op (world.drunk, drunk.js: een lichte
// zwaai en zacht dubbelbeeld, nooit onbespeelbaar), door een met pionnen afgezette rijstrook (pionnen3d.js), met de politie erachter (het bestaande wanted-systeem:
// sterren zetten, afschudden) tot de wereld ophoudt aan de provinciegrens. De regels staan in drachtenrit.js; deze adapter zet ze om in de wereld en betaalt via
// het sidejob-contract (sidejobs.js: `once` beëindigt de dienst na de aankomst). Alleen als missie: na afloop is hij niet te herhalen.
import { dist } from './util.js';
import { spawnJobVehicle } from './sidejobkit.js';
import { addDrunk } from './drunk.js';
import { roadUnder } from './trafficlaw.js';
import { hasUnique } from './achievements.js';
import { plaatsPionnen, pionnenOmgetikt, stopPionnen } from './pionnen3d.js';
import { RIT, TEKST, VRIEND, nieuweRit, stapRit, ritResultaat, langsAfzetting, slalomPionnen } from './drachtenrit.js';

// een gewone middenklasser die de A7 aankan; mission-flags zorgt dat het verkeer er geen aanspraak op maakt
const AUTO = { kind: 'car', model: { name: 'wagon', len: 4.8, wid: 1.9, maxSpeed: 40, accel: 6, brake: 14, turnRate: 2.4, color: '#6a8fa8' } };

const km = (m) => Math.max(0, Math.round(m / 100) / 10).toString().replace('.', ',');

export default {
  id: 'tjalke',
  name: 'De rit naar Tjalke',
  color: '#c8a23c',
  glyph: 'tjalke',
  boss: VRIEND,
  kicker: 'Zijmissie',
  noIntro: false,
  allowWanted: true,
  once: true,
  vehicleWord: 'je auto',
  blurb: `Naar ${VRIEND} in Drachten, over de A7, met een paar biertjes op`,
  tagline: 'Eén keer, op eigen risico: pionnen, politie en een vriend die wacht.',
  intro: TEKST.intro,

  anchor(map) {
    const o = map.findOpenSpawn(RIT.start.x, RIT.start.y, 40);
    return { x: o ? o.x : RIT.start.x, y: o ? o.y : RIT.start.y };
  },

  start(c) {
    if (hasUnique('sjJobs', 'tjalke')) return TEKST.alGedaan;
    const v = spawnJobVehicle(c.world, c.spot.x, c.spot.y, AUTO);
    if (!v) return 'Geen auto bij het café';
    c.vehicle = v;
    return true;
  },

  needsVehicle: () => true,

  round(c) {
    const d = c.data;
    if (d.s) return;   // de ene ronde is gespeeld; het sidejob-contract beëindigt de dienst
    d.s = nieuweRit();
    d.nextTik = 0;
    d.soberT = 0;
    c.timeLeft = null;
    addDrunk(c.world, RIT.dronken);
    c.world.drunk = Math.max(c.world.drunk || 0, RIT.dronken);
    c.msg(TEKST.start, 4.5);
  },

  update(dt, c) {
    const w = c.world, p = w.player, d = c.data, v = c.vehicle;
    if (!d.s || dt <= 0) return;
    // de zwaai blijft tot de aankomst (drunk.js laat hem anders na een paar minuten uitslijten); een rit van een kwartier mag niet nuchter eindigen
    if (!d.s.klaar) {
      d.soberT -= dt;
      if (d.soberT <= 0) { d.soberT = 10; addDrunk(w, 0.0001); }
      if ((w.drunk || 0) < RIT.dronken) w.drunk = RIT.dronken;
    }
    const slalomAfstand = dist(p.x, p.y, RIT.slalom.x, RIT.slalom.y);
    // de pionnen komen er pas als de weg geladen is: dichtbij
    if (!d.pionnen && slalomAfstand < RIT.slalomZicht) {
      const rp = w.map.nearestRoadPoint ? w.map.nearestRoadPoint(RIT.slalom.x, RIT.slalom.y, 80, true) : null;
      const breedte = rp && rp.road && rp.road.width ? rp.road.width : 10.5;
      const spots = slalomPionnen(RIT.slalom, RIT.slalom.heading, breedte);
      const ground = (x, y) => (w.map.groundHeightAt ? w.map.groundHeightAt(x, y, 0) || 0 : 0);
      d.pionnen = plaatsPionnen(w, spots, ground, null);
      d.breedte = breedte;
    }
    let weg = null;
    try { weg = roadUnder(w.map, v ? v.x : p.x, v ? v.y : p.y, 0); } catch (e) { weg = null; }
    const pos = langsAfzetting({ x: p.x, y: p.y });
    const inp = {
      afstandSlalom: slalomAfstand,
      along: pos.along,
      afstandEinde: dist(p.x, p.y, RIT.einde.x, RIT.einde.y),
      wanted: w.wanted || 0,
      tikken: pionnenOmgetikt(),
      opWeg: !!(weg && weg.type === 'motorway'),
    };
    for (const e of stapRit(d.s, inp, dt)) {
      if (e.type === 'snelweg') c.msg(TEKST.snelweg, 3.5);
      else if (e.type === 'slalom-op') c.msg(TEKST.slalomOp, 4);
      else if (e.type === 'tik') c.msg(TEKST.tik[(e.n - 1) % TEKST.tik.length], 1.6);
      else if (e.type === 'slalom-klaar') c.msg(TEKST.slalomKlaar, 3.5);
      else if (e.type === 'politie') {
        w.wanted = Math.max(w.wanted || 0, e.sterren);
        w.wantedDecayTimer = 0;
        c.msg(e.ruw ? TEKST.politieRuw : TEKST.politieSchoon, 5);
      } else if (e.type === 'kwijt') {
        stopPionnen();
        c.msg(TEKST.kwijt, 3.5);
      } else if (e.type === 'nog-politie') c.msg(TEKST.nogPolitie, 3.5);
      else if (e.type === 'klaar') {
        stopPionnen();
        const r = ritResultaat(d.s);
        c.msg(TEKST.grens, 3.5);
        c.complete({ base: r.base, tip: r.tip, flawless: r.flawless, text: r.text });
        return;
      }
    }
  },

  view(c) {
    const d = c.data, p = c.world.player;
    if (!d.s) return {};
    const rest = dist(p.x, p.y, RIT.einde.x, RIT.einde.y);
    const labels = {
      stad: 'Naar de A7, richting Drachten',
      snelweg: 'Over de A7 naar het westen',
      slalom: 'Slalom door de pionnen',
      politie: 'Schud de politie af',
      grens: 'Rij door tot de provinciegrens',
      klaar: 'Aangekomen',
    };
    return {
      marker: { x: RIT.einde.x, y: RIT.einde.y },
      progress: `Tjalke · nog ${km(rest)} km${d.s.pionnen ? ` · pionnen omgetikt ${d.s.pionnen}` : ''}`,
      goal: { label: labels[d.s.fase] || 'Naar Tjalke', desc: `${VRIEND} woont in Drachten: de wereld houdt op bij de provinciegrens` },
    };
  },

  stop(c) {
    stopPionnen();
    if (c.data.s && !c.data.s.klaar) c.msg(TEKST.weg, 3);
  },
};
