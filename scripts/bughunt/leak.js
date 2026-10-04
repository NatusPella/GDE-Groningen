
// --- leak test: the same round trip several times; memory at A should level off ---
{
  w.devInvuln = true;
  const CR = await imp('countryreal');
  const vs = window.__ommeland ? window.__ommeland.villages() : [];
  const far = vs[0] ? { x: vs[0].st[0], y: vs[0].st[1] } : { x: 3538, y: 4936 };
  const far2 = vs[3] ? { x: vs[3].st[0], y: vs[3].st[1] } : { x: -10548, y: -3168 };
  const route = [[100, 77], [far.x, far.y], [-1270, -1060], [far2.x, far2.y], [1770, 1477]];
  const PM4 = await imp('pausemenu'), PH4 = await imp('phone'), SU4 = await imp('shopui'), SH4 = await imp('shops');
  const dom = () => document.getElementsByTagName('*').length;
  for (let cyc = 0; cyc < 6; cyc++) {
    for (const [x, y] of route) { tag('leak' + cyc); teleport(x, y); await sleep(2600); await hold(['w'], 400); }
    // UI open/close churn
    for (let k = 0; k < 3; k++) {
      PM4.openPauseMenu('map'); await sleep(250); PM4.openPauseMenu('garage'); await sleep(250); PM4.closePauseMenu(); await sleep(150);
      PM4.openPauseMenu('telefoon', { sub: 'berichten' }); await sleep(250); PM4.closePauseMenu(); await sleep(150);
    }
    teleport(100, 77); await sleep(3000);
    const m = memSnap('cycle' + cyc); m.dom = dom(); m.listeners = w.onRespawn.length; m.msgs = w.messages.length; m.particles = w.particles.length; m.bullets = w.bullets.length;
    log('leak', JSON.stringify(m));
  }
  w.devInvuln = false;
}
