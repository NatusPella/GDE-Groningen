// Samen spelen: de regels achter het spelersmenu (docs/SPELERSMENU-UX-21-11.md). Pure logica, geen DOM, geen netwerk:
// de status per speler als korte plaatjes (woord plus vorm, nooit alleen kleur), de Spel-starten-knop met zijn
// voortgang, foutmeldingen in gewone taal en de compacte regel voor de Tab-lijst. De weergave staat in
// coopspelersui.js (lijst en Tab) en lobbyui.js (wachtkamer); de tekst van een fout in lobby.js.
//   node scripts/playerstatus_test.mjs

// ---- de richting en afstand van een andere speler, voor de Tab-lijst
const WINDSTREKEN = [
  ['oost', '→'], ['zuidoost', '↘'], ['zuid', '↓'], ['zuidwest', '↙'], ['west', '←'], ['noordwest', '↖'], ['noord', '↑'], ['noordoost', '↗'],
];
// de wereld heeft y naar het zuiden (missionmap.js compassOf); een speler zonder bekende plek geeft null
export function richtingVan(van, naar) {
  if (!van || !naar || ![van.x, van.y, naar.x, naar.y].every(Number.isFinite)) return null;
  const a = Math.atan2(naar.y - van.y, naar.x - van.x);
  const [woord, pijl] = WINDSTREKEN[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  return { woord, pijl };
}

// ---- de status van één speler
// r: een rij uit coopspelers.js spelersRijen. ctx: { wachtkamer: bool (het spel is nog niet begonnen), versie }
// Elk plaatje: { id, tekst, soort: 'goed' | 'let-op' | 'slecht' | 'neutraal', icoon }. Het woord is altijd de hoofdzaak.
export function statusVan(r, ctx = {}) {
  if (!r) return [];
  const uit = [];
  if (r.slot === 0) uit.push({ id: 'opent', tekst: 'Opende het spel', soort: 'neutraal', icoon: 'kroon' });
  if (r.verbinding === 'lost') uit.push({ id: 'verbinding', tekst: 'Verbinding weg', soort: 'slecht', icoon: 'wifi_uit' });
  else if (r.verbinding === 'lag') uit.push({ id: 'verbinding', tekst: `Haperd${Number.isFinite(r.ms) ? ` · ${r.ms} ms` : ''}`, soort: 'let-op', icoon: 'wifi' });
  else uit.push({ id: 'verbinding', tekst: Number.isFinite(r.ms) ? `Verbonden · ${r.ms} ms` : 'Verbonden', soort: 'goed', icoon: 'wifi' });
  if (ctx.wachtkamer) {
    uit.push(r.verbinding === 'lost'
      ? { id: 'klaar', tekst: 'Niet bereikbaar', soort: 'slecht', icoon: 'zandloper' }
      : { id: 'klaar', tekst: 'In de wachtkamer', soort: 'goed', icoon: 'vinkje' });
  }
  if (typeof r.passief === 'boolean') uit.push({ id: 'passief', tekst: r.passief ? 'Passief' : 'Actief', soort: r.passief ? 'neutraal' : 'let-op', icoon: r.passief ? 'schild' : 'zwaard' });
  return uit;
}

// Eén zin bovenaan: dezelfde versie voor elke speler. Een andere versie komt de sessie niet in (de kennismaking weigert hem).
export const versieRegel = (versie) => (versie ? `Versie ${versie}, bij elke speler gelijk.` : '');

// ---- Spel starten (wie het spel opende, in de wachtkamer)
const MIN_START = 2;
export const START_LANG_NA_S = 10; // daarna zeggen we dat het langer duurt dan gewoonlijk (de gastheer kan 10 tot 57 s stilstaan)
// ctx: { rol: 'host' | 'gast', spelers: [{ naam, verbinding }], bezig: bool, bezigS: seconden, gevraagd: bool (gast vroeg de start), opener }
// Geeft { label, disabled, busy, hint }. Actief alleen als er minstens twee spelers zijn en niemand ontbreekt:
// wie is weggevallen, moet terugkomen of eruit gezet worden.
export function startKnop({ rol = 'host', spelers = [], bezig = false, bezigS = 0, gevraagd = false, opener = 'de ander' } = {}) {
  const lijst = Array.isArray(spelers) ? spelers : [];
  const weg = lijst.filter((p) => p && p.verbinding === 'lost');
  const aanwezig = lijst.length - weg.length;
  if (bezig) {
    return { label: 'Spel wordt gestart…', disabled: true, busy: true,
      hint: bezigS >= START_LANG_NA_S ? 'Dit duurt wat langer dan normaal. Het scherm hangt niet: de wereld wordt geladen voor alle spelers.' : 'Even geduld: de wereld wordt geladen voor alle spelers.' };
  }
  if (rol === 'gast') {
    if (gevraagd) return { label: 'Start gevraagd', disabled: true, busy: false, hint: `Wachten tot ${opener} het spel start.` };
    return { label: 'Vraag om te starten', disabled: aanwezig < MIN_START || weg.length > 0, busy: false, hint: `Wachten tot ${opener} het spel start.` };
  }
  if (aanwezig < MIN_START) return { label: 'Spel starten', disabled: true, busy: false, hint: 'Wacht op een medespeler: starten kan met minstens twee spelers.' };
  if (weg.length) {
    const namen = weg.map((p) => p.naam || 'Een speler').join(' en ');
    return { label: 'Spel starten', disabled: true, busy: false, hint: `${namen} is niet bereikbaar. Wacht tot de verbinding terug is of zet de speler eruit.` };
  }
  return { label: 'Spel starten', disabled: false, busy: false, hint: `Alle ${lijst.length} spelers zijn er. Jullie zien de opening samen.` };
}

// Een tweede klik tijdens het starten is nooit goed: de aanroeper kijkt eerst hier.
export const magStarten = (knop, bezig) => !!knop && !knop.disabled && !bezig;

// ---- foutmeldingen in gewone taal: een titel, wat er is, wat je kunt doen, en de knop die helpt
// reden: de s.reason van lobby.js ('versie', 'vol', 'time-out', ...) of 'weg' (de verbinding viel weg tijdens het spel)
const FOUTEN = {
  versie: { titel: 'Andere versie', tekst: 'Jij en de ander spelen niet dezelfde versie van het spel.', doe: 'Installeer allebei de nieuwste versie en probeer het opnieuw.', knop: 'Terug' },
  protocol: { titel: 'Andere versie', tekst: 'Jij en de ander spelen niet dezelfde versie van Samen spelen.', doe: 'Installeer allebei de nieuwste versie en probeer het opnieuw.', knop: 'Terug' },
  vol: { titel: 'Kamer vol', tekst: 'Er is geen plek meer in deze sessie.', doe: 'Vraag wie het spel opende om meer plek te maken, of een speler eruit te zetten.', knop: 'Terug' },
  'time-out': { titel: 'Verbinden mislukt', tekst: 'De ander antwoordt niet.', doe: 'Staat het spel open en is het klaar met laden? Controleer de code en probeer het over een halve minuut opnieuw.', knop: 'Opnieuw proberen' },
  gesloten: { titel: 'Verbinden mislukt', tekst: 'De verbinding is gesloten.', doe: 'Is het spel vol of gestopt? Vraag de ander om te kijken en probeer het opnieuw.', knop: 'Opnieuw proberen' },
  wachtwoord: { titel: 'Wachtwoord nodig', tekst: 'Deze sessie heeft een wachtwoord.', doe: 'Vraag het aan wie het spel opende en vul het hieronder in.', knop: 'Opnieuw proberen' },
  verbod: { titel: 'Je bent verwijderd', tekst: 'Wie het spel opende, heeft je uit deze sessie gezet.', doe: 'Je speelt weer in je eigen spel. Vraag om een nieuwe kamercode als je weer mee wilt doen.', knop: 'Terug' },
  tegels: { titel: 'Andere wereld', tekst: 'De wereldbestanden verschillen tussen jullie spellen.', doe: 'Werk allebei het spel bij en probeer het opnieuw.', knop: 'Terug' },
  verhaal: { titel: 'Ander verhaal', tekst: 'Jullie verhaal staat niet gelijk.', doe: 'Kies aan beide kanten hetzelfde verhaal.', knop: 'Terug' },
  spel: { titel: 'Verbinden mislukt', tekst: 'Dit is niet hetzelfde spel.', doe: 'Controleer de code.', knop: 'Terug' },
  token: { titel: 'Verbinden mislukt', tekst: 'Deze verbinding kan niet worden hervat.', doe: 'Sluit opnieuw aan met de kamercode.', knop: 'Terug' },
  weg: { titel: 'Verbinding verbroken', tekst: 'De verbinding met de sessie viel weg.', doe: 'Je kunt opnieuw verbinden. Lukt dat niet, stop dan: je komt terug waar je was in je eigen spel.', knop: 'Opnieuw verbinden' },
};
const FOUT_ONBEKEND = { titel: 'Verbinden mislukt', tekst: 'Het koppelen is niet gelukt.', doe: 'Probeer het opnieuw, of kies Verbinding testen om te zien wat er mis is.', knop: 'Terug' };
export function foutUitleg(reden, { versie = '', andereVersie = '' } = {}) {
  const f = { ...(typeof reden === 'string' && Object.hasOwn(FOUTEN, reden) ? FOUTEN[reden] : FOUT_ONBEKEND) }; // een reden van het net is tekst van een ander: geen prototype-sleutels als 'constructor'
  if ((reden === 'versie' || reden === 'protocol') && andereVersie) f.tekst = `Jij speelt versie ${versie || '?'}, de ander versie ${andereVersie}.`;
  return f;
}

// ---- de kamercode groot en kopieerbaar
export const KOPIEER = { knop: 'Kopieer de code', klaar: 'Gekopieerd', mislukt: 'Kopiëren lukte niet: selecteer de code en kopieer hem zelf.', rapportKlaar: 'Het rapport is gekopieerd. Plak het in een bericht.', rapportMislukt: 'Kopiëren lukte niet. Maak een schermafbeelding van deze uitslag en stuur die mee.' };

// ---- de compacte regel van de Tab-lijst: naam, kleur, ping, afstand en richting, klaar
// r: een rij uit spelersRijen; ctx: { wachtkamer }
export function tabRegel(r, ctx = {}) {
  const richting = r.richting || null;
  const afstand = r.jij ? '' : [r.afstandTekst, richting ? richting.pijl : ''].filter(Boolean).join(' ');
  return {
    slot: r.slot, naam: r.naam, kleur: r.kleur, vorm: r.vorm, jij: !!r.jij,
    ping: r.verbinding === 'lost' ? 'weg' : Number.isFinite(r.ms) ? `${r.ms} ms` : '',
    verbinding: r.verbinding || 'ok',
    afstand, afstandWoord: !r.jij && richting ? richting.woord : '',
    klaar: ctx.wachtkamer ? r.verbinding !== 'lost' : null,
    passief: typeof r.passief === 'boolean' ? r.passief : null,
  };
}

// Dempen en blokkeren (#1159, multiplayerphrases.js): per speler, alleen in het geheugen en op naam, zonder opslag.
// Dempen: geen zinnen en emotes van die speler. Blokkeren: ook geen pings en gedeelde doelen.
export const MUTE_ACTIONS = [
  { id: 'gedempt', icoon: 'geluid_uit', label: 'Dempen', uitleg: 'Je ziet geen zinnen en emotes meer van deze speler. Pings en doelen blijven.' },
  { id: 'geblokkeerd', icoon: 'stop', label: 'Blokkeren', uitleg: 'Je ziet geen zinnen, emotes, pings of gedeelde doelen meer van deze speler.' },
];

// ---- de hint "Spelers · 2" in de HUD: geen knop, want in het spel is de muis vergrendeld en een klik doet niets
// De lijst opent met Tab (controller: de toets die controls.js daarvoor kent). Eerst even volledig zichtbaar na het aansluiten
// en bij elke verandering in het aantal spelers, daarna een minimale indicator (pictogram en aantal).
export const HINT = { volMs: 8000, label: 'Spelers' };
export const hintTekst = (aantal) => {
  const n = Number.isFinite(aantal) ? Math.max(0, Math.round(aantal)) : 0;
  return n > 0 ? `${HINT.label} · ${n}` : HINT.label;
};
// vorige: { aantal, sinds } of null; geeft de nieuwe waarde terug (sinds springt mee als het aantal verandert)
export const volgHint = (vorige, aantal, nu) => (vorige && vorige.aantal === aantal ? vorige : { aantal, sinds: nu });
// ctx: { aantal, sinds, nu, vergrendeld (de muis is vastgezet), open (de lijst staat open) }
// stand: 'weg' (geen sessie) | 'vol' (chip met Tab-icoon en tekst) | 'dim' (alleen pictogram en aantal)
// klikbaar: alleen als de muis vrij is (menu, kaart, aanraken) of de lijst open staat; anders is het een hint en geen knop
export function hintStand({ aantal = 0, sinds = 0, nu = 0, vergrendeld = true, open = false } = {}) {
  if (!(aantal > 0)) return { stand: 'weg', klikbaar: false };
  const klikbaar = !vergrendeld || !!open;
  const vers = nu - sinds < HINT.volMs;
  return { stand: vers || klikbaar ? 'vol' : 'dim', klikbaar };
}
