// Samen spelen (#95): cutscenes samen bekijken, ook de openingsscène van een nieuw spel. De gastheer speelt een
// scène (playScript in cutscenehost.js) en stuurt de scène zelf mee als data (de beschrijving, de regels, het anker en
// de titelkaart); de gast speelt precies dezelfde scène op zijn eigen scherm, in zijn eigen wereld. Of de scène voor iedereen
// wordt overgeslagen bepaalt alleen de gastheer: zijn "einde" laat het filmpje bij de gasten ook stoppen. Een gast kan wel zijn eigen weergave overslaan
// (Spatie vasthouden, zoals altijd): zijn filmpje stopt, de scène van de gastheer loopt door (#434). Een betrouwbaar bericht is klein (net/codec.js
// MAX_JSON), daarom gaat de scène in stukjes. Filmpjes zonder scènebeschrijving (playCinematic met een eigen
// camerabaan) blijven de laag "De gastheer kijkt een filmpje" (coopscene.js). Puur: alleen data en een lui geladen speler.
import { isVerhaalrol, eigenVerhaalrol, andereVerhaalrol } from './cooproles.js';

export const CUT_CHUNK = 800;      // tekens per stukje (met aanhalingstekens erbij ruim onder MAX_JSON)
export const CUT_MAX_CHUNKS = 40;
export const CUT_MAX_CHARS = CUT_CHUNK * CUT_MAX_CHUNKS;

const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const tekst = (v, max = 240) => (typeof v === 'string' ? v.slice(0, max) : '');
const kaart = (c) => ({ id: tekst(c.id, 60), kicker: tekst(c.kicker), title: tekst(c.title), ...(c.cardFor != null ? { cardFor: num(c.cardFor) } : {}), ...(c.tint ? { tint: tekst(c.tint, 20) } : {}) });

// De gastheer: wat een gast nodig heeft om dezelfde scène te spelen. rol is de
// hoofdrol van de scène (#455): elke client speelt die lokaal zelf en ziet de
// andere verhaalrol als metgezel; online-avatars staan niet in de scène.
export function cutPakket({ def, lines, duration, anchor, cine, rol }) {
  return {
    def, duration: num(duration, 0),
    lines: (lines || []).map((l) => ({ speaker: l.speaker, text: l.text, at: l.at, dur: l.dur, ...(l.voice ? { voice: l.voice } : {}), ...(l.radio ? { radio: true } : {}) })),
    anchor: anchor ? { x: num(anchor.x), y: num(anchor.y), facing: num(anchor.facing), z: num(anchor.z) } : null,
    cine: kaart(cine || {}),
    ...(isVerhaalrol(rol) ? { rol } : {}),
  };
}
// In stukjes voor het net: { k: 'cut', id, n, i, d }
export function cutStukken(id, pakket) {
  const s = JSON.stringify(pakket);
  if (s.length > CUT_MAX_CHARS) return [];
  const n = Math.ceil(s.length / CUT_CHUNK), out = [];
  for (let i = 0; i < n; i++) out.push({ k: 'cut', id, n, i, d: s.slice(i * CUT_CHUNK, (i + 1) * CUT_CHUNK) });
  return out;
}
export const cutEinde = (id, overgeslagen) => ({ k: 'cutend', id, skip: !!overgeslagen });
// Een scène loopt op de tijd van elke speler zelf (per beeld een stukje); een zware wereld loopt achter. Daarom stuurt de gastheer
// elke kwart seconde zijn tijd in de scène en schuift de gast mee (cutGastTempo): iedereen ziet dezelfde regel op hetzelfde moment.
export const CUT_TIK = 0.25;       // seconden tussen twee tijdberichten
export const CUT_SPRONG = 1;        // verder uit de pas dan dit (s): de gast springt naar de tijd van de gastheer (een zwaar eerste beeld kost anders seconden)
export const CUT_EXTRA = 0.35;      // hoeveel de gast de tijd van de gastheer doortelt sinds zijn laatste bericht (s): een gastheer die haperen heeft, telt zelf niet door
export const CUT_ACHTER = 0.25;    // de gast mikt iets achter de gastheer: eindigt hij toch eerder, dan zie je even de wereld tussen twee scènes
export const cutTijd = (id, t, stil) => ({ k: 'cuttijd', id, t: Math.round(t * 100) / 100, p: stil ? 1 : 0 });
export function leesCutTijd(b) {
  if (!b || b.k !== 'cuttijd' || !Number.isInteger(b.id) || !Number.isFinite(b.t) || b.t < 0 || b.t > 600) return null;
  return { id: b.id, t: b.t, stil: b.p === 1 };
}
// De snelheid waarmee de gast zijn scène afspeelt, gegeven de tijd van de gastheer (host: { t, stil, at (ms) } zoals ontvangen) en
// zijn eigen tijd t op dit moment. delay = de reistijd van het bericht (s). Geeft { rate } of { zet } (een sprong als het te ver uit elkaar loopt).
export function cutGastTempo(host, t, nu, delay = 0) {
  if (!host) return { rate: 1 };
  if (host.stil) return { rate: 0 }; // de gastheer staat in zijn pauzemenu: de scène staat stil
  const hostNu = host.t + Math.min(CUT_EXTRA, Math.max(0, (nu - host.at) / 1000)) + delay - CUT_ACHTER;
  const verschil = hostNu - t;
  if (Math.abs(verschil) > CUT_SPRONG) return { zet: hostNu };
  return { rate: Math.max(0, Math.min(1.6, 1 + verschil * 1.5)) }; // verder dan 0,67 s voor: even stilstaan tot de gastheer er is
}

export function leesCutPakket(p, id) {
  if (!p || typeof p !== 'object' || !p.def || typeof p.def !== 'object' || !Array.isArray(p.lines) || p.lines.length > 120) return null;
  const duration = num(p.duration, 0); if (!(duration > 0 && duration < 600)) return null;
  const a = p.anchor && typeof p.anchor === 'object' ? { x: num(p.anchor.x), y: num(p.anchor.y), facing: num(p.anchor.facing), z: num(p.anchor.z) } : null;
  const lines = p.lines.map((l) => ({ speaker: tekst(l && l.speaker, 60), text: tekst(l && l.text, 400), at: num(l && l.at), dur: num(l && l.dur, 2), ...(l && typeof l.voice === 'string' ? { voice: tekst(l.voice, 200) } : {}), ...(l && l.radio ? { radio: true } : {}) }));
  return { id, def: p.def, duration, anchor: a, lines, cine: kaart(p.cine && typeof p.cine === 'object' ? p.cine : {}), ...(isVerhaalrol(p.rol) ? { rol: p.rol } : {}) };
}

// De gast: stukjes verzamelen tot de scène compleet is. Geeft het pakket (en vergeet het) zodra alles binnen is.
export function nieuwCutVerzamelaar() {
  let huidig = null;
  return {
    voegToe(b) {
      if (!b || b.k !== 'cut' || !Number.isInteger(b.id) || !Number.isInteger(b.n) || !Number.isInteger(b.i) || typeof b.d !== 'string') return null;
      if (b.n < 1 || b.n > CUT_MAX_CHUNKS || b.i < 0 || b.i >= b.n || b.d.length > CUT_CHUNK) return null;
      if (!huidig || huidig.id !== b.id || huidig.n !== b.n) huidig = { id: b.id, n: b.n, delen: new Map() };
      huidig.delen.set(b.i, b.d);
      if (huidig.delen.size < huidig.n) return null;
      let s = ''; for (let i = 0; i < huidig.n; i++) s += huidig.delen.get(i);
      const id = huidig.id; huidig = null;
      try { return leesCutPakket(JSON.parse(s), id); } catch (e) { return null; }
    },
    reset() { huidig = null; },
  };
}

// wat er met de scènes gebeurde (world.coopCutSpoor, voor de testbank en bij een melding): [tijd, wat, ...]
export function cutSpoor(w, ...wat) { if (!w) return; const l = w.coopCutSpoor || (w.coopCutSpoor = []); l.push([Date.now(), ...wat]); if (l.length > 80) l.shift(); }

// (#434) Een scène van de gastheer bestaat soms uit bedrijven (de opening uit drie). Tussen twee
// bedrijven is er bij een gast even geen filmpje: de scène van de gastheer loopt door, dus de
// andere spelers blijven nog even uit beeld in plaats van "gek mee" te lopen door de scène heen.
export const CUT_HOLD = 1.2; // s
export function cutsceneSpeelt(w, nu = Date.now()) {
  const r = w && w.coopCutRol;
  if (!r) return false;
  return !(r.tot != null && nu >= r.tot);
}
// De scène is klaar: hij geldt nog CUT_HOLD seconden (een volgend bedrijf vervangt hem meteen).
export function cutsceneKlaar(w, scène, nu = Date.now()) {
  if (!scène) return false;
  scène.tot = nu + CUT_HOLD * 1000;
  if (w && w.coopCutRol === scène) return true;
  return false;
}

// ---- de gastheer: een scène begint / eindigt
let teller = 0;
export function cutHostId() { return ++teller; }
export function cutHostStart(w, id, pakket) {
  const n = w && w.coopNet;
  if (!n || n.role !== 'host' || !n.hub) return false;
  const rol = (pakket && pakket.rol) || (w.player && w.player.character);
  const stukken = cutStukken(id, { ...pakket, ...(isVerhaalrol(rol) ? { rol } : {}) });
  if (!stukken.length) return false;
  n.cutNu = id; n.cutTikAt = null; n.cutLaatsteT = null;
  w.coopCutRol = cutsceneScene({ rol }, w.player || {}, pakket && pakket.def); // de gastheer speelt de hoofdrol lokaal zelf (#455)
  let ok = true; for (const s of stukken) ok = n.hub.announce(s) && ok;
  cutSpoor(w, 'host-start', id, stukken.length, ok);
  return ok;
}
export function cutHostTik(w, id, t, nu = Date.now()) {
  const n = w && w.coopNet;
  if (!n || n.role !== 'host' || !n.hub || n.cutNu !== id) return false;
  const stil = n.cutLaatsteT === t; n.cutLaatsteT = t; // dezelfde tijd als het vorige beeld: de gastheer staat stil (pauzemenu)
  if (n.cutTikAt != null && nu - n.cutTikAt < CUT_TIK * 1000) return false;
  n.cutTikAt = nu;
  return n.hub.announce(cutTijd(id, t, stil));
}
export function cutHostEnd(w, id, overgeslagen) {
  const n = w && w.coopNet;
  if (!n || n.role !== 'host' || !n.hub || n.cutNu !== id) return false;
  n.cutNu = null; w.coopCutRol = null;
  cutSpoor(w, 'host-einde', id, !!overgeslagen);
  return n.hub.announce(cutEinde(id, overgeslagen));
}

// ---- de gast: tempo van de scène (elk beeld, vanuit playScript)
export function cutGastTik(w, id, t, stel, nu = Date.now()) {
  const h = w && w.coopCutHost;
  if (!h || h.id !== id) return null;
  const n = w.coopNet, delay = n && n.session && Number.isFinite(n.session.rtt) ? Math.min(0.5, n.session.rtt / 2) : 0;
  const r = cutGastTempo(h, t, nu, delay);
  if (r.zet != null) stel.tijd(r.zet); else stel.tempo(r.rate);
  return r;
}

// De cinematic-opties van een gast: hij kan zijn eigen weergave overslaan (de scène van de gastheer loopt door); klaar() zet coopCutBezig weer vrij.
export const gastCine = (p, klaar) => ({ ...p.cine, cutId: p.id, skippable: true, onEnd: klaar });

// (#455) Rollen in de scène: de scène vraagt een hoofdrol (p.rol, anders de eigen
// rol). Elke client speelt die lokaal zelf; de andere verhaalrol is de metgezel en
// staat er één keer. De online-avatars van medespelers staan niet in de scène.
export function cutsceneScene(p, profiel = {}, def = null) {
  const eigen = eigenVerhaalrol(profiel);
  const hoofdrol = p && isVerhaalrol(p.rol) ? p.rol : eigen;
  const scène = { hoofdrol, eigen, tijdelijk: hoofdrol !== eigen, metgezel: andereVerhaalrol(hoofdrol), avatarsZichtbaar: false, metgezelEenmalig: true };
  if (def) { scène.verdeling = cutsceneVerdeling(def, scène); scène.defId = def.id; }
  return scène;
}

// (#434) Welke verhaalrol is een acteur van een scène? De id en het uiterlijk zeggen
// hetzelfde: 'tammo' is Tammo, 'tessa' (de id in de scènes) en 'anita' (haar id in het
// verhaal) zijn Tessa. Elke andere acteur is een omstander.
export function acteurRol(id, spec) {
  const look = spec && spec.look;
  if (isVerhaalrol(look)) return look;
  if (look === 'tessa') return 'anita';
  if (isVerhaalrol(id)) return id;
  return id === 'tessa' ? 'anita' : null;
}

// (#434) Eén rol per speler, de metgezel één keer: welke acteurs van de scène worden
// getekend? De acteur van de rol die deze speler speelt is de speler, de andere
// verhaalrol is de metgezel. Staat een rol er twee keer in (een alias of een tweede
// kopie), dan tekent alleen de eerste; de rest gaat op de verberglijst, anders danst
// er een dubbel persoon mee. Omstanders horen er gewoon bij.
export function cutsceneVerdeling(def, scène) {
  const perActeur = {}, teken = [], verberg = [], gezien = new Set();
  const spelRol = scène && isVerhaalrol(scène.hoofdrol) ? scène.hoofdrol : null;
  const metgezelRol = scène && isVerhaalrol(scène.metgezel) ? scène.metgezel : null;
  for (const [id, spec] of Object.entries((def && def.actors) || {})) {
    const rol = acteurRol(id, spec);
    if (!rol) { perActeur[id] = 'figuur'; teken.push(id); continue; }
    if (gezien.has(rol)) { perActeur[id] = 'dubbel'; verberg.push(id); continue; }
    gezien.add(rol);
    perActeur[id] = rol === spelRol ? 'speler' : rol === metgezelRol ? 'metgezel' : 'figuur';
    teken.push(id);
  }
  return { perActeur, teken, verberg, spelRol, metgezelRol };
}

// ---- de gast: de scène spelen (lui geladen: three.js en de cutscene-spelers horen niet bij het net)
export async function cutGastSpeel(w, p) {
  let m; try { m = await import('./cutscenehost.js'); } catch (e) { cutSpoor(w, 'gast-geen-speler', p.id, String(e && e.message)); return false; }
  if (!w.coopNet || w.coopRole !== 'client') { cutSpoor(w, 'gast-geen-gast', p.id); return false; }
  if (w.coopCutBezig != null && w.coopCutBezig !== p.id) { try { (await import('./cinematics.js')).skipCinematic(); } catch (e) { /* al weg */ } } // de vorige scène is bij de gastheer al klaar
  w.coopCutBezig = p.id;
  const scène = cutsceneScene(p, w.player || {}, p.def);
  w.coopCutRol = scène;
  cutSpoor(w, 'gast-rol', p.id, scène.hoofdrol, scène.eigen, !!scène.tijdelijk);
  if (!w.coopCutHost || w.coopCutHost.id !== p.id) w.coopCutHost = null; // zijn eerste tijdbericht kan al binnen zijn
  const klaar = () => { cutSpoor(w, 'gast-klaar', p.id); if (w.coopCutBezig === p.id) w.coopCutBezig = null; cutsceneKlaar(w, scène); };
  const ok = m.playScript(w, p.def, {
    lines: p.lines, duration: p.duration, anchor: p.anchor || undefined, replay: true,
    cine: gastCine(p, klaar),
  });
  cutSpoor(w, 'gast-start', p.id, !!ok);
  if (!ok) klaar();
  return ok;
}
// de gastheer slaat over (of het samen spelen stopt): het filmpje stopt ook bij de gast
export async function cutGastStop(w, id, overgeslagen) {
  cutSpoor(w, 'gast-einde-bericht', id, !!overgeslagen, w.coopCutBezig);
  if (w.coopCutBezig == null || (id != null && w.coopCutBezig !== id)) return false;
  try { const c = await import('./cinematics.js'); c.skipCinematic(); } catch (e) { /* al weg */ }
  cutsceneKlaar(w, w.coopCutRol);
  w.coopCutBezig = null;
  return true;
}
