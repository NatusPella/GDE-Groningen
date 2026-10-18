// Pre-script for scripts/qa/boot_shots.mjs (desktop --bench-eval, at dom-ready): while the first loading
// screen (index.html #loading) is up, ask for a screenshot every 400 ms and log what it shows
// ('[bootinfo] {...}': progress bars, the 18 pictogram, status text).
(() => {
  let n = 0;
  const iv = setInterval(() => {
    const el = document.getElementById('loading');
    const info = {
      n, loading: !!el && !el.classList.contains('done'),
      bars: el ? el.querySelectorAll('.ld-bar, progress, [role=progressbar]').length : 0,
      fills: el ? el.querySelectorAll('.ld-fill').length : 0,
      pictogram18: el ? /(^|\s)18(\s|$)/.test(el.innerText || '') || !!el.querySelector('[class*=pegi], [class*=age], img[src*=18]') : false,
      status: el ? ((el.querySelector('.ld-status') || {}).textContent || '').slice(0, 60) : '',
    };
    console.log('[bootinfo] ' + JSON.stringify(info));
    console.log('[bootcap] ' + String(n).padStart(2, '0'));
    n++;
    if (n > 40 || (el && el.classList.contains('done'))) clearInterval(iv);
  }, 400);
})();
