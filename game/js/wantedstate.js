function wantedPhase(world) {
  if (!(world.wanted > 0)) return "rustig";
  return world.police && world.police.searching ? "zoeken" : "achtervolging";
}
export {
  wantedPhase
};
