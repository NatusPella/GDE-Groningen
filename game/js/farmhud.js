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

let el = null, popEl = null, sleutel = '', popT = 0;
const refs = {};

function bouw() {
  if (el || typeof document === 'undefined' || !document.body || !document.createElement) return;
  el = document.createElement('section');
  el.id = 'bd-hud';
  el.className = 'bd-hud ds-z-kaart ds-z-kaart--recht';
  zetContext(el, 'farming'); // #1004
  el.setAttribute('aria-label', 'Werk op het land');
  el.hidden = true;
  el.innerHTML = '<header class="bd-hud__kop"><span class="bd-hud__icoon"></span>' +
    '<span class="bd-hud__taak ds-t-subkop"></span><span class="ds-z-chip bd-hud__veld"></span></header>' +
    '<div class="ds-z-balk ds-z-balk--rij bd-hud__voortgang" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Voortgang van de klus"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label"></span></div>' +
    '<div class="bd-hud__rij"><div class="bd-hud__snel"><span class="bd-hud__baan" aria-hidden="true"><span class="bd-hud__zone"></span><span class="bd-hud__naald"></span></span><span class="ds-t-hulp bd-hud__snelte"></span></div>' +
    '<div class="ds-z-balk ds-z-balk--rij bd-hud__diesel" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Diesel"><span class="ds-z-balk__label">Diesel</span><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label bd-hud__dieselte"></span></div>' +
    '<span class="ds-t-hulp bd-hud__lading"></span></div>' +
    '<p class="ds-t-hulp bd-hud__nu" aria-live="polite"></p>';
  document.body.appendChild(el);
  // Het opspringende getal is een eigen element naast de strook: het blijft zichtbaar als je direct uitstapt en de strook verdwijnt.
  popEl = document.createElement('span');
  popEl.className = 'bd-hud__pop ds-t-cijfer';
  popEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(popEl);
  for (const k of ['icoon', 'taak', 'veld', 'voortgang', 'diesel', 'zone', 'naald', 'snelte', 'dieselte', 'lading', 'nu']) refs[k] = el.querySelector('.bd-hud__' + k);
  refs.voortgangLabel = refs.voortgang.querySelector('.ds-z-balk__label');
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
  else if (s.taak && !s.bezig) nu = `Rij het veld op en begin: ${naam.toLowerCase()}${s.bonus ? ' · ' + s.bonus : ''}`;
  else if (s.taak) nu = staat === 'te' ? 'Gas terug: te hard werkt slordig' : staat === 'lang' ? 'Iets sneller: te langzaam werkt niet' : 'Goed bezig: blijf in de rij';
  else nu = s.lading ? 'Rij rustig naar de afnemer' : 'Koppel een werktuig met {E}';
  return {
    taak: naam, taakId: s.taak, veld: s.veld, voortgang: Math.round((s.voortgang || 0) * 100), bezig: !!s.bezig,
    dieselPct: Math.round((s.diesel || 0) * 100), dieselLaag: (s.diesel || 0) <= 0.15,
    snelheidTekst: band ? `${nl(kmu(s.snelheid))} km/u${woord ? ' · ' + woord : ` · netjes ${nl(kmu(band.vMin))} tot ${nl(kmu(band.vMax))}`}` : `${nl(kmu(s.snelheid))} km/u`,
    zoneA: band ? Math.round((band.vMin / schaal) * 100) : 0, zoneB: band ? Math.round((band.vMax / schaal) * 100) : 0, naald: Math.min(100, Math.round((s.snelheid / schaal) * 100)),
    staat, lading: s.lading ? `Lading ${nl(s.lading.kg)} kg` : '', nu,
  };
}

let rawSig = '';
// Elk beeld (boerderijwereld.js): toont of verbergt de strook en schrijft alleen bij een verschil.
export function boerderijHudTik(dt, stand) {
  if (popT > 0) { popT -= dt; if (popT <= 0 && popEl) { popEl.classList.remove('bd-pop', 'bd-pop-stil'); popEl.textContent = ''; } }
  if (!stand) { if (el && !el.hidden) el.hidden = true; return; }
  bouw();
  if (!el) return;
  if (el.hidden) el.hidden = false;
  const band = stand.band;
  const sig = `${stand.taak || ''}|${stand.veld || ''}|${Math.round((stand.voortgang || 0) * 100)}|${stand.bezig ? 1 : 0}|${Math.round((stand.diesel || 0) * 100)}|${(stand.diesel || 0) <= 0.15 ? 1 : 0}|${Math.round((stand.snelheid || 0) * 3.6)}|${band ? `${band.vMin}-${band.vMax}` : ''}|${stand.lading ? Math.round(stand.lading.kg) : -1}|${stand.bonus || ''}|${stand.nodig ? stand.nodig.join(',') : ''}`;
  if (sig === rawSig) return;
  rawSig = sig;
  const m = hudModel(stand);
  const sl = JSON.stringify(m);
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
  refs.voortgang.style.setProperty('--ds-z-w', m.voortgang + '%');
  refs.voortgangLabel.textContent = `${m.voortgang}%`;
  refs.zone.style.setProperty('--a', m.zoneA + '%'); refs.zone.style.setProperty('--b', m.zoneB + '%'); refs.naald.style.setProperty('--n', m.naald + '%');
  refs.zone.hidden = !m.zoneB;
  refs.snelte.textContent = m.snelheidTekst;
  refs.diesel.classList.toggle('ds-z-balk--laag', m.dieselLaag);
  refs.diesel.setAttribute('aria-valuenow', String(m.dieselPct));
  refs.diesel.style.setProperty('--ds-z-w', m.dieselPct + '%');
  refs.dieselte.textContent = `${m.dieselPct}%${m.dieselLaag ? ' laag' : ''}`;
  refs.lading.textContent = m.lading; refs.lading.hidden = !m.lading;
  refs.nu.textContent = m.nu;
}

// Een klus is af: een getal springt op (kleine animatie, niet bij verminderde beweging) en het UI-geluid voor iets gelukts klinkt.
export function boerderijHudKlaar(taak, fractie, uit) {
  bouw();
  const tekst = taak === 'oogsten' && uit && uit.kg ? `+${nl(uit.kg)} kg` : `${TAAK[taak] || taak}: ${Math.round((fractie || 0) * 100)}%`;
  if (popEl) {
    popEl.textContent = tekst;
    popEl.classList.remove('bd-pop', 'bd-pop-stil');
    if (reducedMotion()) popEl.classList.add('bd-pop-stil');
    else { void popEl.offsetWidth; popEl.classList.add('bd-pop'); }
    popT = 2.6;
  }
  try { sfxLinks.uiFx(taak === 'oogsten' ? 'ui_verzameld' : 'ui_loopbaan'); } catch (e) { /* geen geluid is geen ramp */ }
}

export const _hudEl = () => el;
export const _hudPopEl = () => popEl;
