// Het kader van de grote kaart (#901). De kaart hield op bij een harde vierkante rand: je
// kon voorbij de kaart van de provincie pannen en dan viel het doek weg. Hier staan de twee
// regels die dat voorkomen: de schaal waarop het kader precies in het scherm past (het verste
// zoomniveau) en het begrenzen van het beeld binnen dat kader. Buiten het kader tekent de
// kaart hetzelfde donkere buurland als erbinnen (mapview.js), zodat er geen rand te zien is.
// Puur en Node-safe: scripts/kaartkader_test.mjs.
const clampGetal = (v, a, b) => Math.max(a, Math.min(b, v));

// De schaal (px per meter) waarbij het kader precies in het scherm past.
export function frameScale(frame, cw, ch) {
  if (!Array.isArray(frame) || frame.length !== 4 || !frame.every(Number.isFinite) || !(cw > 0) || !(ch > 0)) return 0;
  const w = frame[2] - frame[0], h = frame[3] - frame[1];
  if (!(w > 0) || !(h > 0)) return 0;
  return Math.min(cw / w, ch / h);
}

// Houdt het beeld binnen het kader: het midden schuift naar binnen tot geen rand meer in
// beeld valt. Past het kader niet in het scherm (een smaller scherm dan het kader), dan
// staat de kaart gecentreerd; je kunt dan niet pannen en ziet dus nooit een losse rand.
export function clampView(cx, cy, scale, cw, ch, frame) {
  if (!Array.isArray(frame) || frame.length !== 4 || !frame.every(Number.isFinite) || !(scale > 0) || !(cw > 0) || !(ch > 0)) return { cx, cy, clamped: false };
  const [x0, y0, x1, y1] = frame;
  if (!(x1 > x0) || !(y1 > y0)) return { cx, cy, clamped: false };
  const halfW = cw / (2 * scale), halfH = ch / (2 * scale);
  const nx = x1 - x0 <= 2 * halfW ? (x0 + x1) / 2 : clampGetal(cx, x0 + halfW, x1 - halfW);
  const ny = y1 - y0 <= 2 * halfH ? (y0 + y1) / 2 : clampGetal(cy, y0 + halfH, y1 - halfH);
  return { cx: nx, cy: ny, clamped: nx !== cx || ny !== cy };
}
