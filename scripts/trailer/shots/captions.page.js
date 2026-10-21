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
      #clip-ov .cl-cap.plain { text-shadow: none; }`;
    document.head.appendChild(st);
  }
  c.hud(false);
  await c.settle({ label: 'captrack-' + mode, frames: 5 });
  await c.begin('captrack-' + mode);
  let cur = null;
  const total = args.total;
  const n = Math.round(total * 60);
  for (let i = 0; i < n; i++) {
    const t = i / 60;
    const it = args.items.find((x) => t >= x.at && t < x.at + x.dur);
    if (it !== cur) {
      if (cur) { const e = r.querySelector('.cl-cap'); if (e) e.remove(); }
      cur = it || null;
      if (it) {
        const el = document.createElement('div');
        el.className = 'cl-cap plain ' + (it.pos || '') + (mode === 'schaduw' ? ' shadow' : '');
        el.innerHTML = (it.kicker ? '<small>' + it.kicker + '</small>' : '') + it.text;
        r.appendChild(el);
      }
    }
    await c.advance({ capture: true });
  }
  const out = await c.end();
  c.clearOverlay();
  return out;
}
shot('captrack-tekst', (c) => captionTrack(c, 'tekst'));
shot('captrack-schaduw', (c) => captionTrack(c, 'schaduw'));
