// Lichtproef voor de hoofdmenu-achtergrond: dezelfde baan op verschillende uren, met de mist en het weer erbij (28-11).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const wacht = async (fn, max = 240, stap = 500) => { for (let i = 0; i < max; i++) { try { if (fn()) return true; } catch (e) { /* nog niet */ } await sleep(stap); } return false; };
const out = ['licht'];
await sleep(800);
await wacht(() => document.body.classList.contains('hm-3d-klaar'), 400, 250);
await sleep(2500);
const w = window.__debug.world; const S3 = await imp('scene3d'); const sc = S3.getScene();
out.push('fog ' + (sc.fog ? sc.fog.constructor.name + ' ' + sc.fog.density + ' ' + (sc.fog.near || '') + '/' + (sc.fog.far || '') : 'geen'));
out.push('weather ' + JSON.stringify(w.weather).slice(0, 200));
const DN = await imp('daynight');
const lichten = () => { const r = []; sc.traverse((o) => { if (o.isLight) r.push(o.type + ' ' + (+o.intensity).toFixed(2) + ' #' + o.color.getHexString()); }); return r.join(', '); };
out.push('licht bij begin (klok ' + w.clock + ') ' + lichten() + ' exp ' + (S3.getRenderer().toneMappingExposure || 0).toFixed(2) + ' dn ' + JSON.stringify(w.dayNight));
for (const u of [4.8, 9]) {
  w.clock = u; DN.refreshDayNight(w); await sleep(3500);
  out.push('klok ' + u + ': ' + lichten() + ' exp ' + (S3.getRenderer().toneMappingExposure || 0).toFixed(2));
  console.log('[capture] licht-u' + String(u).replace('.', '_'));
  await sleep(1200);
}
const ov = document.getElementById('online-start');
out.push('voor: ' + getComputedStyle(ov, '::before').backgroundImage.slice(0, 160) + ' | na: ' + getComputedStyle(ov, '::after').opacity + ' | ov bg ' + getComputedStyle(ov).backgroundColor + ' | canvas ' + getComputedStyle(document.getElementById('game3d')).filter + ' ' + getComputedStyle(document.getElementById('game3d')).opacity);
out.push('punt: ' + document.elementsFromPoint(1500, 500).map((e) => e.tagName + (e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ').slice(0, 2).join('.') + ' bg=' + getComputedStyle(e).backgroundColor + ' bf=' + getComputedStyle(e).backdropFilter + ' op=' + getComputedStyle(e).opacity).join(' | '));
ov.style.display = 'none'; await sleep(1500);
console.log('[capture] licht-ruw'); await sleep(1200);
return JSON.stringify(out);
