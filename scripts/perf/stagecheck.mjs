// Controle vóór een perf-run: de desktop-build moet bestaan (na een release is
// desktop/build weg; dan eerst `cd desktop && npm run stage`).
import fs from 'node:fs';
import path from 'node:path';

export const STAGE_INDEX = ['desktop', 'build', 'game', 'index.html'];
export function stageReady(root, exists = fs.existsSync) {
  return exists(path.join(root, ...STAGE_INDEX));
}
export function stageError() {
  return 'desktop/build ontbreekt: draai eerst `cd desktop && npm run stage` (na een release is de build opgeruimd).';
}
