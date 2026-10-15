// Hidden developer switches: ?dev (desktop --dev) opens the story dev panel,
// ?storytest (desktop --story-test) runs the automated story test.
// Dev runs keep their own storage so they never touch the player's save,
// settings or prestaties: dev mode reads and writes 'gde-dev:'-prefixed
// keys, the story test keeps everything in memory. Imported by main.js right
// after storagekeys.js, whose old-key migration must see the real storage.
import { PREFIX, DEV_PREFIX } from './storagekeys.js';

const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const STORY_TEST = q.has('storytest');
export const DEV = q.has('dev') || STORY_TEST;

if (DEV && typeof Storage !== 'undefined' && typeof localStorage !== 'undefined') {
  const mem = new Map();
  const proto = Storage.prototype;
  const get = proto.getItem, set = proto.setItem, remove = proto.removeItem;
  const ours = (store, k) => store === localStorage && typeof k === 'string' && k.startsWith(PREFIX) && !k.startsWith(DEV_PREFIX);
  proto.getItem = function (k) {
    if (!ours(this, k)) return get.call(this, k);
    if (STORY_TEST) return mem.has(k) ? mem.get(k) : null;
    return get.call(this, DEV_PREFIX + k);
  };
  proto.setItem = function (k, v) {
    if (!ours(this, k)) return set.call(this, k, v);
    if (STORY_TEST) { mem.set(k, String(v)); return undefined; }
    return set.call(this, DEV_PREFIX + k, v);
  };
  proto.removeItem = function (k) {
    if (!ours(this, k)) return remove.call(this, k);
    if (STORY_TEST) { mem.delete(k); return undefined; }
    return remove.call(this, DEV_PREFIX + k);
  };
}
