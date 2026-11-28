// The benchmark screens in Design System v3 (DESIGN_SYSTEM.md): the CHOICE screen (course, length, commentary) and the REPORT CARD (rapportkaart).
// Markup comes from the pure model (benchmarkmodel.js); styles are in ds-schermen.css (#bench-choice, #trailer-result), all on tokens. Keys sit
// in the buttons ({ENTER}, {ESC}: keycap.js), the controller walks the dialog (gamepad.js menu fallback: arrows, A), the micro-animations are
// short and switched off by reduced motion. Nothing here talks to the network: "Bewaar als bestand" writes a local text file.
import { keyTextHtml } from './keycap.js';
import { choiceModel, normaliseChoice, pickChoice, choiceKey, cardSummary, exportText, exportName } from './benchmarkmodel.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const comma = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');

// --- choice screen -----------------------------------------------------------------------------------------------

export function choiceHtml(m) {
  const radio = (g, o) => `<button type="button" role="radio" aria-checked="${o.selected}" class="bm-keuze ds-z-kaart ds-z-kaart--recht${o.selected ? ' is-gekozen' : ''}" data-groep="${g}" data-id="${o.id}"${o.disabled ? ' disabled' : ''}>
      <span class="ds-z-kaart__titel">${esc(o.label)}</span><span class="bm-sub">${esc(o.sub)}</span>${o.meta ? `<span class="ds-z-chip bm-meta">${esc(o.meta)}</span>` : ''}</button>`;
  return keyTextHtml(`<div class="bm-paneel ds-zeef ds-z-kaart ds-z-kaart--recht">
    <div class="ds-z-kaart__kop"><h2 id="bm-titel" class="ds-z-kaart__titel">${esc(m.title)}</h2><span class="ds-z-chip">${esc(m.preset)}</span></div>
    <p class="bm-lead">${esc(m.lead)}</p>
    <h3 class="bm-groepkop" id="bm-kop-route">${esc(m.courseTitle || 'Route')}</h3>
    <div class="bm-groep" role="radiogroup" aria-labelledby="bm-kop-route">${m.courses.map((o) => radio('course', o)).join('')}</div>
    <h3 class="bm-groepkop" id="bm-kop-lengte">${esc(m.lengthTitle || 'Lengte')}</h3>
    <div class="bm-groep bm-lengte" role="radiogroup" aria-labelledby="bm-kop-lengte">${m.lengths.map((o) => radio('length', o)).join('')}</div>
    ${m.lengthLocked ? `<p class="bm-hulp" data-slot="locked">${esc(m.lengthLocked)}</p>` : '<p class="bm-hulp" data-slot="locked" hidden></p>'}
    <button type="button" role="switch" class="bm-schakel ds-z-rij" aria-checked="${m.commentary.on}" data-groep="commentary"${m.commentary.available ? '' : ' disabled'}>
      <span><span class="ds-z-rij__naam">${esc(m.commentary.label)}</span><span class="ds-z-rij__sub">${esc(m.commentary.sub)}</span></span>
      <span class="ds-z-chip ${m.commentary.on && m.commentary.available ? 'ds-z-chip--succes' : 'ds-z-chip--uit'}" data-slot="commentary-chip">${m.commentary.on && m.commentary.available ? 'Aan' : 'Uit'}</span></button>
    <div class="bm-voet"><span class="bm-duur" data-slot="duur">ca. ${m.seconds} s</span>
      <button type="button" class="ds-z-knop ds-z-knop--secundair" data-act="cancel">Annuleren {ESC}</button>
      <button type="button" class="ds-z-knop" data-act="start">Start {ENTER}</button></div></div>`); // #1230: geen voetregel met dezelfde toetsen als de knoppen
}

let choiceEl = null;

// Resolves with { course, length, commentary }, or null when cancelled.
export function showBenchmarkChoice({ preset = null, presetLabel = '', initial = null } = {}) {
  if (!choiceEl) {
    choiceEl = document.createElement('div');
    choiceEl.id = 'bench-choice';
    choiceEl.setAttribute('role', 'dialog');
    choiceEl.setAttribute('aria-modal', 'true');
    choiceEl.setAttribute('aria-labelledby', 'bm-titel');
    document.body.appendChild(choiceEl);
  }
  let choice = normaliseChoice(initial || {});
  let wish = !initial || initial.commentary !== false; // the commentary switch as the player left it (see pickChoice)
  const draw = (focusSel = null) => {
    choiceEl.innerHTML = choiceHtml(choiceModel(choice, { preset, presetLabel }));
    if (focusSel) { const f = choiceEl.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
  };
  draw();
  choiceEl.hidden = false;
  document.body.classList.add('tr-result-open');
  const prevFocus = typeof document !== 'undefined' ? document.activeElement : null;
  const buttons = () => [...choiceEl.querySelectorAll('button:not([disabled])')];
  const goButton = choiceEl.querySelector('[data-act="start"]');
  goButton.focus({ preventScroll: true });
  return new Promise((resolve) => {
    const close = (v) => {
      choiceEl.hidden = true;
      document.body.classList.remove('tr-result-open');
      choiceEl.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey, true);
      if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus({ preventScroll: true });
      resolve(v);
    };
    const pick = (btn) => {
      const g = btn.dataset.groep;
      if (g !== 'course' && g !== 'length' && g !== 'commentary') return false;
      ({ choice, wish } = pickChoice(choice, wish, g, btn.dataset.id));
      draw(`[data-groep="${g}"]${g === 'commentary' ? '' : `[data-id="${btn.dataset.id}"]`}`);
      return true;
    };
    const act = (btn) => {
      if (pick(btn)) return;
      if (btn.dataset.act === 'start') close(choice);
      else if (btn.dataset.act === 'cancel') close(null);
    };
    const onClick = (e) => { const b = e.target.closest('button'); if (b && !b.disabled) act(b); };
    const onKey = (e) => {
      const list = buttons();
      const step = choiceKey(e.key, { index: list.indexOf(document.activeElement), count: list.length, shift: e.shiftKey, repeat: e.repeat });
      if (!step) return;
      if (step.cancel) close(null);
      else if (step.focus != null) list[step.focus].focus();
      else if (step.press != null) act(list[step.press]);
      e.preventDefault();
      e.stopPropagation();
    };
    choiceEl.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey, true);
  });
}

// --- the fps graph ---------------------------------------------------------------------------------------------

// Bars over the run, one per half second (the average fps of that bucket), as plain elements: the height is a custom property in percent, the
// guides at 30 and 60 fps are lines of the frame, a bar under 30 fps is marked. No colours here (ds-schermen.css has them on tokens) and no inline SVG.
export function graphHtml(series, { maxBars = 80 } = {}) {
  if (!series || series.length < 2) return '';
  const step = Math.ceil(series.length / maxBars);
  const bars = [];
  for (let i = 0; i < series.length; i += step) { const g = series.slice(i, i + step); bars.push({ fps: g.reduce((a, p) => a + p.fps, 0) / g.length, low: Math.min(...g.map((p) => p.fps)) }); }
  const top = Math.max(75, Math.ceil(Math.max(...series.map((p) => p.fps)) / 15) * 15);
  const pct = (f) => Math.round(100 * Math.min(1, f / top));
  const lo = Math.round(Math.min(...series.map((p) => p.fps))), hi = Math.round(Math.max(...series.map((p) => p.fps)));
  return `<div class="bm-grafiek" role="img" aria-label="Frames per seconde tijdens de meting: laagste ${lo}, hoogste ${hi}" style="--bm-g30:${pct(30)}%;--bm-g60:${pct(60)}%">
    <span class="bm-as bm-as--60">60</span><span class="bm-as bm-as--30">30</span>${bars.map((b) => `<i class="${b.low < 30 ? 'bm-dip' : ''}" style="--bm-h:${Math.max(2, pct(b.fps))}%"></i>`).join('')}</div>`;
}

// --- the report card -------------------------------------------------------------------------------------------

export function reportHtml(card, { first = false } = {}) {
  if (card.empty) return keyTextHtml(`<div class="tr-res ds-zeef ds-z-kaart ds-z-kaart--recht"><div class="ds-z-kaart__kop"><h2 id="tr-res-title" class="ds-z-kaart__titel">${esc(card.title)}</h2></div><p class="tr-meta">${esc(card.message)}</p>
    <div class="tr-actions"><button type="button" class="ds-z-knop" data-act="again">Nog een keer</button><button type="button" class="ds-z-knop ds-z-knop--secundair" data-act="back">Terug {ESC}</button></div></div>`);
  const cijfer = comma(card.cijfer);
  const subjectRow = (v) => `<li class="ds-z-rij bm-vak bm-vak--${v.tone}"><span><span class="ds-z-rij__naam">${esc(v.naam)}</span><span class="ds-z-rij__sub">${esc(v.sub)}</span></span><span class="bm-vakwaarde"><span class="ds-z-rij__waarde">${esc(v.waarde)}</span><span class="ds-z-chip bm-cijfer">${comma(v.cijfer)}</span></span></li>`;
  const feit = (f) => `<li class="ds-z-feit"><b class="ds-z-feit__n">${esc(f.n)}</b><span class="ds-z-feit__l">${esc(f.l)}</span></li>`;
  const cats = card.cats.map((c) => `<li class="ds-z-chip${c.id === card.weakest ? ' ds-z-chip--probleem' : ''}">${esc(c.label)} <b>${Math.round(c.fps)} fps</b>${c.id === card.weakest ? ' · laagste' : ''}</li>`).join('');
  const hit = card.hitches.length ? `<p class="bm-hulp">Haperingen: ${card.hitches.map((h) => `${esc(h.id)} (${h.frames} beelden)`).join(', ')}.</p>` : '<p class="bm-hulp">Geen scène met merkbare haperingen.</p>';
  const presets = card.presets.length ? `<ul class="bm-presets">${card.presets.map((p) => `<li class="ds-z-rij${p.current ? ' bm-nu' : ''}"><span class="ds-z-rij__naam">${esc(p.label)}${p.current ? ' (nu)' : ''}</span><span class="ds-z-rij__waarde">ca. ${Math.round(p.fps)} fps</span></li>`).join('')}</ul>` : '';
  const html = `<div class="tr-res ds-zeef ds-z-kaart ds-z-kaart--recht" aria-describedby="bm-samenvatting">
    <div class="ds-z-kaart__kop"><h2 id="tr-res-title" class="ds-z-kaart__titel">${esc(card.title)}</h2><span class="ds-z-chip">${esc(card.course)}</span>${card.size ? `<span class="ds-z-chip">${card.size[0]}×${card.size[1]}</span>` : ''}</div>
    <p id="bm-samenvatting" class="bm-samenvatting">${esc(cardSummary(card))}</p>
    <div class="bm-kop"><div class="bm-cijferblok ds-z-stempel ds-z-stempel--geel ds-z-stempel--in bm-eind--${card.tone}" aria-hidden="true"><span class="bm-groot">${cijfer}</span><span class="bm-eindlabel">${esc(card.label)}</span></div>
      <ul class="bm-vakken">${card.vakken.map(subjectRow).join('')}</ul></div>
    ${graphHtml(card.series)}
    <ul class="tr-feiten">${card.feiten.map(feit).join('')}</ul>
    ${hit}
    <p class="tr-cmp ${card.compare.verdict}">${esc(card.compare.text)}</p>
    ${cats ? `<ul class="tr-cats">${cats}</ul>` : ''}
    ${presets}
    <div class="tr-advice ds-z-kaart ds-z-kaart--bord ds-z-kaart--recht"><p class="tr-advice__kop">${card.busy ? 'Eerst nog een keer meten' : `Aanbevolen: <b>${esc(card.advice.label)}</b>`}</p><small>${esc(card.busy ? 'Je pc was misschien druk tijdens de meting. Sluit andere programma’s en meet opnieuw voordat je een stand kiest.' : card.advice.text)}</small></div>
    <div class="tr-actions">
      <button type="button" class="ds-z-knop" data-act="apply"${card.advice.apply && !card.busy ? '' : ' hidden'}>Toepassen</button>
      <button type="button" class="ds-z-knop ds-z-knop--secundair" data-act="again">Nog een keer</button>
      <button type="button" class="ds-z-knop ds-z-knop--secundair" data-act="export">Bewaar als bestand</button>
      <button type="button" class="ds-z-knop ds-z-knop--secundair" data-act="settings">Instellingen</button>
      <button type="button" class="ds-z-knop ds-z-knop--secundair" data-act="diag">Technische info kopiëren</button>
      <button type="button" class="ds-z-knop${card.advice.apply && !card.busy ? ' ds-z-knop--secundair' : ''}" data-act="back">Terug {ESC}</button>
    </div>
    <p class="tr-keys">{ARROWS} kiezen · {ENTER} ok · {ESC} terug</p></div>`;
  return keyTextHtml(html);
}

// A local text file (no network): the report as plain text. Returns true when the browser accepted the download.
export function saveReport(card, { version = '' } = {}) {
  try {
    const blob = new Blob([exportText(card, { version })], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = exportName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  } catch (e) { return false; }
}
