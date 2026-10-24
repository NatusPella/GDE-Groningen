// Samen spelen (#443): wat een speler van een wedstrijd tegen elkaar op het scherm ziet: de uitnodiging "Meedoen?" en de uitslag met een
// rematch. De tekst staat in een pure functie (kaartModel, getest in scripts/coopwedstrijd_test.mjs); alleen tekenKaart raakt de DOM.
// De race zelf (karts, camera, tussenstand) tekent kartbaan.js met hetzelfde bord als bij de solorace.
import { fmtTime } from './minigamekit.js';
import { openerNaam } from './coopplayers.js';
import { spelerNaam, verbondenGasten, gastStaat, wedGastStuur, wedOpnieuw, willenOpnieuw, uitnodigingTekst } from './coopwedstrijd.js';

const ORDINAAL = ['', '1e', '2e', '3e', '4e'];

// Wat er nu op het scherm moet: { titel, regels: [tekst], voet } of null. rol: 'host' of 'gast'.
export function kaartModel(world) {
  const n = world.coopNet; if (!n) return null;
  if (n.role === 'host') {
    const W = n.wed; if (!W) return null;
    if (W.u) {
      const regels = Object.keys(W.u.keuze).map((s) => `${spelerNaam((n.hub.roster.spelers || []).find((p) => p.slot === +s))}: ${W.u.keuze[s] === 'ja' ? 'doet mee' : W.u.keuze[s] === 'nee' ? 'doet niet mee' : 'kiest nog'}`);
      return { soort: 'uitnodiging', titel: `${W.u.label}: uitnodiging verstuurd`, regels, voet: `Nog ${Math.ceil(W.u.rest)} seconden. Druk op E bij de kassa om nu te starten.` };
    }
    if (W.uitslag) return uitslagModel(W.uitslag.rijen, W.uitslag.jij, 'host', willenOpnieuw(world).map((s) => spelerNaam((n.hub.roster.spelers || []).find((p) => p.slot === s))), verbondenGasten(world).length > 0);
    return null;
  }
  const G = world.coopWedGast; if (!G) return null;
  if (G.uitn) return { soort: 'uitnodiging', titel: 'Meedoen?', regels: [uitnodigingTekst(G.uitn, openerNaam(world.coopRoster, true))], voet: 'Wie finisht krijgt een beloning in het eigen geld.' };
  if (G.uitslag && !G.uitslag.gestopt) return uitslagModel(G.uitslag.rijen, G.uitslag.jij, 'gast', [], true, G.nogmaals);
  return null;
}
function uitslagModel(rijen, jij, rol, wie, kanOpnieuw, gevraagd = false) {
  const regels = rijen.map((x) => `${ORDINAAL[x.plek] || x.plek + 'e'}  ${x.naam}${x.ai ? ' (AI)' : ''}  ${x.tekst ? x.tekst : x.fin ? fmtTime(x.tijd) : x.weg ? 'niet meer erbij' : 'niet gefinisht'}${x.beste != null ? `  beste ronde ${fmtTime(x.beste)}` : ''}`); // x.tekst: de score van een golfronde
  let eigen = '';
  if (jij) eigen = jij.weg ? 'Je reed niet uit.' : jij.fin ? `Jij werd ${ORDINAAL[jij.plek] || jij.plek + 'e'}${jij.geld > 0 ? `: beloning €${jij.geld.toLocaleString('nl-NL')}` : ''}.` : rijen.some((x) => x.tekst) ? 'Je had niet alle banen af.' : 'Je haalde de finish niet.';
  const opnieuw = rol === 'host'
    ? (kanOpnieuw ? `J = nog een keer${wie.length ? ` (${wie.join(', ')} wil${wie.length > 1 ? 'len' : ''} ook)` : ''}, N = sluiten` : 'N = sluiten')
    : (gevraagd ? 'Je wilt nog een keer: wacht tot de race opnieuw begint. N = sluiten' : 'J = ik wil nog een keer, N = sluiten');
  return { soort: 'uitslag', titel: 'Uitslag', regels: eigen ? [...regels, eigen] : regels, voet: opnieuw };
}

// Elke frame bij elke speler (coopnet.js tickCoopNet): de toetsen J en N, het aftellen van een uitnodiging en het kaartje.
export function wedKaartTik(world, dt) {
  const n = world.coopNet, inp = world.input;
  const toets = (k) => !!(inp && inp.wasPressed && !world.paused && !world.uiPaused && inp.wasPressed(k));
  if (n && n.role === 'client') {
    const G = gastStaat(world);
    if (G.uitn) {
      G.uitn.rest -= dt;
      if (G.uitn.rest <= 0) G.uitn = null; // zonder antwoord kijk je mee; de host rekent dat zelf ook zo
      else if (toets('j')) wedGastStuur(world, 'ja');
      else if (toets('n')) wedGastStuur(world, 'nee');
    } else if (G.uitslag && !G.spiegel) {
      if (toets('j')) wedGastStuur(world, 'nogmaals');
      else if (toets('n') || toets('enter')) G.uitslag = null;
    }
  } else if (n && n.role === 'host' && n.wed && n.wed.uitslag && !n.wed.u && !n.wed.r && !n.wed.lv) {
    if (toets('j')) wedOpnieuw(world);
    else if (toets('n') || toets('enter')) n.wed.uitslag = null;
  }
  tekenKaart(kaartModel(world));
}

let el = null, laatste = '';
const CSS = `.wed-kaart{position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:55;min-width:320px;max-width:min(560px,calc(100vw - 32px));padding:14px 20px 12px;border-radius:10px;background:rgba(12,20,14,.92);color:#f0ede4;border-left:4px solid #f2b82a;font:16px/1.45 system-ui,Arial,sans-serif;pointer-events:none}
.wed-kaart b{display:block;font-size:12px;letter-spacing:3px;color:#f2b82a;text-transform:uppercase;margin-bottom:6px}
.wed-kaart p{margin:2px 0;white-space:pre-wrap}.wed-kaart em{display:block;margin-top:8px;font-style:normal;font-size:14px;color:rgba(240,237,228,.8)}`;
function tekenKaart(m) {
  if (typeof document === 'undefined') return;
  if (!m) { if (el) { el.hidden = true; laatste = ''; } return; }
  const sig = JSON.stringify(m);
  if (sig === laatste && el && !el.hidden) return;
  laatste = sig;
  if (!el) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.className = 'wed-kaart'; el.setAttribute('role', 'status');
    (document.getElementById('hud') || document.body).appendChild(el);
  }
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  el.hidden = false;
  el.innerHTML = `<b>${esc(m.titel)}</b>${m.regels.map((r) => `<p>${esc(r)}</p>`).join('')}<em>${esc(m.voet)}</em>`;
}
