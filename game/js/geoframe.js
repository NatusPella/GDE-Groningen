// WGS84 -> game frame: the projection every scripts/add_*.py uses (x east,
// y south, metres from citymap.json's meta.origin). Data layers that keep
// lat/lon (facilities.json) go through here, so moving to RD New is a change
// in this one function.
const M_LAT = 110574.0;

export function geoToGame(meta, lat, lon) {
  const o = meta.origin;
  const mLat = meta.mPerDegLat || M_LAT;
  const mLon = meta.mPerDegLon || M_LAT * Math.cos((o.lat * Math.PI) / 180);
  return [(lon - o.lon) * mLon, (o.lat - lat) * mLat];
}
