// Titel- en cijferkaarten voor de showcase-trailer: tekst, tellende cijfers, een grafiek van commits per dag, een veld van AI-sessies, het projectbord en een
// terminalregel-voor-regel. Alles in de stijl van het spel (donkergroen verloop, Bebas Neue, groen accent) en alleen met cijfers die de aanroeper meegeeft
// (scripts/trailer/plans/showcase_kaarten.mjs haalt ze uit het cijferblad en uit git); er staat hier geen enkel getal in.
// Aanroep: repl_shot.mjs --args=<kaart.json> shots/kaarten.page.js kaart     met { name, dur, kind, ... }
const ARG = window.__args || {};

function css() {
  if (document.getElementById('clip-kaart-style')) return;
  const st = document.createElement('style');
  st.id = 'clip-kaart-style';
  st.textContent = `
  #clip-ov .kk { position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 20%, #17301f 0%, #0c140e 75%); display: flex; flex-direction: column; justify-content: center; padding: 0 9vw; color: #f0ede4; }
  #clip-ov .kk h1 { font-weight: 400; margin: 0; font-size: min(15vh, 170px); line-height: 0.98; letter-spacing: 0.02em; }
  #clip-ov .kk h1 em { font-style: normal; color: #3fc97a; }
  #clip-ov .kk h2 { font-weight: 400; margin: 3vh 0 0; font-size: min(5vh, 56px); letter-spacing: 0.22em; color: #a9c4b4; font-family: 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; }
  #clip-ov .kk .rij { display: flex; gap: 4vw; flex-wrap: wrap; align-items: flex-end; }
  #clip-ov .kk .cel { min-width: 17vw; }
  #clip-ov .kk .cel b { display: block; font-weight: 400; font-size: min(16vh, 180px); line-height: 1; color: #3fc97a; }
  #clip-ov .kk .cel span { display: block; margin-top: 1vh; font-size: min(3.2vh, 38px); letter-spacing: 0.16em; color: #e8f2ec; text-transform: uppercase; font-family: 'Arial Narrow', Arial, sans-serif; }
  #clip-ov .kk .kop { font-size: min(4.4vh, 52px); letter-spacing: 0.3em; color: #3fc97a; margin-bottom: 3vh; text-transform: uppercase; }
  #clip-ov .kk canvas { width: 82vw; height: 56vh; }
  #clip-ov .kk .term { font-family: Consolas, 'Courier New', monospace; font-size: min(2.7vh, 34px); line-height: 1.55; color: #cfe8d8; background: rgba(0,0,0,0.38); border: 1px solid rgba(63,201,122,0.35); border-radius: 10px; padding: 3vh 3vw; white-space: pre; width: 78vw; }
  #clip-ov .kk .term .ok { color: #3fc97a; }
  #clip-ov .kk .term .dim { color: #7f9a8b; }
  #clip-ov .kk .bord { display: flex; gap: 2.4vw; }
  #clip-ov .kk .kol { flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(63,201,122,0.3); border-radius: 10px; padding: 2.4vh 1.6vw; min-height: 18vh; }
  #clip-ov .kk .kol h3 { font-weight: 400; margin: 0 0 1.4vh; font-size: min(4.2vh, 48px); letter-spacing: 0.12em; color: #a9c4b4; }
  #clip-ov .kk .kol b { display: block; font-weight: 400; font-size: min(11vh, 120px); line-height: 1; color: #3fc97a; }
  #clip-ov .kk .kol i { display: block; margin-top: 1.4vh; height: 1.1vh; border-radius: 1vh; background: #1e9e56; transform-origin: left; }
  #clip-ov .kk .fade { opacity: 0; transform: translateY(2vh); }
  `;
  document.head.appendChild(st);
}
const fmt = (n) => Math.round(n).toLocaleString('nl-NL');
const ease = (u) => { u = Math.max(0, Math.min(1, u)); return 1 - Math.pow(1 - u, 3); };
const reveal = (el, t, at, dur = 0.5) => { const u = ease((t - at) / dur); el.style.opacity = u; el.style.transform = `translateY(${(1 - u) * 2}vh)`; };
const fadeAll = (root, t, total) => { const u = Math.min(1, t / 0.3, (total - t) / 0.35); /* de kaart begint en eindigt hard (de montage knipt op de maat); de achtergrond blijft ondoorzichtig */ void u; };

// elke kaart: build(root) maakt de DOM en geeft draw(t) terug
const BUILD = {
  tekst: (r, a) => {
    r.innerHTML = (a.kop ? `<div class="kop fade">${a.kop}</div>` : '') + `<h1>${a.lines.map((l) => `<div class="fade">${l}</div>`).join('')}</h1>` + (a.sub ? `<h2 class="fade">${a.sub}</h2>` : '');
    const els = [...r.querySelectorAll('.fade')];
    return (t) => els.forEach((e, i) => reveal(e, t, 0.15 + i * (a.step ?? 0.55)));
  },
  cijfers: (r, a) => {
    r.innerHTML = (a.kop ? `<div class="kop fade">${a.kop}</div>` : '') + `<div class="rij">${a.items.map((it) => `<div class="cel fade"><b>0</b><span>${it.label}</span></div>`).join('')}</div>` + (a.sub ? `<h2 class="fade">${a.sub}</h2>` : '');
    const cells = [...r.querySelectorAll('.cel')], kop = r.querySelector('.kop'), sub = r.querySelector('h2');
    return (t) => {
      if (kop) reveal(kop, t, 0.05);
      cells.forEach((c, i) => { const at = 0.2 + i * (a.step ?? 0.45); reveal(c, t, at); const it = a.items[i]; const v = it.waarde != null ? it.waarde * ease((t - at) / 1.3) : null; c.querySelector('b').textContent = v != null ? fmt(v) + (it.suffix || '') : it.tekst; });
      if (sub) reveal(sub, t, 0.4 + cells.length * (a.step ?? 0.45));
    };
  },
  grafiek: (r, a) => {
    r.innerHTML = `<div class="kop fade">${a.kop || ''}</div><canvas width="1920" height="620"></canvas><h2 class="fade">${a.sub || ''}</h2>`;
    const cv = r.querySelector('canvas'), g = cv.getContext('2d'), kop = r.querySelector('.kop'), sub = r.querySelector('h2');
    const days = a.dagen, max = Math.max(...days.map((d) => d[1]));
    return (t) => {
      reveal(kop, t, 0.05); reveal(sub, t, 1.2);
      g.clearRect(0, 0, 1920, 620);
      const n = days.length, bw = 1920 / n, shown = Math.min(n, (n * ease((t - 0.3) / (a.groei ?? 2.4))));
      for (let i = 0; i < n; i++) {
        const f = Math.max(0, Math.min(1, shown - i));
        const h = (days[i][1] / max) * 560 * f;
        g.fillStyle = days[i][1] === max ? '#3fc97a' : '#1e9e56';
        g.fillRect(i * bw + bw * 0.12, 600 - h, bw * 0.76, h);
      }
      g.fillStyle = '#a9c4b4'; g.fillRect(0, 602, 1920, 2);
    };
  },
  sessies: (r, a) => {
    r.innerHTML = `<div class="kop fade">${a.kop || ''}</div><canvas width="1920" height="620"></canvas><h2 class="fade">${a.sub || ''}</h2>`;
    const cv = r.querySelector('canvas'), g = cv.getContext('2d'), kop = r.querySelector('.kop'), sub = r.querySelector('h2');
    const N = a.aantal, cols = Math.ceil(Math.sqrt(N * 3.1)), rows = Math.ceil(N / cols), s = Math.min(1920 / cols, 620 / rows);
    return (t) => {
      reveal(kop, t, 0.05); reveal(sub, t, 1.4);
      g.clearRect(0, 0, 1920, 620);
      const shown = Math.floor(N * ease((t - 0.3) / (a.groei ?? 2.2)));
      for (let i = 0; i < shown; i++) { const x = (i % cols) * s + s / 2, y = Math.floor(i / cols) * s + s / 2; g.fillStyle = i > shown - 12 ? '#e8f2ec' : '#3fc97a'; g.beginPath(); g.arc(x, y, s * 0.32, 0, 6.2832); g.fill(); }
    };
  },
  bord: (r, a) => {
    r.innerHTML = `<div class="kop fade">${a.kop || ''}</div><div class="bord">${a.kolommen.map((k) => `<div class="kol fade"><h3>${k.kop}</h3><b>0</b><i style="width:0"></i></div>`).join('')}</div><h2 class="fade">${a.sub || ''}</h2>`;
    const cols = [...r.querySelectorAll('.kol')], kop = r.querySelector('.kop'), sub = r.querySelector('h2'), max = Math.max(...a.kolommen.map((k) => k.waarde));
    return (t) => {
      reveal(kop, t, 0.05); reveal(sub, t, 1.6);
      cols.forEach((c, i) => { const at = 0.25 + i * 0.3; reveal(c, t, at); const v = a.kolommen[i].waarde * ease((t - at) / 1.2); c.querySelector('b').textContent = fmt(v); c.querySelector('i').style.width = (v / max * 100) + '%'; });
    };
  },
  balken: (r, a) => {
    r.innerHTML = `<div class="kop fade">${a.kop || ''}</div>${a.balken.map((b) => `<div class="fade" style="margin:2.4vh 0"><div class="kop" style="margin:0 0 1vh;color:${b.rood ? '#d93f3f' : '#3fc97a'}">${b.label}</div><i style="display:block;height:7vh;border-radius:1vh;width:0;background:${b.rood ? '#d93f3f' : '#1e9e56'}"></i><div style="font-size:min(6vh,64px);margin-top:1vh">${b.tekst}</div></div>`).join('')}<h2 class="fade">${a.sub || ''}</h2>`;
    const rows = [...r.querySelectorAll('.fade')], kop = rows[0], sub = rows[rows.length - 1], bars = a.balken.map((_, i) => rows[1 + i]);
    return (t) => {
      reveal(kop, t, 0.05); reveal(sub, t, 2.6);
      bars.forEach((e, i) => { const at = 0.4 + i * 0.9; reveal(e, t, at); e.querySelector('i').style.width = (a.balken[i].breedte * 80 * ease((t - at) / 1.4)) + 'vw'; });
    };
  },
  terminal: (r, a) => {
    r.innerHTML = `<div class="kop fade">${a.kop || ''}</div><div class="term"></div><h2 class="fade">${a.sub || ''}</h2>`;
    const term = r.querySelector('.term'), kop = r.querySelector('.kop'), sub = r.querySelector('h2');
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return (t) => {
      reveal(kop, t, 0.05); reveal(sub, t, 0.6 + a.regels.length * (a.step ?? 0.22));
      const n = Math.min(a.regels.length, Math.floor(Math.max(0, t - 0.3) / (a.step ?? 0.22)) + 1);
      term.innerHTML = a.regels.slice(0, n).map((l) => esc(l).replace(/^(✓|ok|PASS)/, '<span class="ok">$1</span>').replace(/^(\$ .*)$/, '<span class="dim">$1</span>')).join('\n');
    };
  },
};

shot('kaart', async (c) => {
  const a = ARG;
  css();
  await c.resetUi();
  c.hud(false);
  const ov = c.overlay();
  c.clearOverlay();
  document.getElementById('clip-ov').style.zIndex = '2147483000';
  const root = document.createElement('div');
  root.className = 'kk';
  ov.appendChild(root);
  const draw = BUILD[a.kind](root, a);
  draw(0); fadeAll(root, 0, a.dur);
  await c.settle({ label: 'kaart', frames: 3 });
  await c.begin(a.name);
  const n = Math.round(a.dur * 60);
  for (let i = 0; i < n; i++) {
    const t = i / 60;
    draw(t); fadeAll(root, t, a.dur);
    await c.cardFrame();
  }
  const r = await c.end();
  c.clearOverlay();
  return r;
});

// De slotkaart van de showcase-trailer: logo van het spel, titel, "gebouwd met AI" en een regel die de aanroeper meegeeft.
shot('slot', async (c) => {
  await c.resetUi();
  c.hud(false);
  await c.settle({ label: 'slot', frames: 3 });
  await c.begin(ARG.name || 'slot');
  c.endCard({ line: ARG.line || '', sub: ARG.sub || '', age: ARG.age !== false });
  const n = Math.round((ARG.dur || 8) * 60);
  for (let i = 0; i < n; i++) await c.cardFrame();
  const r = await c.end();
  c.clearOverlay();
  return r;
});
