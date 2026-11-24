// De stationwagen (24-11, voertuigen-weg): de Quaternius-romp van de SUV (CC0, qcars.js), op wagenhoogte geschaald (hybridKey 'wagon' in
// models3d_vehicles.js), met wat een stationwagen herkenbaar maakt: dakrails op voetjes met twee dwarsdragers, een dakspoiler boven de
// achterklep, een antenne, een tweede remlicht en een lage laaddrempel met een rubberen rand. Alleen opbouw; de carrosserie, de deurgaten,
// het interieur, de wielen en de schade komen van de gedeelde hybride bouwer.
// fit: de maten van de romp (hybridFit); zAt(x, y): de halve breedte van de romp op die plek (hybridSurface), of null.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { composeMatrix } from './pixelart3d.js';

export function wagonOnderdelen(B, fit, zAt, topAt, K, paint, shadeHex) {
  // het vlakke deel van het dak: alle x waar de romp op dakhoogte ligt (gemeten, de profielpunten van de SUV liggen verder naar achteren)
  let xF = -9, xE = 9;
  for (let x = fit.xA + 0.6; x > fit.xD - 0.6; x -= 0.03) if (topAt(x) >= fit.roof - 0.07) { xF = Math.max(xF, x); xE = Math.min(xE, x); }
  const xm = (xF + xE) / 2, len = Math.max(0.8, (xF - xE) - 0.3), ry = fit.roof + 0.02;
  const RAIL = 0x2b2d30, FOOT = 0x1b1c1d;
  // dakrails: een lange ligger op vier voetjes aan elke kant, de voetjes op het dak (de breedte volgt het dak op die plek)
  for (const s of [1, -1]) {
    const zr = Math.max(0.3, Math.min(0.62, (zAt(xm, fit.roof - 0.04) || 0.7) - 0.12));
    B.box(xm, ry + 0.035, s * zr, len, 0.045, 0.05, RAIL);
    for (const f of [-0.46, -0.16, 0.16, 0.46]) { B.box(xm + f * len, ry + 0.005, s * zr, 0.07, 0.06, 0.07, FOOT); }
    B.box(xm + len / 2 + 0.02, ry + 0.035, s * zr, 0.04, 0.05, 0.06, FOOT);
    B.box(xm - len / 2 - 0.02, ry + 0.035, s * zr, 0.04, 0.05, 0.06, FOOT);
  }
  const zr0 = Math.max(0.3, Math.min(0.62, (zAt(xm, fit.roof - 0.04) || 0.7) - 0.12));
  for (const f of [-0.3, 0.3]) B.box(xm + f * len, ry + 0.085, 0, 0.05, 0.035, zr0 * 2 + 0.1, 0x303234);
  // dakspoiler boven de achterklep: twee steunen en een vleugel in de lakkleur, met een remlicht in het midden
  const xS = xE + 0.02, yS = fit.roof - 0.05, zS = Math.max(0.3, (zAt(xS + 0.1, yS - 0.08) || 0.72) - 0.06);
  B.box(xS, yS + 0.05, 0, 0.2, 0.035, zS * 2 + 0.02, shadeHex(paint, 0.92));
  B.box(xS - 0.09, yS + 0.062, 0, 0.03, 0.02, zS * 1.1, K.TAIL, 2);
  for (const s of [1, -1]) B.box(xS + 0.02, yS + 0.02, s * zS * 0.85, 0.1, 0.05, 0.04, 0x26282a);
  // antenne achter op het dak
  B.geo(new THREE.CylinderGeometry(0.008, 0.011, 0.36, 5), composeMatrix(fit.xB - 0.45, fit.roof + 0.17, -0.5), 0x18191a);
  B.geo(new THREE.SphereGeometry(0.014, 5, 4), composeMatrix(fit.xB - 0.45, fit.roof + 0.35, -0.5), 0x18191a);
}
