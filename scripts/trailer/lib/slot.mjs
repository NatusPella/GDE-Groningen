// Electron-slot uit ~/gde-locks nemen en vrijgeven (README.txt daar: maximaal 3 tegelijk).
// Altijd vrijgeven in een finally; nooit een kill zonder vrijgeven.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function takeSlot(label = 'trailer') {
  if (!fs.existsSync(LOCKS)) return null;
  for (let poging = 0; ; poging++) {
    for (const n of [1, 2, 3]) {
      const dir = path.join(LOCKS, `electron-${n}`);
      try { fs.mkdirSync(dir); return dir; } catch { /* bezet */ }
    }
    if (poging % 120 === 0) console.log(`[${label}] wacht op een Electron-slot...`);
    await sleep(500 + Math.floor(Math.random() * 400));
  }
}

export function freeSlot(dir) {
  if (!dir) return;
  try { fs.rmdirSync(dir); } catch { /* al weg */ }
}
