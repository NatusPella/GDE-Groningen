const mod = await import(process.argv[2]);
const roads = []; let s = 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 60000; i++) { const x = r() * 8000, y = r() * 8000; const pts = []; for (let k = 0; k < 6; k++) pts.push([x + k * 30, y + k * 10 * r()]); roads.push({ pts, type: 'residential', cat: 'minor', oneway: i % 5 === 0 }); }
const h = { consts: { SOFT_COST: 1.3, SOFT_ROAD_COST: 3, THROUGH_BUILDING_COST: 3, SERVICE_COST: 1.2, OFFROAD_COST: 4, STEPS_COST: 5, MOTORWAY_AVOID: 2, BIKE_COST: {}, MOTORWAY_TYPES: new Set() }, isDrivable: () => true, isWalkable: () => true, isBikeable: () => true, oneWayFor: () => false, throughOf: () => 0 };
let peak = 0; const g = mod.graphBuildSteps(roads, h); let v;
for (;;) { const q = g.next(); if (global.gc) global.gc(); peak = Math.max(peak, process.memoryUsage().heapUsed); if (q.done) { v = q.value; break; } }
console.log('levende piek MB', (peak / 1e6).toFixed(0), 'N', v.N);
