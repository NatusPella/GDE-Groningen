// #497: mute-stand en opslag van de audio-uitgang, los van de mixer. De
// audio-module levert de host-naad (ctx, gains, unlock/resume, wereldbericht).
// Puur genoeg om zonder Web Audio te testen.
export function loadMuted(key, storage = null) {
  try { return (storage || localStorage).getItem(key) === '1'; } catch (e) { return false; }
}

export function saveMuted(key, muted, storage = null) {
  try { (storage || localStorage).setItem(key, muted ? '1' : '0'); } catch (e) { /* ignore */ }
}

// host: { get, set, apply, refresh, ensure, unlock, resume, world, touch, notify, storage, key }
export function createMuteController(host = {}) {
  const key = host.key;
  const st = host.storage === undefined ? null : host.storage;
  const get = host.get || (() => false);
  const set = host.set || (() => {});
  const setMuted = (on) => {
    const next = !!on;
    if (next === get()) return get();
    set(next);
    saveMuted(key, next, st);
    if (host.apply) host.apply();
    if (host.refresh) host.refresh();
    if (!next) {
      if (host.ensure) host.ensure();
      if (host.unlock) host.unlock();
      if (host.resume) host.resume();
    }
    const w = host.world && host.world();
    const melding = host.notify ? host.notify(next, { touch: !!(host.touch && host.touch()) }) : '';
    if (w && w.addMessage && melding) w.addMessage(melding, 2.5, { key: 'mute' });
    return next;
  };
  return { setMuted, toggleMute: () => setMuted(!get()) };
}
