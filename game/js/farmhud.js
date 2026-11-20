// De HUD-strook tijdens het werken met je machine (#985): welke klus, hoe ver, hoe hard je rijdt (met de band waarin het werk netjes wordt), diesel,
// lading en wat er nog nodig is. Eén klein paneel onderin (zone C van de activiteiten), alleen zolang je in een machine van je boerderij zit.
// Dun gehouden: semantische markup, alle stijl in farm.css met alleen ds-tokens. De gegevens komen van boerderijHudStand (boerderijwereld.js);
// dit bestand is alleen DOM en bepaalt niets over het spel. Afronden geeft een opspringend getal en het bestaande UI-geluid (sfxLinks.uiFx).
import { sfxLinks } from './latehooks.js';
import { icoon } from './icons.js';
import { zetContext } from './ctxidentiteit.js';
import { reducedMotion } from './motion.js';
import { STATUS } from './farmstatus.js';

const TAAK = { ploegen: 'Ploegen', cultiveren: 'Cultiveren', zaaien: 'Zaaien', bemesten: 'Bemesten', spuiten: 'Spuiten', oogsten: 'Oogsten', afleveren: 'Afleveren' };
const TAAK_STATUS = { ploegen: 'geploegd', cultiveren: 'geploegd', zaaien: 'zaailing', bemesten: 'groeiend', spuiten: 'groeiend', oogsten: 'rijp' };
const nl = (n, d = 0) => Number(n).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const kmu = (ms) => ms * 3.6;

let el = null, sleutel = '', popT = 0;
const refs = {};

function bouw() {
  if (el || typeof document === 'undefined' || !document.body || !document.createElement) return;
  el = document.createElement('section');
  el.id = 'bd-hud';
  el.className = 'bd-hud ds-kaart';
  zetContext(el, 'farming'); // #1004
  el.setAttribute('aria-label', 'Werk op het land');
  el.hidden = true;
  el.innerHTML = '<header class="bd-hud__kop"><span class="bd-hud__icoon"></span>' +
    '<span class="bd-hud__taak ds-t-subkop"></span><span class="ds-chip bd-hud__veld"></span></header>' +
    '<div class="ds-streep bd-hud__voortgang" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Voortgang van de klus"><span class="ds-streep__baan"><span class="ds-streep__vul"></span></span><span class="ds-streep__label"></span></div>' +
    '<div class="bd-hud__rij"><div class="bd-hud__snel"><span class="bd-hud__baan" aria-hidden="true"><span class="bd-hud__zone"></span><span class="bd-hud__naald"></span></span><span class="ds-t-hulp bd-hud__snelte"></span></div>' +
    '<div class="ds-streep bd-hud__diesel" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Diesel"><span class="ds-streep__label">Diesel</span><span class="ds-streep__baan"><span class="ds-streep__vul"></span></span><span class="ds-streep__label bd-hud__dieselte"></span></div>' +
    '<span class="ds-t-hulp bd-hud__lading"></span></div>' +
    '<p class="ds-t-hulp bd-hud__nu" aria-live="polite"></p><span class="bd-hud__pop ds-t-cijfer" aria-hidden="true"></span>';
  document.body.appendChild(el);
  for (const k of ['icoon', 'taak', 'veld', 'voortgang', 'diesel', 'zone', 'naald', 'snelte', 'dieselte', 'lading', 'nu', 'pop']) refs[k] = el.querySelector('.bd-hud__' + k);
  refs.voortgangLabel = refs.voortgang.querySelector('.ds-streep__label');
}

// De tekst en maten van de strook uit een stand: puur, zodat de test (boerderijhud_test.mjs) ze zonder DOM kan nakijken.
export function hudModel(s) {
  if (!s) return null;
  const naam = s.taak ? TAAK[s.taak] || s.taak : 'Rijden';
  const band = s.band;
  const schaal = band ? Math.max(band.vMax * 1.6, 8) : 12;
  let staat = '', woord = '';
  if (band && s.bezig) {
    staat = s.snelheid > band.vMax ? 'te' : s.snelheid < band.vMin ? 'lang' : 'goed';
    woord = staat === 'te' ? 'rustig aan' : staat === 'lang' ? 'iets harder' : 'netjes';
  }
  let nu;
  if (s.nodig && s.nodig.length) nu = `Nog nodig: ${s.nodig.join(' en ')}`;
  else if (s.taak && !s.bezig) nu = `Rij het veld op en begin: ${naam.toLowerCase()}`;
  else if (s.taak) nu = staat === 'te' ? 'Gas terug: te hard werkt slordig' : staat === 'lang' ? 'Iets sneller: te langzaam werkt niet' : 'Goed bezig: blijf in de rij';
  else nu = s.lading ? 'Rij rustig naar de afnemer' : 'Koppel een werktuig met E';
  return {
    taak: naam, taakId: s.taak, veld: s.veld, voortgang: Math.round((s.voortgang || 0) * 100), bezig: !!s.bezig,
    dieselPct: Math.round((s.diesel || 0) * 100), dieselLaag: (s.diesel || 0) <= 0.15,
    snelheidTekst: band ? `${nl(kmu(s.snelheid))} km/u${woord ? ' · ' + woord : ` · netjes ${nl(kmu(band.vMin))} tot ${nl(kmu(band.vMax))}`}` : `${nl(kmu(s.snelheid))} km/u`,
    zoneA: band ? Math.round((band.vMin / schaal) * 100) : 0, zoneB: band ? Math.round((band.vMax / schaal) * 100) : 0, naald: Math.min(100, Math.round((s.snelheid / schaal) * 100)),
    staat, lading: s.lading ? `Lading ${nl(s.lading.kg)} kg` : '', nu,
  };
}

// Elk beeld (boerderijwereld.js): toont of verbergt de strook en schrijft alleen bij een verschil.
export function boerderijHudTik(dt, stand) {
  if (popT > 0) { popT -= dt; if (popT <= 0 && refs.pop) { refs.pop.classList.remove('bd-pop', 'bd-pop-stil'); refs.pop.textContent = ''; } }
  if (!stand) { if (el && !el.hidden) el.hidden = true; return; }
  bouw();
  if (!el) return;
  const m = hudModel(stand);
  const sl = JSON.stringify(m);
  if (el.hidden) el.hidden = false;
  if (sl === sleutel) return;
  sleutel = sl;
  const st = STATUS[TAAK_STATUS[m.taakId]] || STATUS.braak;
  refs.icoon.innerHTML = icoon(st.icoon, { cls: 'ds-icoon' });
  refs.taak.textContent = m.taak;
  refs.veld.textContent = m.veld || 'Geen veld';
  refs.veld.hidden = !m.veld;
  el.dataset.bezig = m.bezig ? '1' : '0';
  el.dataset.snelheid = m.staat;
  refs.voortgang.hidden = !m.bezig;
  refs.voortgang.setAttribute('aria-valuenow', String(m.voortgang));
  refs.voortgang.style.setProperty('--ds-streep-w', m.voortgang + '%');
  refs.voortgangLabel.textContent = `${m.voortgang}%`;
  refs.zone.style.setProperty('--a', m.zoneA + '%'); refs.zone.style.setProperty('--b', m.zoneB + '%'); refs.naald.style.setProperty('--n', m.naald + '%');
  refs.zone.hidden = !m.zoneB;
  refs.snelte.textContent = m.snelheidTekst;
  refs.diesel.classList.toggle('ds-streep--laag', m.dieselLaag);
  refs.diesel.setAttribute('aria-valuenow', String(m.dieselPct));
  refs.diesel.style.setProperty('--ds-streep-w', m.dieselPct + '%');
  refs.dieselte.textContent = `${m.dieselPct}%${m.dieselLaag ? ' laag' : ''}`;
  refs.lading.textContent = m.lading; refs.lading.hidden = !m.lading;
  refs.nu.textContent = m.nu;
}

// Een klus is af: een getal springt op (kleine animatie, niet bij verminderde beweging) en het UI-geluid voor iets gelukts klinkt.
export function boerderijHudKlaar(taak, fractie, uit) {
  bouw();
  const tekst = taak === 'oogsten' && uit && uit.kg ? `+${nl(uit.kg)} kg` : `${TAAK[taak] || taak}: ${Math.round((fractie || 0) * 100)}%`;
  if (refs.pop) {
    refs.pop.textContent = tekst;
    refs.pop.classList.remove('bd-pop', 'bd-pop-stil');
    if (reducedMotion()) refs.pop.classList.add('bd-pop-stil');
    else { void refs.pop.offsetWidth; refs.pop.classList.add('bd-pop'); }
    popT = 2.6;
  }
  try { sfxLinks.uiFx(taak === 'oogsten' ? 'ui_verzameld' : 'ui_loopbaan'); } catch (e) { /* geen geluid is geen ramp */ }
}

export const _hudEl = () => el;
