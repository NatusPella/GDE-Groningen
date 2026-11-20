// desktop/gpuflags.cjs (#1039): de GPU-schakelaars per platform en de uitzetter
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { gpuSwitches } = createRequire(import.meta.url)('../desktop/gpuflags.cjs');

let fail = 0;
const ok = (name, cond, extra = '') => { if (!cond) fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ' ' + extra}`); };
const names = (l) => l.map(([n]) => n);

const win = gpuSwitches(['electron', '.'], {}, 'win32');
ok('Windows: blocklist negeren en occlusietracking uit', names(win).join() === 'ignore-gpu-blocklist,disable-features' && win[1][1] === 'CalculateNativeWinOcclusion', JSON.stringify(win));
ok('macOS en Linux: alleen de blocklist', names(gpuSwitches([], {}, 'darwin')).join() === 'ignore-gpu-blocklist' && names(gpuSwitches([], {}, 'linux')).join() === 'ignore-gpu-blocklist');
ok('GDE_GPU_FLAGS=0 zet alles uit', gpuSwitches([], { GDE_GPU_FLAGS: '0' }, 'win32').length === 0);
ok('een bewuste softwarerenderer krijgt niets', gpuSwitches(['--use-angle=swiftshader'], {}, 'win32').length === 0 && gpuSwitches(['--disable-gpu'], {}, 'win32').length === 0);
// de keuzes die we bewust NIET maken: vsync en framelimiet blijven aan (frame pacing), ANGLE-backend blijft Chromium's keuze
const all = JSON.stringify(win);
ok('geen vsync- of framelimiet-schakelaar, geen ANGLE-backend afgedwongen', !/vsync|frame-rate|use-angle|use-gl/.test(all), all);
const main = fs.readFileSync(new URL('../desktop/main.js', import.meta.url), 'utf8');
const pkg = fs.readFileSync(new URL('../desktop/package.json', import.meta.url), 'utf8');
ok('main.js past de schakelaars toe en de build levert gpuflags.cjs mee', /gpuSwitches\(\)/.test(main) && /"gpuflags\.cjs"/.test(pkg));

console.log(fail ? `${fail} FAILED` : 'all ok');
process.exit(fail ? 1 : 0);
