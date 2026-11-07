// #654: syncPub bouwde elke frame alle missie-HUD-data opnieuw, terwijl het
// statische deel (samen-status, waypoint-tellers, straal) alleen verandert bij
// een fase-/index-/waypointwissel. Deze sleutel bepaalt dat.
export function pubStaticKey(st, def, board) {
  return [st.index, st.phase, st.stageIndex, st.wpIndex, st.armed ? 1 : 0, st.defs ? st.defs.length : 0,
    board ? 1 : 0, st.stuntPhase ? 1 : 0, st.race ? 1 : 0, def && def.type].join('|');
}
