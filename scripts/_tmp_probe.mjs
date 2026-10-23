import { laadStadTegels } from './lib/stadtegels.mjs';
const T = await laadStadTegels();
const m = T.world;
for (const b of m.buildingsNear(-10,420,25)){const xs=b.pts.map(p=>p[0]),ys=b.pts.map(p=>p[1]);const w=Math.max(...xs)-Math.min(...xs),d=Math.max(...ys)-Math.min(...ys);const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2; if(Math.hypot(cx+10,cy-420)<28 && w<9 && d<9) console.log(b.type,b.h,b.hm,b.name,cx.toFixed(1),cy.toFixed(1),w.toFixed(1),d.toFixed(1),b.osm,b.pts.length);}
console.log(JSON.stringify(m.furniture).slice(0,600));
console.log(JSON.stringify((m.canopies||[]).filter(c=>Math.hypot((c.x??c.pts?.[0][0])+10,(c.y??c.pts?.[0][1])-420)<40)).slice(0,500));
