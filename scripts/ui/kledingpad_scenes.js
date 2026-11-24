// Kledingpad (24-11): de 3D-voorbeelden van het kledingsysteem in het echte spel (modulaire mensen standaard): losse stukken (kledingkast, Spullen-tegel),
// een stuk naast het personage (winkel), een personage in een outfit (pashokje, kleding, rollen, uniformen), haar (kapper) en het voetbalshirt.
// Elk voorbeeld komt uit vehiclepreview.renderSnapshot, zoals de schermen het doen; per groep een raster op 1920x1080 en een telling van lege plaatjes.
//   node scripts/qa/personages2_run.mjs --size=1920x1080 --scenes=scripts/ui/kledingpad_scenes.js --out=<map in de worktree>
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const shot = async (name, wait = 600) => { await sleep(wait); console.log('[capture] kp-' + name); await sleep(700); };
const note = (k, v) => console.error('[kp] ' + k + ' ' + JSON.stringify(v));

await (async () => {
  try {
    const cine = await imp('cinematics');
    for (let i = 0; i < 240 && !ready() && !cine.isCinematicActive(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
    for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
    for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
    clearInterval(skipper);
    await sleep(2500);
    const D = window.__debug; const w = D.world; w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
    const VP = await imp('vehiclepreview'); const CD = await imp('clothingdata'); const CL = await imp('clothing');
    const MP = await imp('models3d_people'); const MS = await imp('missionstory'); const SC = await imp('storycast'); const FK = await imp('footballkit');
    const HAIR = await imp('clothinghair');
    const fout = []; window.addEventListener('error', (e) => fout.push(String(e.message).slice(0, 160)));
    const snap = (spec, wpx, hpx, opts = {}) => new Promise((res) => {
      let done = false; const t = setTimeout(() => { if (!done) { done = true; res(null); } }, 9000);
      try { VP.renderSnapshot(spec, wpx, hpx, (url) => { if (!done) { done = true; clearTimeout(t); res(url); } }, { ...(String(spec.kind).startsWith('piece') ? { angle: 0.6 } : spec.kind === 'person' ? { angle: VP.PORTRAIT_ANGLE } : {}), ...opts }); } catch (e) { done = true; clearTimeout(t); note('snapfout', String(e.message).slice(0, 120)); res(null); }
    });
    const inhoud = (url) => new Promise((res) => {
      if (!url) { res(0); return; }
      const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 48, 48); const d = g.getImageData(0, 0, 48, 48).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; res(n / (48 * 48)); }; im.onerror = () => res(0); im.src = url;
    });
    // een raster op het scherm: cellen { label, url }
    const raster = async (naam, cellen, kol = 6, maat = 250) => {
      const o = document.createElement('div');
      o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#d8d2c0;display:grid;grid-template-columns:repeat(' + kol + ',1fr);gap:6px;padding:10px;font:13px system-ui;color:#222;overflow:hidden;align-content:start';
      for (const c of cellen) { const f = document.createElement('figure'); f.style.cssText = 'margin:0;background:#efe9d8;border:1px solid #999;text-align:center'; f.innerHTML = (c.url ? '<img src="' + c.url + '" style="width:100%;height:' + maat + 'px;object-fit:contain">' : '<div style="height:' + maat + 'px;display:flex;align-items:center;justify-content:center;color:#a00;font-weight:700">LEEG</div>') + '<figcaption>' + c.label + (c.vol !== undefined ? ' (' + Math.round(c.vol * 100) + '%)' : '') + '</figcaption>'; o.appendChild(f); }
      document.body.appendChild(o); await shot(naam, 700); o.remove();
    };
    const cell = async (label, spec, wpx = 300, hpx = 300, opts = {}) => { const url = await snap(spec, wpx, hpx, opts); const vol = await inhoud(url); return { label, url: vol > 0.01 ? url : (url && vol > 0 ? url : null), vol }; };
    const kleur = (it) => it.colors[0];
    const stuk = (id) => { const it = CD.ITEMS.find((x) => x.id === id); return it ? it.id + '.' + kleur(it) : null; };
    const leeg = {};
    const tel = (groep, cellen) => { leeg[groep] = cellen.filter((c) => !c.url).map((c) => c.label); };

    // 1. kledingkast en Spullen-tegel: één los stuk per soort
    const slots = {}; for (const it of CD.ITEMS) (slots[it.slot] || (slots[it.slot] = [])).push(it);
    const losse = [];
    for (const [slot, list] of Object.entries(slots)) for (const it of list.slice(0, slot === 'top' || slot === 'outer' || slot === 'hat' ? 3 : 1)) losse.push([slot + ': ' + it.id, it.id + '.' + kleur(it)]);
    const c1 = []; for (const [lab, p] of losse.slice(0, 24)) c1.push(await cell(lab, { kind: 'piece', piece: p }, 260, 260));
    tel('losse-stukken-1', c1); await raster('1-kast-stukken-a', c1, 6, 220);
    const c1b = []; for (const [lab, p] of losse.slice(24, 48)) c1b.push(await cell(lab, { kind: 'piece', piece: p }, 260, 260));
    if (c1b.length) { tel('losse-stukken-2', c1b); await raster('1-kast-stukken-b', c1b, 6, 220); }
    // een set (de pashokpop-set van de Spullen-tegel)
    const set = ['tshirt', 'jeans', 'gympen', 'pet'].map(stuk).filter(Boolean);
    const cset = [await cell('set: ' + set.join(' '), { kind: 'pieceset', pieces: set }, 400, 400)];
    tel('set', cset);

    // 2. kapper: haarstijlen en kleuren
    const ch = [];
    for (const st of HAIR.HAIR_STYLE_IDS.slice(0, 18)) ch.push(await cell('haar ' + st, { kind: 'piece', hair: { style: st, hex: 0x5a3d26, char: st.length % 2 ? 'tammo' : 'anita' } }, 260, 260));
    tel('kapper', ch); await raster('2-kapper-haar', ch, 6, 220);

    // 3. winkel: stuk naast het personage (piecefig) en pashokje: het personage in de outfit (person)
    const app = MP.TAMMO_APPEARANCE, app2 = MP.ANITA_APPEARANCE;
    const personLook = (a, worn) => ({ ...a, ...CL.outfitToLook(worn, a) });
    const winkel = [];
    for (const [lab, p] of [['jack', stuk('jack')], ['regenjas', stuk('regenjas')], ['trui', stuk('trui')], ['jeans', stuk('jeans')], ['gympen', stuk('gympen')], ['rugzak', stuk('rugzak')], ['zonnebril', stuk('zonnebril')], ['sjaal', stuk('sjaal')]]) {
      if (!p) continue;
      winkel.push(await cell('winkel ' + lab + ' (Tammo)', { kind: 'piecefig', piece: p, look: personLook(app, { [CD.ITEMS.find((x) => p.startsWith(x.id + '.')).slot]: p }) }, 480, 320));
    }
    tel('winkel', winkel); await raster('3-winkel-piecefig', winkel, 4, 260);
    const pash = [];
    const outfits = [{ top: stuk('tshirt'), bottom: stuk('jeans'), shoes: stuk('gympen') }, { top: stuk('overhemd'), bottom: stuk('pantalon'), shoes: stuk('instappers'), outer: stuk('colbert') }, { top: stuk('trui'), bottom: stuk('korte_broek'), shoes: stuk('sandalen') || stuk('gympen'), hat: stuk('pet'), back: stuk('rugzak') }];
    for (const [i, o] of outfits.entries()) for (const [nm, a] of [['Tammo', app], ['Tessa', app2]]) { const wn = {}; for (const [k, v] of Object.entries(o)) if (v) wn[k] = v; pash.push(await cell('pashokje ' + nm + ' ' + (i + 1), { kind: 'person', look: personLook(a, wn) }, 300, 420)); }
    for (const [nm, a] of [['Tammo', app], ['Tessa', app2]]) pash.push(await cell('portret ' + nm, { kind: 'person', look: personLook(a, {}), frame: 'head' }, 300, 300));
    tel('pashokje', pash); await raster('3-pashokje-personen', pash, 6, 330);

    // 4. voetbalkleding: shirt per niveau (stuk en set) en de speler in het tenue
    const teams = [{ id: 'a', shirt: 0xc8261e, broek: 0xffffff, patroon: 'brede-streep' }, { id: 'b', shirt: 0x1f4fa8, broek: 0x1f4fa8, patroon: 'helften' }];
    const voet = [];
    for (const [i, t] of teams.entries()) {
      const al = FK.actorLook(t, { level: i ? 'prof' : 'amateur', role: 'veld', number: 7 + i * 4, seed: 9811 + i, name: true });
      voet.push(await cell('speler ' + (i + 1) + ' in tenue', { kind: 'person', look: { ...al, shirt: al.shirt, skin: 0xd9b48f, shirtBands: al.shirtBands } }, 300, 420));
    }
    try { const kv = FK.kitView ? FK.kitView() : null; note('kitView', kv ? { shirt: kv.shirt } : null); if (kv && kv.shirt) voet.push(await cell('club-tab shirt (kit.shirt)', { kind: 'piece', piece: kv.shirt }, 320, 320, { angle: 0.6 })); } catch (e) { note('kitfout', String(e.message).slice(0, 100)); }
    for (const id of ['voetbalsokken', 'scheenbeschermers']) { const p = stuk(id); if (p) voet.push(await cell('stuk ' + id, { kind: 'piece', piece: p }, 300, 300)); }
    tel('voetbal', voet); await raster('4-voetbal', voet, 5, 330);

    // 5. loopbaan- en rolkleding en uniformen: personen met rol, agent, ambulance, bus
    const rol = [];
    for (const [nm, look] of [['agent', { shirt: 0x1f3f8f, skin: 0xd9a47a, seed: 3, cop: true, variant: 'male' }], ['agent (v)', { shirt: 0x1f3f8f, skin: 0xd9a47a, seed: 9, cop: true, variant: 'female' }], ['chauffeur', { shirt: 0x5a6470, skin: 0xd9a47a, seed: 41, role: 'chauffeur', variant: 'male' }], ['ambulance', { shirt: 0x5a6470, skin: 0xd9a47a, seed: 47, role: 'ambulance', variant: 'female' }], ['boer', { shirt: 0x6a6a6a, skin: 0xd9a47a, seed: 52, role: 'boer', variant: 'male' }], ['student', { shirt: 0x6a6a6a, skin: 0xd9a47a, seed: 57, role: 'student', variant: 'female' }]]) rol.push(await cell(nm, { kind: 'person', look }, 300, 420));
    for (const k of ['jelle', 'femke', 'berend', 'rikus']) { const n = MS.NPC[k]; if (n) rol.push(await cell('NPC ' + k, { kind: 'person', look: n }, 300, 420)); }
    tel('rollen', rol); await raster('5-rollen-uniformen', rol, 5, 330);

    note('leeg', leeg);
    note('fouten', fout.slice(0, 8));
    note('proc', MP.proceduralStats ? MP.proceduralStats() : null);
  } catch (er) { note('fout', String(er && er.stack || er).slice(0, 500)); }
})();
