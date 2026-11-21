// Samen spelen (#983, #429): de koppeling tussen een verhaalstap met posten en de regels van samenposten.js.
// Een stap die `posten: '<groep>'` draagt hoort bij een rij goto- en hold-stappen (de drie bolwerken van het proefbeleg, M30);
// de hold-stappen van de groep zijn de posten. Met één meespeler doet dit bestand niets: de stappen lopen precies zoals ze liepen.
// Met twee of meer meespelers (opdrachtSpelers, dus wie J zei en nog verbonden is) loopt de klok van elke post tegelijk door zodra
// er iemand staat, krijgt elke speler een eigen post en gaat de stap verder zodra de post van die stap klaar is. De rest van het
// verhaal (scènes, stemmen, beloning per speler) blijft van de gewone stappen. Wie wegvalt laat de groep aan staan met de
// overblijvers; wie later aansluit kijkt mee tot de volgende opdracht (coopmeedoen.js).
// Tests: scripts/samenposten_test.mjs (regels) en scripts/multiplayer_missionposts_test.mjs (de echte missions.js).
import { opdrachtSpelers, acteur } from './spelersregister.js';
import { maakPosten, activeer, tik, nogOpen, rolTekst, aantalKlaar } from './samenposten.js';

const fin = (x) => Number.isFinite(x);

// De stappen van een groep op volgorde: [{ s, i }].
function groepStappen(def, groep) {
  return (def.stages || []).map((s, i) => ({ s, i })).filter((q) => q.s && q.s.posten === groep);
}

// Bij het binnengaan van een stap met `posten`: maak de groep aan (eerste stap, of hervat midden in de groep).
// resolve(spec) geeft het doel van een stap als { x, y, label }.
export function postenBegin(world, def, k, chain, resolve) {
  const st = def.stages && def.stages[k];
  if (!st || !st.posten) return null;
  const rij = groepStappen(def, st.posten);
  if (!rij.length) return null;
  let g = chain.posten;
  if (g && g.groep === st.posten && g.def === def && k !== rij[0].i) return g;
  const holds = rij.filter((q) => q.s.kind === 'hold');
  const lijst = holds.map((q) => {
    const t = resolve ? resolve(q.s.target) : null;
    return t && fin(t.x) && fin(t.y) ? { id: q.i, x: t.x, y: t.y, r: q.s.radius, time: q.s.time || 6, label: (t.label || q.s.label || '') } : null;
  }).filter(Boolean);
  g = chain.posten = { groep: st.posten, def, mode: (holds[0] && holds[0].s.mode) || 'foot', s: maakPosten(lijst) };
  return g;
}

const tekstVan = (s) => (typeof s === 'string' ? s : '');

// Eén beeld. Geeft 'volgende' als de stap klaar is (de aanroeper gaat naar de volgende stap), anders null.
// modeOk(acteur, mode) is de eis van de stap (te voet); S is de staat van de lopende stap.
export function postenTik(world, def, k, chain, dt, modeOk, S) {
  const st = def.stages && def.stages[k], g = chain.posten;
  if (!st || !st.posten || !g || g.groep !== st.posten || g.def !== def) return null;
  const reg = opdrachtSpelers(world);
  if (!g.s.actief && reg.length < 2) return null; // alleen: de gewone stappen
  const spelers = reg.map((r) => ({ slot: r.slot, x: r.x, y: r.y, ok: modeOk ? modeOk(acteur(world, r), g.mode) : true }));
  if (!g.s.actief) {
    // posten die al voorbij zijn (hervat midden in de groep) staan klaar
    for (const p of g.s.posten) if (p.id < k) { p.klaar = true; p.t = p.time; g.s.n++; }
    const rollen = activeer(g.s, spelers);
    for (const rol of rollen) {
      const t = rolTekst(g.s, rol);
      if (!t) continue;
      if (rol.slot === 0) { if (world.addMessage) world.addMessage(t, 6); } else if (world.coopMeld) world.coopMeld(rol.slot, t);
    }
  }
  // de posten waarvan de stap al voorbij is, zijn klaar (de stap telde ze zelf af)
  for (const p of g.s.posten) if (!p.klaar && p.id < k) { p.klaar = true; p.t = p.time; g.s.n++; }
  for (const e of tik(g.s, spelers, dt)) {
    const p = g.s.posten[e.i];
    if (e.type === 'post' && p && world.addMessage) world.addMessage(`${tekstVan(p.label) || 'De post'} staat: ${aantalKlaar(g.s)} van ${g.s.posten.length}.`, 3);
  }
  // de post van deze stap: de eerste hold-stap op of na k
  const holdI = st.kind === 'hold' ? k : groepStappen(def, st.posten).find((q) => q.i > k && q.s.kind === 'hold')?.i;
  const post = g.s.posten.find((p) => p.id === holdI);
  if (!post) return null;
  if (post.klaar) return 'volgende';
  if (st.kind === 'hold' && S) S.hold = Math.max(S.hold || 0, post.t);
  return null;
}

// De posten die nog open staan, als punten voor de kaart en de gasten (remainingWaypoints); de post van de lopende stap hoort bij de marker zelf.
export function postenWaypoints(chain, k) {
  const g = chain && chain.posten;
  if (!g || !g.s.actief || g.s.klaar) return [];
  return nogOpen(g.s).filter((p) => p.id !== k && !(g.def.stages[k] && g.def.stages[k].kind === 'goto' && groepStappen(g.def, g.groep).find((q) => q.i > k && q.s.kind === 'hold')?.i === p.id))
    .map((p) => ({ x: p.x, y: p.y }));
}
