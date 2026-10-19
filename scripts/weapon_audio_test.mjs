// Every weapon has its sounds, and the scoped jachtgeweer hits under the crosshair.
//   node scripts/weapon_audio_test.mjs
// Static checks on the sources (combat.js and audio.js need a browser): each
// key in WEAPONS maps to the audio events it fires and audio.js plays each of
// them; the event queue keeps what one frame could not play.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scopeEye, scopeShot } from '../game/js/scopeaim.js';

const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
const src = (f) => fs.readFileSync(path.join(JS, f), 'utf8');
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'ok ' : 'XX '} ${name}${info ? ` (${info})` : ''}`); if (!ok) fails++; };

const combat = src('combat.js'), audio = src('audio.js'), throwables = src('throwables.js'), missions = src('missions.js');
const wsrc = src('weapons.js');
const block = wsrc.slice(wsrc.indexOf('export const WEAPONS = {'), wsrc.indexOf('};', wsrc.indexOf('export const WEAPONS = {')));
const weapons = [...block.matchAll(/^\s{2}(\w+): \{ kind: '(\w+)'(.*)$/gm)].map((m) => ({ key: m[1], kind: m[2], rest: m[3] }));
check('WEAPONS parsed', weapons.length >= 14, weapons.map((w) => w.key).join(' '));

const sfx = audio.slice(audio.indexOf('function playWeaponSfx'), audio.indexOf('function playCrash'));
const sfxCases = new Set([...sfx.matchAll(/case '(\w+)':/g)].map((m) => m[1]));
const gunBuf = audio.match(/const GUN_BUF = \{([^\n]*)\};/);
const gunKeys = new Set(gunBuf ? [...gunBuf[1].matchAll(/(\w+): \[/g)].map((m) => m[1]) : []);
const emits = (text, sub) => new RegExp(`sub: '${sub}'|'${sub}' :|[?:] '${sub}'`).test(text);

// what each kind of weapon fires, and where
const NEEDS = {
  melee: [['swing', combat], ['hit', combat]],
  gun: [['shot', combat], ['empty', combat]],
  water: [['squirt', throwables]],
  throw: [['fuse', throwables], ['carbid', throwables]],
  rocket: [['launch', throwables], ['firework', throwables]],
};
for (const w of weapons) {
  const need = NEEDS[w.kind];
  if (!need) { check(`${w.key}: known kind`, false, w.kind); continue; }
  for (const [sub, text] of need) check(`${w.key}: '${sub}' fired and played`, emits(text, sub) && sfxCases.has(sub), `${emits(text, sub) ? '' : 'not fired '}${sfxCases.has(sub) ? '' : 'no case in playWeaponSfx'}`.trim());
  if (w.kind === 'gun') check(`${w.key}: has a gunshot sample set`, gunKeys.has(w.key));
  if (w.kind === 'melee') {
    const mat = (w.rest.match(/sound: '(\w+)'/) || [])[1];
    check(`${w.key}: hit material handled`, !!mat && (mat === 'wood' || mat === 'klomp' || new RegExp(`m === '${mat}'`).test(sfx)), mat || 'geen sound');
  }
}
check('melee hit sounds for fists too', !/if \(landed && key !== 'fists'\) weaponSound/.test(combat));
check('H18 fireworks: incoming whistle and burst', /sub: 'incoming'/.test(missions) && /sub: 'burst'/.test(missions) && sfxCases.has('incoming'));
check('event queue keeps the overflow', /events\.splice\(0, played\)/.test(audio) && !/playAudioEvents\(world\)\);\n\s*events\.length = 0/.test(audio));

// the scoped shot: after flying d metres it is on the camera's centre ray
const p = { x: 12.3, y: -40.1 };
let worst = 0;
for (let i = 0; i < 64; i++) {
  const yaw = (i / 64) * Math.PI * 2 - Math.PI, base = (i % 5) * 0.7, d = 5 + i * 1.7;
  const eye = scopeEye(p, yaw, base), b = scopeShot(p, yaw, base, 140);
  const t = d / 140;
  const hit = { x: b.x + b.vx * t, y: b.y + b.vy * t, z: b.z };
  const aim = { x: eye.x + Math.cos(yaw) * d, y: eye.y + Math.sin(yaw) * d, z: eye.z };
  worst = Math.max(worst, Math.hypot(hit.x - aim.x, hit.y - aim.y, hit.z - aim.z));
}
check('scoped jachtgeweer lands under the crosshair', worst < 1e-9, `max ${worst.toExponential(2)} m`);
check('scoped shot skips aim assist and spread', /scoped \? world\.camYaw \?\? angle : aimFireAngle/.test(combat) && /scopeShot\(p, angle, base, weapon\.speed\)/.test(combat));
check('scope camera uses the same eye, looking level', /scopeEye\(player, yaw, baseH\)/.test(src('scene3d.js')) && /lookY \+= \(ey - lookY\) \* k/.test(src('scene3d.js')));

console.log(fails ? `${fails} failed` : 'PASS');
process.exit(fails ? 1 : 0);
