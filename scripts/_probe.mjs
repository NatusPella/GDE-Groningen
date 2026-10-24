import './node3d.mjs';
for (const f of ['scene3d', 'vehicle', 'facilities', 'sidejob_bieten', 'daynight', 'prompts', 'models3d_vehicles']) {
  const m = await import('../game/js/' + f + '.js').catch((e) => ({ err: String(e.message).slice(0, 200) }));
  console.log(f, Object.keys(m).length, m.err || 'ok');
}
