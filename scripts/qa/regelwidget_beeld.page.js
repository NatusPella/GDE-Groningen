// Page half of scripts/qa/regelwidget_beeld.mjs (desktop --perf-script body, #987). Laadt game/js/regelwidget.js in de
// echte app en toont elke widget in elke stand, eerst met beweging en dan met 'Beweging beperken' (html.reduce-motion),
// op het donkere HUD-glas. Per stand logt hij `[capture] rw-<type>-<stand>-<beweging|statisch>` voor een screenshot en
// meet hij wat een screenshot niet zegt: de kleinste tekst, horizontale overloop, aria-rollen en het tekstalternatief.
// Raakt geen spelstaat en geen echte opslag.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const R = await import('/js/regelwidget.js');
document.body.innerHTML = '';
const wrap = document.createElement('div');
wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0c140e;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;--hud-fg:#f0ede4';
const doos = document.createElement('div');
doos.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:12px;max-width:560px';
wrap.appendChild(doos);
document.body.appendChild(wrap);

// Elke rij: [type, stand-naam, invoer]. De namen komen in de bestandsnaam van de screenshot.
const STANDEN = [
  ['limiet', 'ok', { waarde: 22, limiet: 40, label: 'Snelheid', icoon: 'meter' }],
  ['limiet', 'let-op', { waarde: 38.5, limiet: 40, label: 'Snelheid', icoon: 'meter' }],
  ['limiet', 'over', { waarde: 44, limiet: 40, label: 'Snelheid', icoon: 'meter' }],
  ['teller', 'ok', { rest: 48, totaal: 60 }],
  ['teller', 'laag', { rest: 14, totaal: 60 }],
  ['teller', 'kritiek', { rest: 4, totaal: 60 }],
  ['voorraad', 'vol', { heel: 60, totaal: 60, icoon: 'ei', label: 'Eieren' }],
  ['voorraad', 'laag', { heel: 38, totaal: 60, icoon: 'ei', label: 'Eieren' }],
  ['voorraad', 'kritiek', { heel: 20, totaal: 60, icoon: 'ei', label: 'Eieren' }],
  ['voorraad', 'pakjes', { heel: 3, totaal: 5, icoon: 'pakje', label: 'Pakjes' }],
  ['wijzer', 'ver', { afstand: 620, hoek: 0.7, label: 'Doel' }],
  ['wijzer', 'midden', { afstand: 120, hoek: -1.8, label: 'Doel' }],
  ['wijzer', 'dichtbij', { afstand: 30, hoek: 3.0, label: 'Doel' }],
  ['timing', 'buiten', { naald: 0.12, van: 0.42, tot: 0.58 }],
  ['timing', 'raak', { naald: 0.5, van: 0.42, tot: 0.58 }],
  ['toets', 'houd', { toetsen: ['A', 'D'], handeling: 'houd', label: 'Klimmen' }],
  ['toets', 'tik', { toetsen: ['E'], handeling: 'tik' }],
  ['toets', 'draai', { toetsen: ['Q', 'E'], handeling: 'draai' }],
  ['stappen', 'begin', { stappen: [{ icoon: 'ei', label: 'Ei' }, { icoon: 'zout', label: 'Zout' }, { icoon: 'meel', label: 'Meel' }], klaar: 0 }],
  ['stappen', 'midden', { stappen: [{ icoon: 'ei', label: 'Ei' }, { icoon: 'zout', label: 'Zout' }, { icoon: 'meel', label: 'Meel' }], klaar: 1 }],
  ['stappen', 'verborgen', { stappen: [{ icoon: 'ei', label: 'Ei' }, { icoon: '', label: '?' }, { icoon: '', label: '?' }], klaar: 1 }],
  ['stappen', 'legenda', { modus: 'legenda', stappen: [{ icoon: 'parasol', label: 'parasol', waarde: '+160' }, { icoon: 'kliko', label: 'kliko', waarde: '+110' }, { icoon: 'stoepbord', label: 'reclamebord', waarde: '+80' }] }],
];

const out = { fouten: [], standen: 0, kleinsteTekst: null, overloop: [], rollen: {}, beweging: {} };
for (const modus of ['beweging', 'statisch']) {
  document.documentElement.classList.toggle('reduce-motion', modus === 'statisch');
  for (const [type, naam, inv] of STANDEN) {
    doos.innerHTML = '';
    const w = R.maakWidget(type, doos, {});
    if (!w) { out.fouten.push(`${type}: geen widget`); continue; }
    Object.assign(w.inv, inv);
    w.ververs();
    await sleep(250);
    const el = w.root;
    const rol = el.getAttribute('role');
    out.rollen[`${type}-${naam}`] = rol;
    if (el.hidden || !rol || !el.getAttribute('aria-label')) out.fouten.push(`${type}-${naam}: verborgen of zonder role/aria-label`);
    // het tekstalternatief hoort bij 'Beweging beperken' zichtbaar te zijn en anders alleen op de aria
    const alt = el.querySelector('.rw-alt');
    const altZichtbaar = !!alt && alt.getBoundingClientRect().width > 4;
    if (modus === 'statisch' && !altZichtbaar) out.fouten.push(`${type}-${naam}: bij beweging beperken staat het tekstalternatief niet in beeld`);
    if (modus === 'beweging' && altZichtbaar) out.fouten.push(`${type}-${naam}: tekstalternatief staat zonder reden in beeld`);
    // beweging: draait er een animatie? Bij 'statisch' hoort er geen te lopen.
    const lopend = [el, ...el.querySelectorAll('*')].filter((n) => getComputedStyle(n).animationName !== 'none').length;
    out.beweging[`${type}-${naam}-${modus}`] = lopend;
    if (modus === 'statisch' && lopend) out.fouten.push(`${type}-${naam}: ${lopend} animaties lopen bij beweging beperken`);
    // kleinste tekst en overloop
    for (const n of [el, ...el.querySelectorAll('*')]) {
      if (![...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
      const px = parseFloat(getComputedStyle(n).fontSize);
      if (px < 13) out.fouten.push(`${type}-${naam}: tekst onder 13 px (${px}): ${n.className}`);
      if (!out.kleinsteTekst || px < out.kleinsteTekst.px) out.kleinsteTekst = { px, waar: `${type}-${naam}` };
    }
    if (el.scrollWidth > el.clientWidth + 1) out.overloop.push(`${type}-${naam}: ${el.scrollWidth} > ${el.clientWidth}`);
    out.standen++;
    console.log(`[capture] rw-${type}-${naam}-${modus}`);
    await sleep(500);
  }
}
document.documentElement.classList.remove('reduce-motion');
wrap.remove();
console.log(`[regelwidget] standen ${out.standen}, fouten ${out.fouten.length}, overloop ${out.overloop.length}`);
return JSON.stringify({ results: { regelwidget: out } });
