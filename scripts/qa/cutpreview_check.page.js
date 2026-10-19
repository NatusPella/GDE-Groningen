// Page half for `cutscene_shots.mjs --page=cutpreview_check.page.js` (#209): opens game/cutpreview.html in an
// iframe in the real app, checks the scene list, selects scenes and takes screenshots of the preview.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
document.body.innerHTML = '';
const fr = document.createElement('iframe');
fr.src = '/cutpreview.html';
fr.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:99999;background:#12141a';
document.body.appendChild(fr);
await sleep(6000);
const d = fr.contentDocument;
const out = { fouten: [] };
const buttons = [...d.querySelectorAll('#list button')];
out.scenes = buttons.length;
out.status = { ok: d.querySelectorAll('.dot.ok').length, waarschuwing: d.querySelectorAll('.dot.waarschuwing').length, fout: d.querySelectorAll('.dot.fout').length };
if (!buttons.length) out.fouten.push('lege lijst');
console.log('[capture] cutpreview-lijst');
await sleep(900);
for (const [k, label] of [[0, 'eerste'], [Math.min(12, buttons.length - 1), 'midden']]) {
  if (!buttons[k]) continue;
  buttons[k].click();
  await sleep(800);
  const range = d.querySelector('#bar input[type=range]');
  if (range) { range.value = String(Math.round(+range.max * 0.4)); range.dispatchEvent(new Event('input', { bubbles: true })); }
  await sleep(500);
  out['scene-' + label] = { naam: buttons[k].textContent.trim().slice(0, 60), info: (d.querySelector('#info') || {}).textContent?.slice(0, 160) };
  console.log('[capture] cutpreview-' + label);
  await sleep(900);
}
return JSON.stringify({ results: { cutpreview: out } });
