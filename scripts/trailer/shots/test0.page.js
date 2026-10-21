shot('test0', async (c) => {
  const p = c.player, w = c.world;
  c.clock(14); c.weather('helder');
  const cx = p.x, cy = p.y;
  const pose = (t) => ({ position: { x: cx + Math.cos(t * 0.5) * 22, y: cy + Math.sin(t * 0.5) * 22, z: 7 }, lookAt: { x: cx, y: cy, z: 2 } });
  const q = pose(0);
  c.cam(q.position, q.lookAt, 55);
  await c.settle({ label: 'start' });
  await c.png('test0-start');
  await c.begin('test0');
  await c.play(3, (t) => { const k = pose(t); c.cam(k.position, k.lookAt, 55); });
  await c.end();
  await c.png('test0-end');
});
