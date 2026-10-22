// Bijschriftensporen voor de montage: twee video's op de lengte van de trailer waarin alleen de bijschriften staan, in het lettertype van het
// spel: "schaduw" (zwarte tekstschaduw op wit, voor `blend=multiply`) en "tekst" (witte/groene tekst op zwart, voor `blend=screen`).
// Zo staat de tekst scherp en leesbaar op elk beeld, en kan hij in de montage nog schuiven zonder iets opnieuw op te nemen.
// Aanroep: repl_shot.mjs --args=<captions.json> shots/captions.page.js captrack-tekst  (en captrack-schaduw)
//   captions.json: { "total": 80, "items": [ { "at": 12.1, "dur": 1.7, "text": "RIJD.", "kicker": "EEN OPEN WERELD", "pos": "" } ] }
async function captionTrack(c, mode) {
  const args = window.__args || { total: 5, items: [] };
  const r = c.overlay();
  c.clearOverlay();
  document.getElementById('clip-ov').style.zIndex = '2147483000';
  const bg = document.createElement('div');
  bg.style.cssText = 'position:absolute;inset:0;background:' + (mode === 'schaduw' ? '#fff' : '#000');
  r.appendChild(bg);
  if (!document.getElementById('clip-cap-style')) {
    const st = document.createElement('style');
    st.id = 'clip-cap-style';
    st.textContent = `
      #clip-ov .cl-cap.shadow { color: #000; text-shadow: 0 0 0.12em #000, 0 0 0.35em #000, 0 0 0.7em rgba(0,0,0,0.9); }
      #clip-ov .cl-cap.shadow small { color: #000; }
      #clip-ov .cl-cap.plain { text-shadow: none; }
      #clip-ov .cl-cap.num { left: auto; right: 6vw; bottom: 9vh; text-align: right; font-size: min(14vh, 150px); }
      #clip-ov .cl-cap.num.boven { bottom: auto; top: 9vh; }
      #clip-ov .cl-cap.num.links { right: auto; left: 6vw; text-align: left; }
      #clip-ov .cl-cap.num .cl-n { color: #3fc97a; }
      #clip-ov .cl-cap.shadow.num .cl-n { color: #000; }
      #clip-ov .cl-cap.num small { font-size: 0.24em; letter-spacing: 0.22em; color: #e8f2ec; margin: 0.15em 0 0; }
      #clip-ov .cl-cap.shadow.num small { color: #000; }`;
    document.head.appendChild(st);
  }
  c.hud(false);
  await c.settle({ label: 'captrack-' + mode, frames: 5 });
  await c.begin('captrack-' + mode);
  const n = Math.round(args.total * 60);
  const live = new Map(); // index van het item -> element: meerdere bijschriften en cijfers kunnen tegelijk in beeld zijn
  const activeAt = (t) => args.items.some((it) => t >= it.at - 0.05 && t < it.at + it.dur + 0.05);
  let idle = false;
  for (let i = 0; i < n; i++) {
    const t = i / 60;
    // zonder bijschrift verandert er niets: het laatste beeld herhalen tot het volgende bijschrift begint
    if (idle && !activeAt(t)) { let j = i; while (j < n && !activeAt(j / 60)) j++; await c.repeatFrame(j - i); i = j - 1; continue; }
    idle = !activeAt(t) && i > 2;
    args.items.forEach((it, k) => {
      const on = t >= it.at && t < it.at + it.dur;
      if (!on && live.has(k)) { live.get(k).remove(); live.delete(k); }
      if (on && !live.has(k)) {
        const el = document.createElement('div');
        el.className = 'cl-cap plain ' + (it.num ? 'num ' : '') + (it.pos || '') + (mode === 'schaduw' ? ' shadow' : '');
        el.innerHTML = it.num ? '<span class="cl-n">' + it.num + '</span><small>' + (it.label || '') + '</small>' : (it.kicker ? '<small>' + it.kicker + '</small>' : '') + it.text;
        r.appendChild(el);
        live.set(k, el);
      }
    });
    await c.advance({ capture: true });
  }
  const out = await c.end();
  c.clearOverlay();
  return out;
}
shot('captrack-tekst', (c) => captionTrack(c, 'tekst'));
shot('captrack-schaduw', (c) => captionTrack(c, 'schaduw'));
