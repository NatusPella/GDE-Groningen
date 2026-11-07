// Spelbot (#312): de bootachtervolging (M11), puur: gas, stuur en wanneer langszij komen. De pagina-helft leest
// de plekken en de snelheid en voert de toetsen uit (boot of eigen boot).
export const BOOT = { langszij: 5, ruim: 45, gasDichtbij: 0.35 };

export function bootAchtervolgStap({ ik, doel, snelheid = 0, afstand = null, inBoot = false } = {}) {
  if (!ik || !doel) return { actie: 'wachten', gas: 0, stuur: 0, why: 'geen doel' };
  const d = Number.isFinite(afstand) ? afstand : Math.hypot(doel.x - ik.x, doel.y - ik.y);
  if (!inBoot) return { actie: 'instappen', gas: 0, stuur: 0, why: 'eerst in de boot' };
  const hoek = Math.atan2(doel.y - ik.y, doel.x - ik.x);
  if (d <= BOOT.langszij) return { actie: 'langszij', gas: 0.2, stuur: 0, why: 'langszij komen' };
  const gas = d > BOOT.ruim ? 1 : Math.min(1, Math.max(BOOT.gasDichtbij, d / BOOT.ruim));
  return { actie: 'achtervolgen', gas: Math.round(gas * 100) / 100, stuur: Math.round(Math.sin(hoek) * 100) / 100, hoek, afstand: d, snelheid };
}
