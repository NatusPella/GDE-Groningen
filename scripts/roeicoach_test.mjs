// Roeicoach (#28): de pure delen. node scripts/roeicoach_test.mjs
import './node3d.mjs';
const C = await import('../game/js/roeicoach.js');
const fails = [];
const g = C.coachGoal({ x: 10, y: 5, angle: Math.PI / 2 }, 20);
if (Math.abs(g.x - 10) > 1e-9 || Math.abs(g.y - 25) > 1e-9) fails.push('doel vóór de boot');
const s = C.coachCruiseScale(5, 8);
if (!(s > 0.5 && s < 1.3)) fails.push('tempo ' + s);
if (C.coachCruiseScale(0, 8) < 0.35) fails.push('ondergrens');
const rustig = { road: { cat: 'residential', width: 6 } }, druk = { road: { cat: 'major', width: 12 } };
if (!C.coachRoadOk(rustig) || C.coachRoadOk(druk) || C.coachRoadOk(null)) fails.push('rustige weg ok, drukke niet');
if (C.coachRoadFor((r) => (r >= 40 ? rustig : null)) !== rustig) fails.push('ruimere tweede poging');
if (C.coachRoadFor((r) => (r >= 40 ? druk : null)) !== null) fails.push('drukke weg nooit');
if (C.coachRoadFor(() => null) !== null) fails.push('geen weg, geen coach');
if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log('roeicoach ok');
