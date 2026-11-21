// Pure padoplossing voor web/serve.mjs: een url naar een bestand binnen de map, of een foutcode.
import { createRequire } from 'module';
import path from 'path';

const { insideDir } = createRequire(import.meta.url)('../desktop/guards.cjs');

// Geeft { status } (302, 400, 403, 404) of { file } (pad binnen dir, nog niet gecontroleerd op bestaan).
export function resolveRequest(rawUrl, dir, prefix) {
  let url;
  try { url = decodeURIComponent(String(rawUrl).split('?')[0]); } catch { return { status: 400 }; }
  if (url === '/' || url === prefix.slice(0, -1)) return { status: 302, location: prefix };
  if (!url.startsWith(prefix)) return { status: 404 };
  const file = path.join(dir, url.slice(prefix.length));
  if (!insideDir(dir, file)) return { status: 403 };
  return { file };
}
