// Overlapdetector van de QA-sweep (#985, opdracht 20-11): vindt UI die over andere UI heen ligt of wordt afgekapt in een draaiend spel.
// Dit bestand is een bibliotheek van functiedeclaraties (zoals hoeken.page.js): overlap.mjs zet het vóór overlap_scenes.page.js
// (perf-script-body) en scripts/overlap_test.mjs laadt de pure helpers (rectSnijding, ovParen, ovTekstUit) zonder DOM.
// Niets hier raakt spelstaat of opslag.
//
// Een "vlak" (surface) is een zichtbaar kind van #hud of van body (behalve het spelcanvas) dat verf heeft (achtergrondkleur, afbeelding,
// rand, svg/img) of eigen tekst; een wikkel zonder verf of tekst wordt overgeslagen en zijn kinderen zijn de vlakken. Zo meten we de
// kaarten, chips en teksten zelf en niet de lege kolom eromheen. Per scène meldt ovScan:
//   overlap     twee vlakken (verschillende wortel, niet in elkaar) die elkaar meer dan 4 px snijden in beide richtingen; met de dekking van beide
//               (een gedimd vlak telt mee: het blijft zichtbaar) en welke boven ligt
//   buitenBeeld een vlak dat meer dan 2 px buiten het venster loopt
//   afgekapt    tekst die door overflow:hidden wordt weggeknipt zonder "…" (scrollWidth > clientWidth)
//   ellips      idem met "…" of een line-clamp: bedoeld, maar bij lange tekst gaat inhoud verloren
//   tekstUit    tekst die uit zijn eigen verfvlak steekt (meer dan 3 px) zonder dat een overflow hem wegknipt
//   filmHud     #cine is actief maar een HUD-vlak is nog zichtbaar (het "minimap en telefoonmelding achter de filmlaag"-geval)
// Beperkingen: pseudo-elementen en canvas-inhoud hebben geen eigen rect; elementen die midden in een animatie zitten krijgen hun rect van
// dat moment (de scène wacht, zie overlap_scenes.page.js).

// ---------- pure helpers ----------
// De snijding van twee rechthoeken {l,t,r,b}: { w, h } (0 als ze elkaar niet raken).
function rectSnijding(a, b) {
  const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
  return { w: Math.max(0, w), h: Math.max(0, h) };
}
// Alle paren vlakken die elkaar meer dan min px snijden. vlakken: [{ id, wortel, l, t, r, b, ... }]; vlakken met dezelfde wortel zijn één geheel.
// ouders: een functie (a, b) => true als het ene vlak in het andere zit (dan telt het niet).
function ovParen(vlakken, min = 4, ouders = () => false) {
  const uit = [];
  for (let i = 0; i < vlakken.length; i++) for (let j = i + 1; j < vlakken.length; j++) {
    const a = vlakken[i], b = vlakken[j];
    if (a.wortel === b.wortel || ouders(a, b) || ouders(b, a)) continue;
    const s = rectSnijding(a, b);
    if (s.w > min && s.h > min) uit.push({ a, b, w: Math.round(s.w), h: Math.round(s.h) });
  }
  return uit;
}
// Steekt de tekst (rect t) uit zijn verfvlak (rect v) met meer dan tol px?
function ovTekstUit(t, v, tol = 3) {
  return t.r - v.r > tol || v.l - t.l > tol || t.b - v.b > tol || v.t - t.t > tol;
}

// ---------- DOM-kant (alleen in de pagina) ----------
const OV_ZICHTBAAR = new WeakMap();
function ovZichtbaar(el) {
  if (OV_ZICHTBAAR.has(el)) return OV_ZICHTBAAR.get(el);
  let ok = true;
  for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
    const s = getComputedStyle(a);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05 || a.hidden) { ok = false; break; }
  }
  OV_ZICHTBAAR.set(el, ok);
  return ok;
}
function ovDekking(el) { // het product van de opacity van het element tot de wortel
  let o = 1; for (let a = el; a && a.nodeType === 1; a = a.parentElement) o *= parseFloat(getComputedStyle(a).opacity);
  return +o.toFixed(2);
}
function ovAlpha(c) { const m = String(c || '').match(/rgba?\(([^)]+)\)/); if (!m) return String(c) === 'transparent' ? 0 : 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; }
function ovVerf(el) {
  if (['IMG', 'SVG', 'CANVAS', 'VIDEO', 'PICTURE'].includes(el.tagName.toUpperCase())) return true;
  const s = getComputedStyle(el);
  if (ovAlpha(s.backgroundColor) > 0.1 || (s.backgroundImage && s.backgroundImage !== 'none')) return true;
  return ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none' && ovAlpha(s['border' + k + 'Color']) > 0.1);
}
function ovEigenTekst(el) { return [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim().length > 0); }
function ovTekstRect(el) {
  const r = document.createRange(); let l = Infinity, t = Infinity, rr = -Infinity, b = -Infinity;
  for (const c of el.childNodes) {
    if (c.nodeType !== 3 || !c.textContent.trim()) continue;
    r.selectNodeContents(c);
    for (const q of r.getClientRects()) { if (q.width < 1 || q.height < 1) continue; l = Math.min(l, q.left); t = Math.min(t, q.top); rr = Math.max(rr, q.right); b = Math.max(b, q.bottom); }
  }
  return l === Infinity ? null : { l, t, r: rr, b };
}
function ovNaam(el) { const id = el.id ? '#' + el.id : ''; const c = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return el.tagName.toLowerCase() + id + c; }
function ovTekstVan(el) { return (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30); }
// Het body-niveau-voorouder (voor de stapelvolgorde) en de wortel van het vlak
function ovTop(el) { let a = el; while (a.parentElement && a.parentElement !== document.body) a = a.parentElement; return a; }

// Verzamel de vlakken. Wortels: de kinderen van #hud en de overige kinderen van body.
function ovVlakken(opties = {}) {
  const vw = innerWidth, vh = innerHeight;
  const hud = document.getElementById('hud');
  const wortels = [];
  if (hud) wortels.push(...hud.children);
  for (const c of document.body.children) { if (c !== hud) wortels.push(c); }
  // de stip en de streep van een wereldlabel zijn aanwijzers, geen tekst: alleen de chip telt (de chip valt onder labelDy, de aanwijzer onder wp-weg)
  const negeerSel = opties.negeer || '.wp-dot, .wp-line';
  const uit = [], lagen = [];
  const volg = (el, wortel, diepte) => {
    if (!el || el.nodeType !== 1 || ['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE', 'NOSCRIPT', 'DEFS', 'TITLE'].includes(el.tagName.toUpperCase())) return;
    if (negeerSel && el.matches(negeerSel)) return;
    if (!el.getClientRects().length || !ovZichtbaar(el)) return;
    const verf = ovVerf(el), tekst = ovEigenTekst(el);
    const r = el.getBoundingClientRect();
    const kinderen = [...el.children];
    if (!verf && !tekst && kinderen.length && diepte < 5) { for (const k of kinderen) volg(k, k, diepte + 1); return; }
    // een wikkel zonder verf of tekst en zonder kinderen is leeg
    if (!verf && !tekst) return;
    let rect = verf ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : ovTekstRect(el);
    if (!rect || rect.r - rect.l < 1 || rect.b - rect.t < 1) return;
    const s = getComputedStyle(el);
    const heeftTekstIn = (el.textContent || '').trim().length > 0;
    const groot = (r.width * r.height) > 0.6 * vw * vh;
    // een laag over het hele scherm (verloop, vignet, achtergrond): geen vlak, wel een laag
    if (groot) { lagen.push({ el, naam: ovNaam(el), alpha: ovAlpha(s.backgroundColor), top: ovTop(el) }); return; }
    // decoratie: pointer-events none, geen tekst, geen echte afbeelding en groot of een verloop (schermranden, flitsen)
    if (!heeftTekstIn && s.pointerEvents === 'none' && (s.backgroundImage !== 'none' && /gradient/.test(s.backgroundImage)) && (r.width > vw * 0.35 || r.height > vh * 0.35)) return;
    uit.push({ el, wortel: el, verf, groep: hud && el.closest('#hud') ? ovGroep(el, hud) : ovTop(el), naam: ovNaam(el), tekst: ovTekstVan(el), l: rect.l, t: rect.t, r: rect.r, b: rect.b, dekking: ovDekking(el), top: ovTop(el), pe: s.pointerEvents });
  };
  for (const w of wortels) volg(w, w, 0);
  return { vlakken: uit, lagen };
}

function ovGroep(el, hud) { let a = el; while (a.parentElement && a.parentElement !== hud) a = a.parentElement; return a; }

// Een vlak boven een ander? Op stapelvolgorde: z-index van het body-niveau (of #hud-niveau), dan DOM-volgorde.
function ovZ(v) {
  let a = v.el; const keten = [];
  for (; a && a !== document.documentElement; a = a.parentElement) keten.push(a);
  keten.reverse();
  let z = 0;
  for (const e of keten) { const zi = parseInt(getComputedStyle(e).zIndex, 10); if (isFinite(zi)) z = zi; }
  return z;
}
function ovBoven(a, b) { // true als a boven b ligt
  const za = ovZ(a), zb = ovZ(b);
  if (za !== zb) return za > zb;
  return !!(b.el.compareDocumentPosition(a.el) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function ovScan(opties = {}) {
  const vw = innerWidth, vh = innerHeight;
  const { vlakken, lagen } = ovVlakken(opties);
  const uit = { overlap: [], buitenBeeld: [], afgekapt: [], ellips: [], tekstUit: [], filmHud: [], teller: { vlakken: vlakken.length, lagen: lagen.length } };
  const min = opties.min || 4;
  const insluit = (a, b) => a.el.contains(b.el);
  const rnd = (v) => [Math.round(v.l), Math.round(v.t), Math.round(v.r), Math.round(v.b)];
  // een vlak dat (bijna) niet te zien is (opacity < 0,1: een kaart die wegfadet) telt niet; tekst naast tekst in dezelfde HUD-groep ook niet
  // (de tekstvakken van een strakke regelafstand raken elkaar zonder dat het beeld dat doet)
  const telt = (a, b) => a.dekking >= 0.1 && b.dekking >= 0.1 && !(a.groep === b.groep && !a.verf && !b.verf);
  for (const p of ovParen(vlakken, min, insluit)) {
    if (!telt(p.a, p.b)) continue;
    const boven = ovBoven(p.a, p.b) ? p.a : p.b, onder = boven === p.a ? p.b : p.a;
    uit.overlap.push({ boven: boven.naam + ' "' + boven.tekst + '"', onder: onder.naam + ' "' + onder.tekst + '"', snijding: [p.w, p.h], bovenRect: rnd(boven), onderRect: rnd(onder), dekking: [boven.dekking, onder.dekking] });
  }
  for (const v of vlakken) {
    if (v.r > vw + 2 || v.b > vh + 2 || v.l < -2 || v.t < -2) uit.buitenBeeld.push({ el: v.naam + ' "' + v.tekst + '"', rect: rnd(v), venster: [vw, vh] });
  }
  // tekst die wordt afgekapt of uit zijn vlak steekt: alle zichtbare tekstelementen binnen de vlakken
  const gezien = new Set();
  for (const v of vlakken) {
    const lijst = [v.el, ...v.el.querySelectorAll('*')];
    for (const el of lijst) {
      if (gezien.has(el) || !ovEigenTekst(el) || !ovZichtbaar(el) || !el.getClientRects().length) continue;
      gezien.add(el);
      const s = getComputedStyle(el);
      const knipX = s.overflowX === 'hidden' || s.overflowX === 'clip', knipY = s.overflowY === 'hidden' || s.overflowY === 'clip';
      const clamp = s.webkitLineClamp && s.webkitLineClamp !== 'none';
      const vol = { el: ovNaam(el) + ' "' + ovTekstVan(el) + '"', scroll: [el.scrollWidth, el.scrollHeight], client: [el.clientWidth, el.clientHeight] };
      if (knipX && el.clientWidth > 2 && el.scrollWidth > el.clientWidth + 1 && s.display !== 'inline') {
        (s.textOverflow === 'ellipsis' ? uit.ellips : uit.afgekapt).push(vol);
      } else if (knipY && el.clientHeight > 2 && el.scrollHeight > el.clientHeight + 3) {
        (clamp ? uit.ellips : uit.afgekapt).push(vol);
      } else if (!knipX && !knipY) {
        // tekst die uit zijn eigen verfvlak steekt: het dichtstbijzijnde verfvlak is de ouder met verf (of het element zelf)
        let box = ovVerf(el) ? el : null; for (let a = el.parentElement; !box && a && a !== document.body; a = a.parentElement) if (ovVerf(a)) box = a;
        const tr = ovTekstRect(el);
        if (box && tr && box !== el.ownerDocument.documentElement) {
          const br = box.getBoundingClientRect();
          if (br.width < vw * 0.6 && ovTekstUit(tr, { l: br.left, t: br.top, r: br.right, b: br.bottom })) uit.tekstUit.push({ ...vol, tekst: [Math.round(tr.l), Math.round(tr.t), Math.round(tr.r), Math.round(tr.b)], vlak: [Math.round(br.left), Math.round(br.top), Math.round(br.right), Math.round(br.bottom)] });
        }
      }
    }
  }
  const cine = document.getElementById('cine');
  if (cine && cine.classList.contains('active')) {
    for (const v of vlakken) if (v.el.closest('#hud') && v.dekking > 0.05) uit.filmHud.push({ el: v.naam + ' "' + v.tekst + '"', rect: rnd(v), dekking: v.dekking });
  }
  return uit;
}

// Tekent een felle markering om de overlappende rechthoeken (voor een [capture]-beeld); geeft de opruimfunctie terug.
function ovMarkeer(lijst) {
  const els = [];
  for (const f of lijst) for (const r of [f.bovenRect, f.onderRect]) {
    if (!r) continue;
    const m = document.createElement('div'); m.className = 'qa-overlap-markering';
    m.style.cssText = `position:fixed;left:${r[0]}px;top:${r[1]}px;width:${r[2] - r[0]}px;height:${r[3] - r[1]}px;outline:2px solid #f0f;box-sizing:border-box;z-index:2147483647;pointer-events:none`;
    document.body.appendChild(m); els.push(m);
  }
  return () => els.forEach((m) => m.remove());
}
