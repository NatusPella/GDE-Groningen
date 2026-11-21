// De foutmelding van het beeld (showFrameError), als zeefdrukkaart. Afgesplitst uit streetpopulation.js zodat de test haar zonder
// de wereld (three) kan laden.
import { icoon } from './icons.js';
import { errorReport } from './errorlog.js';

let errorShown = false;

// De tekst van de foutmelding: wat de speler leest is kort en Nederlands; de technische melding blijft onder Details.
export function frameErrorModel(err) {
  const raw = err && err.message ? String(err.message) : String(err);
  return {
    titel: 'Er ging iets mis',
    tekst: 'Het spel loopt zo veel mogelijk door. Meld je het? Kopieer dan het foutrapport.',
    details: raw.slice(0, 400),
  };
}

async function schrijfKlembord(tekst) {
  try {
    const D = window.gdeDesktop;
    if (D && D.clipboard) { D.clipboard.writeText(tekst.slice(0, 20000)); return true; }
  } catch (e) { /* val terug op de browser */ }
  try { await navigator.clipboard.writeText(tekst); return true; } catch (e) { return false; }
}

// Eén zichtbare foutmelding per sessie, als zeefdrukkaart met rode inktrand (designsysteem): icoon, korte tekst,
// 'Kopieer foutrapport' en 'Sluiten'; de technische tekst zit onder 'Details'.
export function showFrameError(err) {
  console.error(err && err.stack ? err.stack : err);
  if (errorShown) return;
  errorShown = true;
  const m = frameErrorModel(err);
  const el = document.createElement('div');
  el.className = 'frame-error ds-zeef ds-z-kaart ds-z-kaart--probleem ds-z-kaart--recht';
  el.setAttribute('role', 'alert');
  const kop = document.createElement('div');
  kop.className = 'ds-z-kaart__kop';
  const titel = document.createElement('div');
  titel.className = 'ds-z-kaart__titel';
  titel.innerHTML = icoon('waarschuwing', { maat: 'm' });
  titel.append(m.titel);
  kop.append(titel);
  const tekst = document.createElement('p');
  tekst.className = 'frame-error__tekst';
  tekst.textContent = m.tekst;
  const det = document.createElement('details');
  det.className = 'frame-error__details';
  const sm = document.createElement('summary');
  sm.textContent = 'Details';
  const pre = document.createElement('pre');
  pre.textContent = m.details;
  det.append(sm, pre);
  const voet = document.createElement('div');
  voet.className = 'ds-z-kaart__voet';
  const kopieer = document.createElement('button');
  kopieer.type = 'button';
  kopieer.className = 'ds-z-knop ds-z-knop--secundair';
  kopieer.textContent = 'Kopieer foutrapport';
  kopieer.addEventListener('click', async () => {
    let rapport = m.details;
    try { rapport = errorReport(); } catch (e) { /* de melding zelf is genoeg */ }
    kopieer.textContent = (await schrijfKlembord(rapport)) ? 'Gekopieerd' : 'Kopiëren lukte niet';
  });
  const sluit = document.createElement('button');
  sluit.type = 'button';
  sluit.className = 'ds-z-knop ds-z-knop--secundair';
  sluit.textContent = 'Sluiten';
  sluit.addEventListener('click', () => el.remove());
  voet.append(sluit, kopieer);
  el.append(kop, tekst, det, voet);
  document.body.appendChild(el);
}
