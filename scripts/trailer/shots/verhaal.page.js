// Clips van de verhaaltrailer: de echte filmpjes van het spel (cutscenes.js, cutscenehost.js, cinematics.js), met de bestaande
// stemopnames (geen nieuwe TTS). De regels met hun tijden gaan als gebeurtenissen ('voice') naar <clip>.json, zodat de montage
// precies die opname op dat moment onder het beeld legt; de ondertitels zijn die van het spel zelf.

// --- hulpjes -----------------------------------------------------------------------------------------------------
let SCRIPT = null;
async function scriptData() {
  if (!SCRIPT) SCRIPT = await (await fetch('/storydata/script.json')).json();
  return SCRIPT;
}

// Regels van een scène uit het verhaalscript, met tijden zoals story.js ze zou geven (opname + 0,35 s, anders leestijd)
async function sceneLines(ids, { start = 1.2, gap = 0.12, sceneGap = 0.9 } = {}) {
  const sc = await scriptData();
  const lv = await import('/js/linevoice.js');
  const out = [];
  let at = start;
  for (const id of ids) {
    const s = sc.scenes.find((x) => x.id === id);
    if (!s) throw new Error('scène onbekend: ' + id);
    for (const l of s.lines) {
      if (l.channel === 'app-stil') continue;
      const sp = sc.speakers[l.key] || { name: l.speaker, voice: l.speaker };
      const v = lv.lineVoiceFor(sp.voice, l.text);
      const read = Math.max(1.6, Math.min(5, 0.9 + l.text.length * 0.055));
      const dur = v ? Math.max(read * 0.6, v.dur + 0.35) : read;
      out.push({ speaker: sp.name, text: l.text, at, dur, voice: v ? v.src : 'x', vdur: v ? v.dur : 0, rec: !!v, ...(l.channel === 'radio' ? { radio: true } : {}), scene: id });
      at += dur + gap;
    }
    at += sceneGap;
  }
  return { lines: out, end: at };
}

// Zet een filmpje van het spel klaar en loopt er per beeld mee: bij elke opgenomen stem een 'voice'-gebeurtenis.
async function playStory(c, { name, def, lines, duration, anchor = null, from = 0, to = null, cine = {}, clock = null, weather = 'helder', fit = null }) {
  await c.resetUi();
  c.calmPolice(); c.leave(); c.releaseCam(); c.hud(false);
  if (clock != null) c.clock(clock);
  c.weather(weather);
  const host = await import('/js/cutscenehost.js');
  const cin = await import('/js/cinematics.js');
  const p = c.player;
  const a = anchor || { x: p.x, y: p.y, facing: p.angle || 0, z: 0 };
  c.placePlayer(a.x, a.y, a.facing || 0);
  c.M.cine.skipAllCinematics();
  const ok = host.playScript(c.world, def, { lines, duration, anchor: a, cine: { skippable: false, letterbox: false, ...cine }, ...(fit ? { fit } : {}) });
  if (!ok) throw new Error('filmpje startte niet: ' + def.id);
  await c.settle({ label: name, frames: 25 });
  if (from > 0) { cin.setCinematicTime(from); for (let i = 0; i < 20; i++) await c.advance({ capture: false }); }
  const st = () => cin.cinematicState();
  const fired = new Set();
  await c.begin(name);
  const t1 = to ?? duration;
  const n = Math.round((t1 - from) * 60);
  for (let i = 0; i < n; i++) {
    const s = st();
    if (!s) break;
    if (s.lines) s.lines.forEach((l, k) => { if (s.t >= l.at && !fired.has(k)) { fired.add(k); c.mark('voice', { speaker: l.speaker, text: l.text, src: l.voice === 'x' ? null : l.voice, dur: l.vdur || l.dur, ct: +s.t.toFixed(2) }); } });
    await c.advance({ capture: true });
  }
  const r = await c.end();
  return { ...r, cinematicT: st() ? +st().t.toFixed(2) : null };
}

// --- clips -------------------------------------------------------------------------------------------------------
// V01: de keuken van de opening: Tessa en Tammo, de bank, de frietwagen (7 stemregels)
shot('v01-keuken', async (c) => {
  const cs = await import('/js/cutscenes.js');
  const { lines } = await sceneLines(['C00.2'], { start: 1.0 });
  const last = lines[lines.length - 1];
  const act = cs.OPENING_ACTS[1];
  const dur = last.at + last.dur + 3;
  // de keuken is een gesloten kamer hoog boven de straat (story.js KITCHEN_Z)
  const sp = { x: 214, y: 60, facing: 0, z: 345 };
  return playStory(c, { name: 'v01-keuken', def: act, lines, duration: dur, anchor: sp, clock: 7.2, from: 0, to: Math.min(dur, 30) });
});
