// Service worker of the web build (web/build.mjs stamps the cache name: the
// version plus a hash of every file). At install only the shell is precached
// (the page, the loader and the fonts); every other file is cached the first
// time the game asks for it, so a second visit and offline play read from the
// cache and a new build gets a new cache while the old one is deleted (#757).
// The page: network first (offline falls back to the cache). Audio packs are
// read in slices by web.js, which caches the clips itself.
const CACHE = '__GDE_CACHE__';
const SCOPE = self.registration.scope;

// what the page loads before this worker controls it on the first visit
const SHELL = __GDE_SHELL__;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map((f) => fetch(new URL(f, SCOPE), { cache: 'no-cache' })
      .then((res) => res.ok && cache.put(f ? new URL(f, SCOPE).href : SCOPE, res)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 'gte-vi-*': the cache names before 0.29
    for (const k of await caches.keys()) if ((k.startsWith('gde-') || k.startsWith('gte-vi-')) && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function fromNetwork(req, cache) {
  // revalidate, so a build never mixes in files from the HTTP cache
  const res = await fetch(req, { cache: 'no-cache' });
  if (res.status === 200 && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
  return res;
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  return hit || fromNetwork(req, cache);
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.status === 200) cache.put(SCOPE, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    const hit = await cache.match(SCOPE);
    if (hit) return hit;
    throw e;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;
  const path = req.url.slice(SCOPE.length).split(/[?#]/)[0];
  if (req.mode === 'navigate') { if (path === '' || path === 'index.html') e.respondWith(networkFirst(req)); return; }
  if (req.headers.has('range') || path.endsWith('.pack') || path === 'sw.js') return;
  e.respondWith(cacheFirst(req));
});
