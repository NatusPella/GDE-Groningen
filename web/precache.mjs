// #657: de service worker precachete alleen de pagina, web.js en de fonts; de
// ~892 losse JS-modules werden pas bij het eerste gebruik opgehaald. De build
// kent de bestandslijst al, dus die gaat mee de shell in: de eerste start haalt
// ze op de achtergrond binnen, een tweede bezoek en offline spelen lezen uit de
// cache. Pure functie, zodat de lijst los te testen is.
export function shellFiles(relFiles) {
  const out = ['', 'web.js'];
  for (const f of relFiles) {
    if (f === 'web.js' || f === 'sw.js' || f === '') continue;
    if (f.endsWith('.js') || f.endsWith('.mjs') || (f.startsWith('vendor/fonts/') && !out.includes(f))) {
      if (!out.includes(f)) out.push(f);
    }
  }
  return out;
}
