// WGS84 -> game frame: RD New shifted to the old origin (rdnew.js). Data layers
// that keep lat/lon (facilities.json) go through here. `meta` is kept for the
// callers that still pass the map's meta.
import { wgsToWorld } from './rdnew.js';

export function geoToGame(meta, lat, lon) {
  return wgsToWorld(lat, lon);
}
