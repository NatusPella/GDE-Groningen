// Cutscene-kwaliteitssysteem, laag 3: de beeldmetingen als pure functies (geen Electron, geen THREE, geen bestanden).
// scripts/ui/cutscene_render.mjs speelt elke cutscene in Electron af en legt per frame een "record" vast (camera, spreker,
// ondertitelrechthoek, kijkstralen) plus de pixels van het screenshot; dit bestand beoordeelt dat. De tests
// (scripts/cutscene_measure_test.mjs) en simulateRecords() draaien dezelfde meetcode op de pure scène zonder game.
//
// Record: { cutscene, shot, phase: 'b' | 'm' | 'e', t, camera: { position: {x,y,z}, lookAt: {x,y,z}, fov },
//           speaker: { id, name, rect: { x, y, w, h } | null, inFrame, depth } | null, subtitle: { rect, text } | null,
//           hud: [rect], near: { hits, minD } | null, clip: boolean | null, pixels: { mean, std, dark, bright } | null }
// Schermmaten in pixels (w x h); rect = { x, y, w, h } met de oorsprong linksboven.
// Regel-ID's: CS-R01 .. CS-R07 (voorlopig, zie scripts/lib/cutscene_lint.mjs RULES).

export const MEET = {
  zwart: { mean: 8, std: 5 }, // gemiddelde luma onder 8 en vrijwel geen spreiding: zwart beeld
  leeg: { std: 3 }, // geen spreiding: een effen vlak (lege lucht, lens in een muur)
  sprong: { belangrijk: 70, blokkerend: 110 }, // luma-sprong (0-255) tussen twee shots
  overlap: 0.25, // ondertitel over meer dan dit deel van de spreker
  nadichtbij: 1.3, // m: een kijkstraal die hier iets raakt, vult het beeld
  bevroren: 3.0, // s: de camera beweegt niet terwijl de scène doorloopt
};

// ---------------------------------------------------------------- projectie

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a) => { const l = Math.hypot(a.x, a.y, a.z) || 1e-9; return { x: a.x / l, y: a.y / l, z: a.z / l }; };

// Een punt (x, y horizontaal, z omhoog) naar schermpixels voor een camera { position, lookAt, fov (verticaal, graden) }.
// depth is de afstand langs de kijkrichting; inFront is false achter de camera.
export function projectPoint(cam, p, w = 1600, h = 900) {
  const fwd = norm(sub(cam.lookAt, cam.position));
  let right = cross(fwd, { x: 0, y: 0, z: 1 });
  if (Math.hypot(right.x, right.y, right.z) < 1e-6) right = { x: 1, y: 0, z: 0 }; // recht omhoog of omlaag: kies een as
  right = norm(right);
  const up = cross(right, fwd);
  const d = sub(p, cam.position);
  const depth = dot(d, fwd);
  if (!(depth > 0.01)) return { x: NaN, y: NaN, depth, inFront: false, onScreen: false };
  const f = 1 / Math.tan((cam.fov * Math.PI) / 360);
  const nx = (dot(d, right) / depth) * f / (w / h), ny = (dot(d, up) / depth) * f;
  const x = (nx * 0.5 + 0.5) * w, y = (0.5 - ny * 0.5) * h;
  return { x, y, depth, inFront: true, onScreen: x >= 0 && x <= w && y >= 0 && y <= h };
}

// Het scherm-rechthoek van een figuur: voeten, hoofd en schouderbreedte. null als hij achter de camera staat.
export function actorRect(cam, a, w = 1600, h = 900, hoogte = 1.75) {
  const z0 = a.h || 0;
  const top = projectPoint(cam, { x: a.x, y: a.y, z: z0 + (a.sit ? a.sit + 0.75 : hoogte) }, w, h);
  const bot = projectPoint(cam, { x: a.x, y: a.y, z: z0 + (a.sit ? a.sit : 0) }, w, h);
  if (!top.inFront && !bot.inFront) return null;
  const hy = Number.isFinite(top.y) ? top.y : -h, by = Number.isFinite(bot.y) ? bot.y : h * 2;
  const hoogtePx = Math.abs(by - hy);
  const breed = hoogtePx * 0.38;
  const cx = Number.isFinite(top.x) ? top.x : bot.x;
  return { x: cx - breed / 2, y: Math.min(hy, by), w: breed, h: hoogtePx };
}

export function rectIntersect(a, b) {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}
// Welk deel van `a` bedekt `b` (0 tot 1)
export function coverage(a, b) {
  if (!a || !b || !(a.w > 0) || !(a.h > 0)) return 0;
  const i = rectIntersect(a, b);
  return i ? (i.w * i.h) / (a.w * a.h) : 0;
}
// Het deel van de rechthoek dat op het scherm valt
export function onScreenShare(r, w, h) {
  if (!r || !(r.w > 0) || !(r.h > 0)) return 0;
  return coverage(r, { x: 0, y: 0, w, h });
}

// ---------------------------------------------------------------- pixels

// rgba: Uint8Array of Buffer met w*h*4 bytes. step = elke n-de pixel (snel genoeg voor 1600x900).
export function lumaStats(rgba, w, h, step = 4) {
  let n = 0, sum = 0, sum2 = 0, dark = 0, bright = 0;
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const i = (y * w + x) * 4;
    const l = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
    n++; sum += l; sum2 += l * l;
    if (l < 12) dark++;
    if (l > 243) bright++;
  }
  if (!n) return { mean: 0, std: 0, dark: 1, bright: 0, n: 0 };
  const mean = sum / n;
  return { mean, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)), dark: dark / n, bright: bright / n, n };
}

// Het gemiddelde luma van een rechthoek (voor de contrastmeting onder de ondertitel)
export function lumaIn(rgba, w, h, rect, step = 3) {
  const x0 = Math.max(0, Math.floor(rect.x)), y0 = Math.max(0, Math.floor(rect.y)), x1 = Math.min(w, Math.ceil(rect.x + rect.w)), y1 = Math.min(h, Math.ceil(rect.y + rect.h));
  let n = 0, sum = 0;
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) { const i = (y * w + x) * 4; sum += 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]; n++; }
  return n ? sum / n : 0;
}

export const isBlack = (s) => !!s && s.mean < MEET.zwart.mean && s.std < MEET.zwart.std;
export const isEmpty = (s) => !!s && s.std < MEET.leeg.std;

// ---------------------------------------------------------------- beoordelen

function vondst(id, regel, ernst, categorie, bericht, extra = {}) {
  return { cutscene: id, regel, categorie, ernst, bericht, ...extra };
}

// De metingen op de records van één cutscene. opts: { w, h }. Geeft vondsten in dezelfde vorm als de linter.
export function analyseRecords(id, records, opts = {}) {
  const w = opts.w || 1600, h = opts.h || 900;
  const out = [];
  let vorig = null;
  const perShot = new Map();
  for (const r of records) {
    const wat = `shot ${r.shot} (${r.phase === 'b' ? 'begin' : r.phase === 'e' ? 'eind' : 'midden'}, ${Number(r.t).toFixed(1)} s)`;
    const t = Math.round(r.t * 10) / 10;
    const c = r.camera;
    // CS-R06: een geen-getal in de camera
    if (!c || [c.position.x, c.position.y, c.position.z, c.lookAt.x, c.lookAt.y, c.lookAt.z, c.fov].some((v) => !Number.isFinite(v))) {
      out.push(vondst(id, 'CS-R06', 'blokkerend', 'camera', `${wat}: de camera heeft een geen-getal (NaN) of ontbreekt`, { t }));
      continue;
    }
    // CS-R01: zwart of leeg beeld
    if (r.pixels) {
      if (isBlack(r.pixels)) out.push(vondst(id, 'CS-R01', 'blokkerend', 'camera', `${wat}: zwart beeld (gemiddelde luma ${r.pixels.mean.toFixed(1)})`, { t }));
      else if (isEmpty(r.pixels)) out.push(vondst(id, 'CS-R01', 'belangrijk', 'camera', `${wat}: een effen, leeg vlak (spreiding ${r.pixels.std.toFixed(1)}): lens in een muur of een lege hemel`, { t }));
    }
    // CS-R02: camera in geometrie (dak of grond, of een kijkstraal die meteen iets raakt)
    if (r.clip) out.push(vondst(id, 'CS-R02', 'blokkerend', 'camera', `${wat}: de camera staat in een gebouw of onder de grond`, { t }));
    else if (r.near && r.near.hits >= 6) out.push(vondst(id, 'CS-R02', 'belangrijk', 'camera', `${wat}: ${r.near.hits} van 25 kijkstralen raken iets binnen ${MEET.nadichtbij} m (lens vol: boom, paal of rug)`, { t }));
    // CS-R03: de spreker in beeld (projectie van het personage naar het scherm)
    if (r.speaker && r.speaker.expected !== false) {
      const sp = r.speaker;
      const aandeel = sp.rect ? onScreenShare(sp.rect, w, h) : 0;
      if (!sp.inFront && sp.inFront !== undefined) out.push(vondst(id, 'CS-R03', 'blokkerend', 'camera', `${wat}: ${sp.name || sp.id} praat maar staat achter de camera`, { t }));
      else if (aandeel < 0.15) out.push(vondst(id, 'CS-R03', r.phase === 'm' ? 'blokkerend' : 'belangrijk', 'camera', `${wat}: ${sp.name || sp.id} praat maar is niet in beeld (${(aandeel * 100).toFixed(0)}% op het scherm)`, { t }));
      // CS-R04: de ondertitel over de spreker of over de HUD
      if (r.subtitle && r.subtitle.rect && sp.rect && coverage(sp.rect, r.subtitle.rect) > MEET.overlap) out.push(vondst(id, 'CS-R04', 'belangrijk', 'camera', `${wat}: de ondertitel bedekt ${(coverage(sp.rect, r.subtitle.rect) * 100).toFixed(0)}% van ${sp.name || sp.id}`, { t }));
    }
    if (r.subtitle && r.subtitle.rect) for (const hud of r.hud || []) if (coverage(r.subtitle.rect, hud) > 0.1) { out.push(vondst(id, 'CS-R04', 'belangrijk', 'camera', `${wat}: de ondertitel overlapt een HUD-element`, { t })); break; }
    // luminantiesprong tussen het eind van het ene shot en het begin van het volgende
    if (vorig && r.pixels && vorig.pixels && r.phase === 'b' && r.shot !== vorig.shot) {
      const d = Math.abs(r.pixels.mean - vorig.pixels.mean);
      if (d >= MEET.sprong.belangrijk) out.push(vondst(id, 'CS-R05', d >= MEET.sprong.blokkerend ? 'blokkerend' : 'belangrijk', 'camera', `${wat}: plotselinge luminantiesprong van ${d.toFixed(0)} (van ${vorig.pixels.mean.toFixed(0)} naar ${r.pixels.mean.toFixed(0)}): belichting, dagtijd of weer wisselt tussen shots`, { t }));
    }
    vorig = r;
    if (!perShot.has(r.shot)) perShot.set(r.shot, []);
    perShot.get(r.shot).push(r);
  }
  // CS-R06: een bevroren camera: begin en eind van een lang shot zijn identiek terwijl de scène doorloopt
  for (const [shot, rs] of perShot) {
    const b = rs.find((x) => x.phase === 'b'), e = rs.find((x) => x.phase === 'e');
    if (!b || !e || e.t - b.t < MEET.bevroren || !b.camera || !e.camera) continue;
    const d = Math.hypot(b.camera.position.x - e.camera.position.x, b.camera.position.y - e.camera.position.y, b.camera.position.z - e.camera.position.z) + Math.hypot(b.camera.lookAt.x - e.camera.lookAt.x, b.camera.lookAt.y - e.camera.lookAt.y, b.camera.lookAt.z - e.camera.lookAt.z) + Math.abs(b.camera.fov - e.camera.fov);
    if (d < 0.004 && b.pixels && e.pixels && Math.abs(b.pixels.mean - e.pixels.mean) < 0.2 && b.pixels.std === e.pixels.std) out.push(vondst(id, 'CS-R06', 'belangrijk', 'camera', `shot ${shot}: de camera en het beeld bewegen niet in ${(e.t - b.t).toFixed(1)} s (bevroren)`, { t: Math.round(b.t * 10) / 10 }));
  }
  return out;
}

// ---------------------------------------------------------------- headless simulatie (zonder Electron)

// Een eenheid (scripts/lib/cutscene_data.mjs) bemonsterd op begin, midden en eind van elk shot, met de projectie van de spreker en
// een model van de ondertitelrechthoek. Geen pixels (die komen alleen uit Electron). Zo draait de meetcode ook in de lichte fase.
export function simulateRecords(unit, anchor = { x: 500, y: -300, facing: 1.1, z: 0 }, { w = 1600, h = 900 } = {}) {
  const records = [];
  if (!unit.scene) return records;
  const dur = unit.duration;
  const idxAt = (t) => unit.scene.sample(Math.min(t, dur), anchor).camera.shotIndex;
  const grens = [];
  let last = -1;
  for (let t = 0; t <= dur + 1e-9; t += 0.1) { const i = idxAt(t); if (i !== last) { grens.push({ shot: i, t0: t, t1: dur }); if (grens.length > 1) grens[grens.length - 2].t1 = t - 0.1; last = i; } }
  for (const g of grens) {
    const tijden = [['b', g.t0 + 0.05], ['m', (g.t0 + g.t1) / 2], ['e', Math.max(g.t0 + 0.05, g.t1 - 0.05)]];
    for (const [phase, t] of tijden) {
      const s = unit.scene.sample(Math.min(t, dur), anchor);
      const regel = (unit.lines || []).find((l) => t >= l.at && t < l.at + l.dur) || null;
      let speaker = null;
      if (regel && !/^(radio|telefoon|app|voicemail)/.test(regel.channel || '') && regel.key !== 'V') {
        const actors = (unit.def && unit.def.actors) || {};
        const id = Object.keys(actors).find((k) => k === regel.speaker || [].concat(actors[k].speaker || []).includes(regel.speaker));
        const a = id && s.actors[id];
        if (a && a.visible !== false) {
          const rect = actorRect(s.camera, a, w, h);
          const p = projectPoint(s.camera, { x: a.x, y: a.y, z: (a.h || 0) + 1.5 }, w, h);
          speaker = { id, name: regel.speaker, rect, inFront: p.inFront, depth: p.depth, expected: true };
        }
      }
      const subRect = regel ? { x: w * 0.12, y: h * 0.8, w: w * 0.76, h: h * (regel.text.length > 90 ? 0.14 : 0.08) } : null;
      records.push({ cutscene: unit.id, shot: g.shot, phase, t, camera: s.camera, speaker, subtitle: regel ? { rect: subRect, text: regel.text } : null, hud: [], near: null, clip: null, pixels: null });
    }
  }
  return records;
}
