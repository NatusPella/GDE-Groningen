// Samen spelen (#434): een boot bij de gast beweegt glad. De snapshots komen een paar keer per seconde; zonder gladstrijken springt een boot
// een stukje en slingert een lang binnenvaartschip bij elke kleine hoekstap. De positie volgt de gemelde plek met een korte vertraging (en loopt
// die vertraging met de gemelde snelheid weer in), de koers volgt zacht. Een sprong (verplaatsing of nieuwe boot) zet hem meteen goed.
// Pure functies, geen three.js: scripts/coop434_test.mjs.
export const BOOT_TAU_POS = 0.2;   // s
export const BOOT_TAU_HOEK = 0.35; // s
export const BOOT_SPRONG_M = 12;   // m: verder weg dan dit is een sprong

const wikkel = (d) => Math.atan2(Math.sin(d), Math.cos(d));

// st: het geheugen per boot ({} bij de eerste keer); geeft { x, y, angle }
export function gladBoot(st, x, y, angle, snelheid, dt) {
  if (!st || !Number.isFinite(x) || !Number.isFinite(y)) return { x, y, angle };
  const a = Number.isFinite(angle) ? angle : 0, v = Number.isFinite(snelheid) ? snelheid : 0;
  const tx = x + Math.cos(a) * v * BOOT_TAU_POS, ty = y + Math.sin(a) * v * BOOT_TAU_POS; // waar de boot over de vertraging heen is
  if (!st.klaar || !(dt > 0) || Math.hypot(x - st.x, y - st.y) > BOOT_SPRONG_M) {
    st.klaar = true; st.x = x; st.y = y; st.a = a;
    return { x, y, angle: a };
  }
  const kp = 1 - Math.exp(-dt / BOOT_TAU_POS), kh = 1 - Math.exp(-dt / BOOT_TAU_HOEK);
  st.x += (tx - st.x) * kp; st.y += (ty - st.y) * kp;
  st.a += wikkel(a - st.a) * kh;
  return { x: st.x, y: st.y, angle: st.a };
}
