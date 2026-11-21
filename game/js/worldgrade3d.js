// De THREE-kant van de wereldgrading (worldgrade.js, 21-11): past de parameters van dit beeld toe op het licht van de dag
// (computeLighting: saturatie, contrast, schaduw- en lichttint, mist, horizon, zenit, grondweerkaatsing) en laat raster en korrel
// door aan de grade-pass (postfx3d.js leest L.gradeRaster en L.gradeKorrel). Aangeroepen in applyTimeOfDay, vóór een eventuele
// cutscene-stemming (lightMood), zodat een cutscene zijn eigen grading houdt. Geen allocaties per beeld.
import { getSettings } from './settings.js';
import { gradeParams, mixLumaHex, GRADE_TINT_KEYS } from './worldgrade.js';
import { WERELD_INKTEN } from './worldpalette.js';
import { cleanWorldColor } from './worldcolormode.js';

const _ctx = { stand: 'subtiel', niveau: 'middel', elevation: 30, hour: 12, overcast: 0, mist: 0, storm: 0, rustig: false, kleurenblind: false };
const _p = {};
const DISPLAY_GAMMA = 2.2; // de tintfactoren zijn display-referred; de lichtkleuren zijn lineair: factor^2,2 is een goede benadering

// niveau = postfx.level ('laag' | 'middel' | 'hoog'); weather = world.weather (of null)
export function applyWorldGrade(L, niveau, weather) {
  const s = getSettings();
  _ctx.stand = cleanWorldColor(s.worldColor);
  _ctx.niveau = niveau;
  _ctx.elevation = L.elevation;
  _ctx.hour = L.hour;
  _ctx.overcast = weather ? weather.overcast || 0 : 0;
  _ctx.mist = weather ? weather.mist || 0 : 0;
  _ctx.storm = weather ? weather.intensity || 0 : 0;
  _ctx.rustig = !!s.rustigDrukwerk;
  _ctx.kleurenblind = !!s.colorBlind && s.colorBlind !== 'uit';
  const p = gradeParams(_ctx, _p);
  L.gradeRaster = p.raster;
  L.gradeKorrel = p.korrel;
  if (!p.actief) return p;
  L.sat *= p.satMul;
  L.con *= p.conMul;
  for (let i = 0; i < 3; i++) {
    const k = i === 0 ? 'r' : i === 1 ? 'g' : 'b';
    L.hiTint[k] *= Math.pow(p.lichtMul[i], DISPLAY_GAMMA);
    L.shadowTint[k] *= Math.pow(p.schaduwMul[i], DISPLAY_GAMMA);
  }
  if (p.mist > 0) {
    L.fog.setHex(mixLumaHex(L.fog.getHex(), WERELD_INKTEN[GRADE_TINT_KEYS.licht], p.mist));
    L.horizon.setHex(mixLumaHex(L.horizon.getHex(), WERELD_INKTEN[GRADE_TINT_KEYS.licht], p.mist));
  }
  if (p.zenit > 0) L.zenith.setHex(mixLumaHex(L.zenith.getHex(), WERELD_INKTEN[GRADE_TINT_KEYS.schaduw], p.zenit));
  if (p.grond > 0) L.hemiGnd.setHex(mixLumaHex(L.hemiGnd.getHex(), WERELD_INKTEN[GRADE_TINT_KEYS.licht], p.grond));
  return p;
}
