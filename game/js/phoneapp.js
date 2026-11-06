// Welke app en welke afzender horen bij een telefoonmelding (#603). Puur en zonder DOM, zodat
// scripts/telefoon_berichten_test.mjs de regel kan nalezen.
//
// De app komt uit de afzender of uit wat de melder zelf meegeeft, nooit uit een €-teken in de
// tekst: een bericht van een winkel met een bedrag erin is geen bankmelding. Zonder afzender en
// zonder Kiekdoar-voorvoegsel heet de afzender gewoon "Bericht" in plaats van stil "Kiekdoar".
const APPS = ['sikkom', 'bericht', 'geld', 'bel', 'live'];
const KIEKDOAR = /^KIEKDOAR( MELDT)?:/i;

export function appForNote({ app = '', from = '', text = '' } = {}) {
  if (APPS.includes(app)) return app;
  return KIEKDOAR.test(String(text || '')) || /kiekdoar/i.test(String(from || '')) ? 'sikkom' : 'bericht';
}

export function senderForNote({ app = '', from = '', text = '' } = {}) {
  const f = String(from || '').trim();
  if (f) return f;
  const a = appForNote({ app, from, text });
  return a === 'sikkom' ? 'Kiekdoar' : a === 'geld' ? 'Bank' : 'Bericht';
}

// De afzender van een geschiedenisregel. Oudere regels (van voor `from` bestond) dragen de
// afzender in de tekst: "Henk: ...", "Gesprek · Henk: ...".
export function senderOf(e) {
  if (e && e.from) return e.from;
  const m = /^(?:(?:Gesprek|Live) · )?([^:]{2,32}?)(?: (?:belde|sprak in|was live|op Kiekdoar|liet een kaartje achter|op Nachtstreek))?: /.exec((e && e.text) || '');
  return m ? m[1] : 'Kiekdoar';
}

export function bodyOf(e) {
  if (!e) return '';
  if (e.body) return e.body;
  const m = /^(?:(?:Gesprek|Live) · )?[^:]{2,32}: (.*)$/s.exec(e.text || '');
  return m ? m[1] : String(e.text || '');
}
