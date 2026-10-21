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
  const { readingTime } = await import('/js/storytext.js');
  const out = [];
  let at = start;
  for (const id of ids) {
    const s = sc.scenes.find((x) => x.id === id);
    if (!s) throw new Error('scène onbekend: ' + id);
    for (const l of s.lines) {
      if (l.channel === 'app-stil') continue;
      const sp = sc.speakers[l.key] || { name: l.speaker, voice: l.speaker };
      const v = lv.lineVoiceFor(sp.voice, l.text);
      const read = readingTime(l.text);
      const dur = v ? Math.max(read * 0.6, v.dur + 0.35) : read;
      out.push({ speaker: sp.name, text: l.text, at, dur, voice: v ? v.src : 'x', vdur: v ? v.dur : 0, rec: !!v, ...(l.channel === 'radio' ? { radio: true } : {}), scene: id });
      at += dur + gap;
    }
    at += sceneGap;
  }
  return { lines: out, end: at };
}

// Zet een filmpje van het spel klaar en loopt er per beeld mee: bij elke opgenomen stem een 'voice'-gebeurtenis.
async function playStory(c, { name, def, lines, duration, anchor = null, from = 0, to = null, cine = {}, clock = null, weather = 'helder', fit = null, thumb = null }) {
  await c.resetUi();
  c.calmPolice(); c.leave(); c.releaseCam(); c.hud(false, 'verhaal');
  if (clock != null) c.clock(clock);
  c.weather(weather);
  // leesbare ondertitels: de grootste maat (alleen voor deze opname, niet opgeslagen)
  c.M.set.setSetting('subtitleSize', 'extragroot'); c.M.set.setSetting('subtitleContrast', 'hoog');
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
  if (thumb) {
    // miniatuur: loop (zonder opname) tot thumb.at, haal de ondertitels weg, leg het logo erover en maak één PNG
    for (let i = 0; i < Math.round((thumb.at - from) * 60); i++) await c.advance({ capture: false });
    c.hud(false);
    const sb = document.getElementById('subtitles'); if (sb) sb.style.visibility = 'hidden';
    await c.thumbOverlay({ pos: thumb.pos || 'links' });
    for (let i = 0; i < 30; i++) await c.advance({ capture: false });
    await c.png(thumb.name);
    c.clearOverlay();
    if (sb) sb.style.visibility = '';
    return { thumb: thumb.name };
  }
  const fired = new Set();
  // regels die al begonnen zijn voor het fragment: stil laten (hun opname kan niet halverwege beginnen)
  if (from > 0 && st()) st().lines.forEach((l, k) => { if (l.at < from) fired.add(k); });
  await c.begin(name);
  const t1 = to ?? duration;
  const n = Math.round((t1 - from) * 60);
  // voorbeeld: stills op 8 plekken
  const stills = window.__preview ? new Set(Array.from({ length: 8 }, (_, k) => Math.round((n - 1) * k / 7))) : null;
  for (let i = 0; i < n; i++) {
    const s = st();
    if (!s) break;
    if (s.lines) s.lines.forEach((l, k) => { if (s.t >= l.at && !fired.has(k)) { fired.add(k); c.mark('voice', { speaker: l.speaker, text: l.text, src: l.voice === 'x' ? null : l.voice, dur: l.vdur || l.dur, ct: +s.t.toFixed(2) }); } });
    await c.advance({ capture: true });
    if (stills && stills.has(i)) await c.png('pv-' + name + '-' + String(i).padStart(4, '0'));
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
  return playStory(c, { name: 'v01-keuken', def: act, lines, duration: dur, anchor: sp, clock: 7.2, from: 10, to: Math.min(dur, 45) });
});

// V00: de straat in de opening (fietsers, de meeuw, de postbode) met de naamkaarten van Tessa en Tammo
shot('v00-straat', async (c) => {
  const cs = await import('/js/cutscenes.js');
  const { lines } = await sceneLines(['C00.1'], { start: 1.2 });
  const last = lines[lines.length - 1];
  const dur = last.at + last.dur + 2.6;
  const act = cs.OPENING_ACTS[0];
  const fit = { radii: [10, 16, 24, 34, 46, 60], ground: (x, y) => c.M.camp.roofAt(c.world.map, x, y) === 0 };
  return playStory(c, { name: 'v00-straat', def: act, lines, duration: dur, anchor: { x: 250, y: 60, facing: 0.4, z: 0 }, clock: 6.6, weather: 'helder', fit });
});

// V02: verhuisdag: de Escapade met de matras op het dak ("Rijden, niet praten")
shot('v02-verhuisdag', async (c) => {
  const cs = await import('/js/cutscenes.js');
  const { lines } = await sceneLines(['C00.3'], { start: 1.0 });
  const last = lines[lines.length - 1];
  const dur = last.at + last.dur + 4.6;
  const act = cs.OPENING_ACTS[2];
  const fit = { radii: [10, 16, 24, 34, 46, 60], ground: (x, y) => c.M.camp.roofAt(c.world.map, x, y) === 0 };
  return playStory(c, { name: 'v02-verhuisdag', def: act, lines, duration: dur, anchor: { x: -1418, y: -1157, facing: 0.6, z: 0 }, clock: 10.2, fit, to: 7.8 });
});

// Opdrachtscènes (cutscenes_akte1.js): dezelfde regie als in het spel, met de bestaande stemmen
async function missionStory(c, { name, key, scene, anchor, clock = 14, weather = 'helder', from = 0, to = null, thumb = null }) {
  const cs = await import('/js/cutscenes_akte1.js');
  const ms = await import('/js/missionstory.js');
  const { lines } = await sceneLines([scene], { start: 1.0 });
  const def = cs.missionScene(key, lines.map((l) => ({ speaker: l.speaker, text: l.text, at: l.at, dur: l.dur })), { looks: ms.NPC });
  if (!def) throw new Error('geen regie voor ' + key);
  const last = lines[lines.length - 1];
  const dur = last.at + last.dur + 2;
  const fit = { radii: [10, 16, 24, 34, 46, 60], ground: (x, y) => c.M.camp.roofAt(c.world.map, x, y) === 0 };
  return playStory(c, { name, def, lines, duration: dur, anchor: { ...anchor, z: 0 }, clock, weather, fit, from, to, thumb });
}
shot('v03-berend', async (c) => missionStory(c, { name: 'v03-berend', key: 'M01.intro', scene: 'M01.1', anchor: { x: 250, y: 26, facing: 0.3 }, clock: 11, to: 19.6 }));
shot('v04-markt', async (c) => missionStory(c, { name: 'v04-markt', key: 'M01.3', scene: 'M01.3', anchor: { x: 101, y: 77, facing: 0.5 }, clock: 18.4 }));
shot('v05a-automaat', async (c) => missionStory(c, { name: 'v05a-automaat', key: 'M02.intro', scene: 'M02.1', anchor: { x: -300, y: 100, facing: 1.2 }, clock: 7.6, from: 5.9, to: 16.3 }));
shot('v05b-politie', async (c) => missionStory(c, { name: 'v05b-politie', key: 'M02.intro', scene: 'M02.1', anchor: { x: -300, y: 100, facing: 1.2 }, clock: 7.6, from: 44.8, to: 51.0 }));
shot('v06a-duif', async (c) => missionStory(c, { name: 'v06a-duif', key: 'M04.intro', scene: 'M04.1', anchor: { x: 121, y: -700, facing: 0.8 }, clock: 16.5, from: 4.4, to: 12.4 }));
shot('v06b-duif', async (c) => missionStory(c, { name: 'v06b-duif', key: 'M04.intro', scene: 'M04.1', anchor: { x: 121, y: -700, facing: 0.8 }, clock: 16.5, from: 19.2, to: 29.8 }));
shot('v07-kiezel', async (c) => missionStory(c, { name: 'v07-kiezel', key: 'M05.intro', scene: 'M05.1', anchor: { x: 121, y: -740, facing: 2.2 }, clock: 15.2, from: 14.2, to: 24.6 }));

// Miniaturen van de verhaaltrailer (1920x1080 PNG met het logo; thumbs.mjs maakt er 1280x720 van): Tessa en Tammo samen op straat
shot('t-vh-a', async (c) => missionStory(c, { name: 't-vh-a', key: 'M01.intro', scene: 'M01.1', anchor: { x: 250, y: 26, facing: 0.3 }, clock: 11, from: 26, thumb: { name: 't-vh-a', at: 29.5, pos: 'rechts' } }));
shot('t-vh-b', async (c) => {
  const cs = await import('/js/cutscenes.js');
  const { lines } = await sceneLines(['C00.3'], { start: 1.0 });
  const last = lines[lines.length - 1];
  const fit = { radii: [10, 16, 24, 34, 46, 60], ground: (x, y) => c.M.camp.roofAt(c.world.map, x, y) === 0 };
  return playStory(c, { name: 't-vh-b', def: cs.OPENING_ACTS[2], lines, duration: last.at + last.dur + 4.6, anchor: { x: -1418, y: -1157, facing: 0.6, z: 0 }, clock: 10.2, fit, from: 7, thumb: { name: 't-vh-b', at: 11.5, pos: 'links' } });
});
