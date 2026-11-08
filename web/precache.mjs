// #757: de service worker precacht alleen de schil: de pagina, de loader en de
// fonts. Sinds #657 zaten alle ~892 JS-modules er ook in, en die werden bij
// install met cache: 'no-cache' nog eens opgehaald, bovenop de download die de
// pagina zelf al doet. Een module komt nu via cacheFirst bij het eerste gebruik
// in de cache; dat fetchpad bestaat al. Pure functie, zodat de lijst los te
// testen is.
export function shellFiles(relFiles) {
  const out = ['', 'web.js'];
  for (const f of relFiles) {
    if (f.startsWith('vendor/fonts/') && !out.includes(f)) out.push(f);
  }
  return out;
}
