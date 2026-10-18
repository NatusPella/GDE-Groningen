// The picture behind the load screens and the boot screen: a calm low-poly
// scene drawn as inline SVG (faceted hills, a Groningen skyline with a tall
// church tower, a canal, slow clouds). No photo, no text. loadscreen.js and
// startscreen.js put it in; loadscreen.css moves the layers. Pure string
// builder: scripts/loadlogic_test.mjs checks the variants.

export const SCENES = ['dag', 'nacht', 'land', 'water'];

const PAL = {
  dag: { sky: ['#8fd0e0', '#e9f3d2'], sun: '#f6e27a', far: '#5aa078', mid: '#2f7a52', near: '#1b5a3a', wall: ['#c9876a', '#b0694f', '#d9a384'], roof: '#6b3f36', water: ['#3b8fa8', '#2c7790'] },
  nacht: { sky: ['#0d1b2f', '#2b3f5c'], sun: '#f0ede4', far: '#1c3a3a', mid: '#13302c', near: '#0b211f', wall: ['#3b3a4d', '#2d2c3d', '#47455c'], roof: '#1d1c2a', water: ['#16324a', '#0f2638'] },
};
PAL.land = { ...PAL.dag, sky: ['#9fd8e8', '#f1f0d0'], far: '#7ab57a', mid: '#4f9a5c', near: '#2d7a47' };
PAL.water = { ...PAL.dag, sky: ['#a9dbe6', '#f3efd5'] };

// small deterministic wobble so the facets are not a grid
const wob = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;

function ridge(y, amp, n, fill, k) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(`${(i / n * 1600).toFixed(0)},${(y - wob(i, k) * amp).toFixed(0)}`);
  return `<polygon fill="${fill}" points="0,900 ${pts.join(' ')} 1600,900"/>`;
}

function skyline(p, night) {
  let out = '', x = 90;
  for (let i = 0; i < 13; i++) {
    const w = 70 + wob(i, 3) * 60, h = 90 + wob(i, 5) * 150;
    const c = p.wall[i % 3];
    out += `<polygon fill="${c}" points="${x},610 ${x},${610 - h} ${x + w},${610 - h} ${x + w},610"/>`;
    out += `<polygon fill="${p.roof}" points="${x - 4},${610 - h} ${x + w / 2},${610 - h - 36 - wob(i, 7) * 30} ${x + w + 4},${610 - h}"/>`;
    if (night && i % 2) out += `<rect fill="#f6e27a" x="${x + 14}" y="${610 - h + 26}" width="12" height="16" opacity="0.85"/>`;
    x += w + 8 + wob(i, 9) * 14;
  }
  // the tall tower of the old town, slim and faceted
  out += `<path fill="${p.wall[1]}" d="M1030,610 L1030,250 L1052,216 L1074,250 L1074,610 Z"/><polygon fill="${p.wall[2]}" points="1052,216 1074,250 1074,610 1052,610"/>`;
  out += `<polygon fill="${p.roof}" points="1030,250 1052,120 1074,250"/><polygon fill="#00000022" points="1052,120 1074,250 1052,250"/>`;
  return out;
}

function windmill() {
  return '<g transform="translate(1150 640)"><polygon fill="#d9a384" points="-26,0 -14,-120 14,-120 26,0"/><polygon fill="#b0694f" points="0,-120 14,-120 26,0 0,0"/><g class="ls-sail" style="transform-origin:0 -120px"><polygon fill="#f0ede4" points="-4,-120 4,-120 10,-210 -10,-210"/><polygon fill="#f0ede4" points="-4,-120 -4,-128 -90,-134 -90,-110"/><polygon fill="#f0ede4" points="4,-120 4,-112 90,-106 90,-130"/><polygon fill="#f0ede4" points="-4,-120 4,-120 10,-30 -10,-30"/></g></g>';
}

function boat() {
  return '<g class="ls-boat"><polygon fill="#f0ede4" points="-90,0 90,0 62,26 -62,26"/><polygon fill="#d93f3f" points="-90,0 90,0 84,8 -84,8"/><polygon fill="#9fd8e8" points="-40,-34 40,-34 50,0 -50,0"/><polygon fill="#2f7a52" points="-46,-34 46,-34 40,-44 -40,-44"/></g>';
}

function canal(p) {
  let out = `<polygon fill="${p.water[0]}" points="0,690 1600,690 1600,900 0,900"/>`;
  for (let i = 0; i < 14; i++) {
    const x = wob(i, 11) * 1500, y = 710 + wob(i, 13) * 170, w = 50 + wob(i, 15) * 90;
    out += `<polygon class="ls-rip" fill="${p.water[1]}" points="${x.toFixed(0)},${y.toFixed(0)} ${(x + w).toFixed(0)},${y.toFixed(0)} ${(x + w - 18).toFixed(0)},${(y + 9).toFixed(0)} ${(x + 14).toFixed(0)},${(y + 9).toFixed(0)}"/>`;
  }
  return out;
}

function clouds(night) {
  const c = night ? '#2b3f5c' : '#ffffff';
  const one = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}" opacity="${night ? 0.9 : 0.8}"><polygon points="0,40 30,0 80,10 120,-6 170,20 190,40"/></g>`;
  return `<g class="ls-cloud a">${one(120, 150, 1)}${one(900, 90, 1.4)}</g><g class="ls-cloud b">${one(500, 230, 0.8)}${one(1250, 190, 1.1)}</g>`;
}

export function sceneSvg(variant = 'dag') {
  const v = SCENES.includes(variant) ? variant : 'dag';
  const night = v === 'nacht';
  const p = PAL[v];
  let body = `<defs><linearGradient id="ls-sky-${v}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>`;
  body += `<rect width="1600" height="900" fill="url(#ls-sky-${v})"/>`;
  if (night) for (let i = 0; i < 40; i++) body += `<rect fill="#f0ede4" x="${(wob(i, 1) * 1600).toFixed(0)}" y="${(wob(i, 2) * 380).toFixed(0)}" width="3" height="3" opacity="${(0.3 + wob(i, 4) * 0.6).toFixed(2)}"/>`;
  body += `<polygon class="ls-sun" fill="${p.sun}" points="260,150 300,110 350,110 390,150 390,200 350,240 300,240 260,200"/>`;
  body += clouds(night);
  body += ridge(560, 90, 16, p.far, 1);
  if (v === 'land') {
    body += ridge(640, 80, 12, p.mid, 2) + windmill() + ridge(760, 60, 10, p.near, 3);
    body += '<polygon fill="#4a4a52" points="0,820 1600,780 1600,830 0,880"/><polygon fill="#f0ede4" points="0,848 1600,806 1600,812 0,854" opacity="0.7"/>';
  } else {
    body += skyline(p, night) + canal(p);
    if (v === 'water') body += boat();
  }
  return `<svg class="ls-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// loadscreen.js pickImage names -> scene
export const SCENE_FOR = { vismarkt: 'dag', luchtfoto: 'dag', rondvaart: 'water', kermis: 'nacht', ringrace: 'land', achtervolging: 'nacht', duif: 'dag' };
export const sceneFor = (img) => SCENE_FOR[img] || 'dag';
