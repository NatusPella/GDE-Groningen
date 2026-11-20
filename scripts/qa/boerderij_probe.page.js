// Probe (#985): ligt er water op de ploegrijen van je eerste akker? Pagina-helft voor boerderij_beeld.mjs --page=boerderij_probe.page.js.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.__debug && window.__debug.world && window.__debug.world.player && window.__debug.world.map); i++) await sleep(500);
const D = window.__debug; const w = D.world; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const Live = await imp('boerderijlive'); const B = await imp('boerderij'); const V = await imp('vehicle'); const PC = await imp('percelen'); const RD = await imp('rdnew');
const { akkerRijen } = await imp('bietenrules');
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
const p = w.player;
const [ex, ey] = RD.wgsToWorld(PC.erfDef(PC.START_ERF).lat, PC.erfDef(PC.START_ERF).lon);
p.x = ex; p.y = ey + 45; p.vx = p.vy = 0;
await sleep(9000);
const b = Live.getBoerderij();
let pos = null;
for (let i = 0; i < 60 && !pos; i++) { pos = B.veldPositie(b, b.bedrijf.actief); if (!pos) await sleep(1000); }
const uit = { pos };
if (pos) {
  const rijen = akkerRijen({ x: pos.x, y: pos.y }, pos.a);
  uit.rijen = rijen.map((r, i) => {
    const nat = [];
    for (let l = -12; l <= 112; l += 2) { const x = r.ax + r.ux * l, y = r.ay + r.uy * l; if (V.overOpenWater(map, x, y, 0)) nat.push(l); }
    return { i, nat };
  });
}
clearInterval(skipper);
return JSON.stringify(uit);
