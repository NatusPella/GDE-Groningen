// YouTube channel art for GDE Groningen (docs/youtube/kanaal.md):
//   nice -n 10 node scripts/youtube_images.mjs              capture + compose
//   nice -n 10 node scripts/youtube_images.mjs --compose    only the images, from the saved renders
//   nice -n 10 node scripts/youtube_images.mjs --capture    only the vitrine render
// Same approach as scripts/steam_images.mjs (one dev server, one headless
// Chrome, HTML/CSS layouts with the real wordmark). Backgrounds: the Steam
// renders in docs/steam/beelden/ plus one render of our own, the Gouden
// Eierbal in its vitrine (trailer shot "De lege vitrine" with the ball put
// back and the thank-you card hidden, so no spoiler). Output: docs/youtube/beelden/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, launch, evaluate, waitFor, viewport, goto, shoot, frames, sleep, FONTS, LOGO_CSS, logo, SETTINGS_INIT, CLEAN_TRAILER_CSS } from './steam_images.mjs';

const OUT = path.join(ROOT, 'docs/youtube/beelden');
const SRC_DIR = path.join(OUT, 'bron');
const STEAM = path.join(ROOT, 'docs/steam/beelden');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const doCapture = flag('--capture') || (!flag('--compose') && !fs.existsSync(path.join(SRC_DIR, 'vitrine.jpg')));
const doCompose = flag('--compose') || !flag('--capture');
const PORT = Number(process.env.STEAM_PORT || 8797);

async function captureVitrine(c) {
  console.log('vitrine render');
  await viewport(c, 1920, 1080, 2);
  await goto(c, `http://127.0.0.1:${PORT}/?trailer&stil`);
  await waitFor(c, '!!window.__trailer', 240000);
  await evaluate(c, `(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(CLEAN_TRAILER_CSS)}; document.head.appendChild(s); return true; })()`);
  const shot = await evaluate(c, `window.__trailer.list().findIndex((l) => l.includes('vitrine')) + 1`);
  if (!shot) throw new Error('no vitrine shot in the trailer');
  const t = Number(process.env.VITRINE_T || 2.0);
  await evaluate(c, `window.__trailer.freeze(${shot}, ${t})`);
  await frames(c, Math.ceil(t * 60) + 90);
  // the ball back on its cushion, the "Tige tank!" card gone
  const ok = await evaluate(c, `(() => {
    const room = window.__trailer.prop('vitrine');
    if (!room) return false;
    const ball = room.userData.ball;
    ball.visible = true;
    // without an environment map the metal reads brown at night: lift the gold for the still
    ball.material = ball.material.clone();
    ball.material.metalness = 0.45; ball.material.roughness = 0.3;
    ball.material.emissive.setHex(0x8a5a0a); ball.material.emissiveIntensity = 0.9;
    // the additive light beam reads as a lampshade in a still
    for (const o of room.children) if (o.material && o.material.blending === 2) o.material.opacity = 0.035;
    const card = room.getObjectByName('tige-tank');
    if (card) card.visible = false;
    return !!card;
  })()`);
  if (!ok) throw new Error('vitrine prop or card not found');
  await sleep(2500);
  await frames(c, 30);
  await shoot(c, path.join(SRC_DIR, 'vitrine.jpg'), { jpeg: true });
  await viewport(c, 1920, 1080, 1);
}

const file = (p) => 'file://' + p;
const BASE_CSS = `${LOGO_CSS}
html, body { margin: 0; overflow: hidden; }
.bg { position: absolute; inset: 0; background-size: cover; background-repeat: no-repeat; }
.shade { position: absolute; inset: 0; }
.tag { display: inline-block; font: 400 1em/1 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 0.04em; color: #fff; background: #1e9e56; padding: 0.12em 0.32em 0.04em; border-radius: 0.08em; box-shadow: inset 0 0 0 0.04em #1e9e56, inset 0 0 0 0.08em #fff, 0 0.06em 0.25em rgba(0,0,0,0.6); }
.hook { font: italic 700 1em/1.05 'Arial Narrow', Arial, sans-serif; color: #f0ede4; text-shadow: 0 2px 10px rgba(0,0,0,0.9); }
.pill { display: inline-block; font: 400 1em/1 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 0.08em; color: #f0ede4; border: 0.06em solid #3fc97a; border-radius: 1em; padding: 0.22em 0.7em 0.12em; background: rgba(12,20,14,0.6); }
`;
const page = (w, h, body, css = '', bg = '#0c140e') => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE_CSS}
html, body { width: ${w}px; height: ${h}px; background: ${bg}; }
${css}</style></head><body>${body}</body></html>`;

// The GDE monogram on its plate, for the round avatar and the watermark.
const MARK_CSS = `
.mk { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.mk .m { font: 900 var(--s)/0.78 'Big Shoulders Display', sans-serif; padding-top: 0.06em; letter-spacing: 0.01em;
  background: linear-gradient(180deg, #f0ede4 0%, #f0ede4 52%, #3fc97a 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0.02em 0.04em rgba(0,0,0,0.75)); }
.mk .p { width: calc(var(--s) * 1.18); height: calc(var(--s) * 0.15); margin-top: calc(var(--s) * 0.1); border-radius: calc(var(--s) * 0.04); background: #1e9e56;
  box-shadow: inset 0 0 0 calc(var(--s) * 0.017) #1e9e56, inset 0 0 0 calc(var(--s) * 0.036) #fff, 0 calc(var(--s) * 0.02) calc(var(--s) * 0.06) rgba(0,0,0,0.5); }
`;

const IMAGES = [
  {
    // round crop on YouTube: everything inside the inner circle
    name: 'profielfoto', w: 800, h: 800, ext: 'png',
    html: () => page(800, 800, `<div class="mk" style="--s:330px"><span class="m">GDE</span><span class="p"></span></div>`,
      `${MARK_CSS} body { background: radial-gradient(circle at 50% 42%, #1d3a26 0%, #17301f 35%, #0c140e 72%); }`),
  },
  {
    // transparent, shown at ~10% of the player; a dark halo keeps it readable on light video
    name: 'watermerk', w: 150, h: 150, ext: 'png', transparent: true,
    html: () => page(150, 150, `<div class="mk" style="--s:78px"><span class="m">GDE</span><span class="p"></span></div>`,
      `${MARK_CSS} .mk .m { filter: drop-shadow(0 0 3px rgba(0,0,0,0.85)) drop-shadow(0 1px 1px rgba(0,0,0,0.9)); }`, 'transparent'),
  },
  {
    // 2560x1440; the centre 1546x423 is the only part every device shows
    name: 'banner', w: 2560, h: 1440, ext: 'jpg',
    html: (guides) => page(2560, 1440, `
      <div class="bg" style="background-image:url('${file(path.join(STEAM, 'bron/luchtfoto.jpg'))}');background-position:50% 48%"></div>
      <div class="shade" style="background:linear-gradient(180deg, rgba(8,16,11,0) 30%, rgba(8,16,11,0.62) 42%, rgba(8,16,11,0.62) 58%, rgba(8,16,11,0) 70%)"></div>
      <div class="safe"><div class="row">${logo('', false)}<div class="txt"><div class="hook">Zomer vol misdaad</div><div class="pill">Gratis · Nederlands</div></div></div></div>
      ${guides ? '<div class="g tv"></div><div class="g desk"></div><div class="g tab"></div><div class="g safe-line"></div><div class="lab">veilig 1546×423 · tablet 1855×423 · desktop 2560×423 · tv 2560×1440</div>' : ''}`,
    `.safe { position: absolute; left: 507px; top: 508.5px; width: 1546px; height: 423px; display: flex; align-items: center; justify-content: center; }
     .row { display: flex; align-items: center; gap: 70px; }
     .gde-logo { font-size: 250px; }
     .txt { display: flex; flex-direction: column; align-items: flex-start; gap: 34px; }
     .hook { font-size: 104px; color: #3fc97a; }
     .pill { font-size: 56px; }
     .g { position: absolute; box-sizing: border-box; border: 4px dashed; }
     .desk { left: 0; right: 0; top: 508.5px; height: 423px; border-color: #e8c93a; }
     .tab { left: 352.5px; width: 1855px; top: 508.5px; height: 423px; border-color: #ff8a3a; }
     .safe-line { left: 507px; width: 1546px; top: 508.5px; height: 423px; border: 6px solid #d93f3f; }
     .lab { position: absolute; left: 520px; top: 945px; font: 700 34px Arial, sans-serif; color: #fff; background: rgba(0,0,0,0.6); padding: 6px 12px; }`),
    guides: true,
  },
  {
    // the Eierbal in its vitrine on the right third, logo and label on the left
    name: 'thumbnail_verhaaltrailer', w: 1280, h: 720, ext: 'jpg',
    html: () => page(1280, 720, `
      <div class="bg" style="background-image:url('${file(path.join(SRC_DIR, 'vitrine.jpg'))}');background-size:140% auto;background-position:5% 85%"></div>
      <div class="shade" style="background:linear-gradient(90deg, rgba(8,16,11,0.85) 0%, rgba(8,16,11,0.6) 40%, rgba(8,16,11,0) 62%)"></div>
      <div class="col">${logo('big-sub', false)}<div class="hook">Twee Stadjers.<br>Eén Gouden Eierbal.</div><div class="tag">Verhaaltrailer</div></div>`,
    `.col { position: absolute; left: 60px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 34px; }
     .gde-logo { font-size: 200px; }
     .hook { font-size: 52px; }
     .tag { font-size: 64px; }`),
  },
  {
    // in-game with the HUD, the vitrine as a small inset (the story's goal, no spoiler)
    name: 'thumbnail_gameplaytrailer', w: 1280, h: 720, ext: 'jpg',
    html: () => page(1280, 720, `
      <div class="bg" style="background-image:url('${file(path.join(STEAM, 'screenshots/04-heli-hud.jpg'))}');background-position:50% 50%"></div>
      <div class="shade" style="background:linear-gradient(0deg, rgba(8,16,11,0.88) 0%, rgba(8,16,11,0.5) 34%, rgba(8,16,11,0) 58%)"></div>
      <div class="inset"></div>
      <div class="col">${logo('row', false)}<div class="line"><div class="tag">Gameplaytrailer</div><div class="hook">Rijden, varen, vliegen. In het echte Grunn.</div></div></div>`,
    `.inset { position: absolute; right: 48px; top: 44px; width: 300px; height: 300px; border-radius: 18px; background: url('${file(path.join(SRC_DIR, 'vitrine.jpg'))}') 50% 56% / 250% auto no-repeat; box-shadow: 0 0 0 6px #1e9e56, 0 0 0 10px #fff, 0 10px 30px rgba(0,0,0,0.6); }
     .col { position: absolute; left: 56px; right: 56px; bottom: 44px; display: flex; flex-direction: column; align-items: flex-start; gap: 22px; }
     .gde-logo { font-size: 150px; }
     .gde-logo.row { flex-direction: row; align-items: center; gap: 0.12em; }
     .gde-logo.row .gde-sign { margin-top: 0; font-size: 0.3em; }
     .line { display: flex; align-items: center; gap: 26px; }
     .tag { font-size: 60px; }
     .hook { font-size: 40px; }`),
  },
];

async function compose(c) {
  console.log('channel art');
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-yt-'));
  try {
    for (const img of IMAGES) {
      for (const guides of img.guides ? [false, true] : [false]) {
        const f = path.join(tmp, img.name + (guides ? '_gids' : '') + '.html');
        fs.writeFileSync(f, img.html(guides));
        await viewport(c, img.w, img.h, 1);
        await c.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: img.transparent ? 0 : 1 } });
        await goto(c, file(f));
        await evaluate(c, 'document.fonts.ready.then(() => true)');
        await sleep(400);
        const name = img.name + (guides ? '_veilige-zone' : '');
        await shoot(c, path.join(OUT, `${name}.${img.ext}`), img.ext === 'jpg' ? { jpeg: true } : { w: img.w, h: img.h });
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  await c.send('Emulation.setDefaultBackgroundColorOverride', {});
}

const { c, kill } = await launch();
try {
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: SETTINGS_INIT });
  if (doCapture) await captureVitrine(c);
  if (doCompose) await compose(c);
} finally {
  c.close();
  kill();
}
