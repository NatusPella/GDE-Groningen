// Figures that ride on a boat's mesh (rondvaartchase.js: the tourists on the
// benches, Wiebe at his helm) stand at deck height relative to the hull. When
// the boat sinks or is wrecked its mesh drops below the waterline and tilts,
// and the figures would go down with it, visibly walking through the water
// (issue #148). They are shown only while the boat is afloat and whole.
export function decorVisible(v) {
  return !!v && !v.sinking && !v.wrecked;
}
