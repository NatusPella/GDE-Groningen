// Pre-script voor scripts/qa/menufoto.mjs --boot (desktop --bench-eval, bij dom-ready): terwijl het eerste laadscherm (#loading) open staat
// elke 300 ms een screenshot en een regel met de stap en de statustekst ('[bootinfo] {...}'), zodat elke stap van het opstartscherm te vinden is.
(() => {
  let n = 0;
  const iv = setInterval(() => {
    const el = document.getElementById('loading');
    const info = { n, stap: el ? ((el.querySelector('.ld-bar') || {}).getAttribute?.('aria-valuetext') || '') : '', status: el ? ((el.querySelector('.ld-status') || {}).textContent || '').slice(0, 80) : '', balk: el && el.querySelector('.ld-fill') ? el.querySelector('.ld-fill').style.transform : '' };
    console.log('[bootinfo] ' + JSON.stringify(info));
    console.log('[bootcap] ' + String(n).padStart(2, '0'));
    n++;
    if (n > 90 || (el && el.classList.contains('done'))) clearInterval(iv);
  }, 300);
})();
