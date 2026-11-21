// Loader-hook (module.register) voor scripts/lib/threemock_register.mjs: mapt de CDN-import van three naar scripts/lib/threemock.mjs en game/js/scene3d.js naar scripts/lib/scene3d_mock.mjs.
const THREE_URLS = new Set(['https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js']);
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
const here = (f) => new URL(f, import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (THREE_URLS.has(specifier)) return { url: here('./threemock.mjs'), shortCircuit: true };
  if (specifier === GLTF_URL) return { url: here('./threemock.mjs'), shortCircuit: true };
  const r = await next(specifier, context);
  if (/\/game\/js\/scene3d\.js$/.test(r.url)) return { url: here('./scene3d_mock.mjs'), shortCircuit: true };
  return r;
}
