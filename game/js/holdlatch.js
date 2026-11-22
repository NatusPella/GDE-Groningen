// Tik in plaats van ingedrukt houden (21-11, toegankelijkheid): rennen en richten blijven aan na één tik en gaan uit met een tweede tik.
// Voor wie een toets of knop niet lang kan indrukken. Puur: geen DOM, geen klok (scripts/holdlatch_test.mjs). input.js houdt de
// schakelaars bij, main.js zegt wanneer ze mogen blijven staan. Lokaal per speler; er gaat niets over het net.
// De waarden van de instelling `tikStand` zijn Nederlands (wat de speler kiest), de code is Engels.
export const TAP_MODES = ['uit', 'rennen', 'richten', 'beide'];
export const TAP_DEFAULT = 'uit';
export const cleanTap = (v) => (TAP_MODES.includes(v) ? v : TAP_DEFAULT);

// welke acties de tikstand overneemt: rennen (Shift te voet) en richten (de richtknop)
export const tapActions = (mode) => {
  const m = cleanTap(mode);
  return { rennen: m === 'rennen' || m === 'beide', richten: m === 'richten' || m === 'beide' };
};

// Rennen komt vanzelf los als je een poos stilstaat: anders loopt het later onverwacht weg.
export const IDLE_FRAMES = 45;

export function makeLatch() {
  return {
    on: false,
    idle: 0,
    // een tik wisselt de stand; het loslaten van de toets doet niets
    press() { this.on = !this.on; this.idle = 0; return this.on; },
    clear() { this.on = false; this.idle = 0; },
    // eens per beeld; geeft true als de stand zojuist is gewist. `allowed` false (menu, voertuig, pauze) wist hem;
    // `moving` telt de stilstand, die alleen telt als `idleReleases` (rennen) aanstaat
    // `dt` (seconds since the last step): the standstill then counts time (IDLE_FRAMES at 60 Hz = 0.75 s) instead of
    // frames, so a 144 Hz screen does not drop the run after 0.3 s. Without dt it counts one per step.
    step({ allowed = true, moving = true, idleReleases = false, dt } = {}) {
      if (!this.on) return false;
      if (!allowed) { this.clear(); return true; }
      if (idleReleases) {
        this.idle = moving ? 0 : this.idle + (Number.isFinite(dt) && dt >= 0 ? dt * 60 : 1);
        if (this.idle >= IDLE_FRAMES - 1e-6) { this.clear(); return true; }
      }
      return false;
    },
  };
}
