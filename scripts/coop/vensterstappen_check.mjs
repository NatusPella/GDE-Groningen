// De keuring van de venstertests van #1061 (Fatbikes ontwijken, penaltyserie, duivenspot, plaatsborden, hostwissel tijdens een filmpje, Besloten spelen):
// wat elk Electron-venster logde, als lijst fouten. Puur: geen Electron, geen netwerk. De stappen zelf staan in scripts/coop/coop.page.js
// (fatbikes, penaltyserie, duivenspot, plaatsbord, filmpjewissel, besloten); de testbank (scripts/coop/testbank.mjs) roept keurVenster aan.
// E = { host: [event], gast: [event], gast2: [event], gast3: [event] }; een event is { type, ...velden }. Een lege lijst of ontbrekend venster telt niet mee.

const lijst = (E, n) => (Array.isArray(E[n]) ? E[n] : []);
const eerste = (E, n, type, pred = () => true) => lijst(E, n).find((e) => e.type === type && pred(e)) || null;
const alle = (E, n, type) => lijst(E, n).filter((e) => e.type === type);
const gasten = (E) => ['gast', 'gast2', 'gast3'].filter((n) => lijst(E, n).length);

// Fatbikes ontwijken (M08): de host loopt de baan met de spelbot; wie meedoet ziet zijn eigen teller; niemand heeft meer treffers dan de grens.
export function keurFatbikes(E) {
  const f = [];
  const fout = eerste(E, 'host', 'fatbikes-bot-fout');
  if (fout) f.push('fatbikes: de spelbot van de host faalde: ' + fout.msg);
  const hs = alle(E, 'host', 'fatbikes-stand');
  if (!hs.length) f.push('fatbikes: de host logde geen stand');
  else if (!hs.some((s) => s.opdracht && s.opdracht.actief)) f.push('fatbikes: de opdracht (M08) liep nooit bij de host');
  else if (!hs.some((s) => s.hud)) f.push('fatbikes: de host zag de ontweek-regel nooit in het HUD');
  for (const n of gasten(E)) {
    const gs = alle(E, n, 'fatbikes-stand');
    if (!gs.length) { f.push(`fatbikes: ${n} logde geen stand`); continue; }
    if (!gs.some((s) => (s.opdracht && s.opdracht.actief) || s.hud)) f.push(`fatbikes: ${n} zag de opdracht van de groep nooit (geen opdrachtstand, geen ontweek-regel)`);
  }
  for (const n of ['host', ...gasten(E)]) for (const s of alle(E, n, 'fatbikes-stand')) if (s.hud && s.hud.geraakt > s.hud.grens) f.push(`fatbikes: ${n} heeft ${s.hud.geraakt} treffers boven de grens ${s.hud.grens}`);
  return f;
}

// Penaltyserie (#981): de host nodigt uit, iedereen schiet zijn eigen vijf, de host houdt de ranglijst met een rij per speler.
export function keurPenalty(E) {
  const f = [];
  if (eerste(E, 'host', 'pen-geen-poort')) return ['penaltyserie: het debug-handvat of de poort ontbreekt bij de host'];
  const u = eerste(E, 'host', 'pen-uitnodiging');
  if (!u) f.push('penaltyserie: de host logde de uitnodiging niet');
  else if (!u.wed) f.push('penaltyserie: de uitnodiging kwam er niet (E bij de poort)');
  const doen = [];
  for (const n of ['host', ...gasten(E)]) {
    const r = eerste(E, n, 'pen-reeks');
    if (!r) { f.push(`penaltyserie: ${n} schoot geen reeks`); continue; }
    doen.push(n);
    if (r.genomen !== 5) f.push(`penaltyserie: ${n} nam ${r.genomen} penalty's in plaats van vijf`);
    if (!(r.goals >= 0 && r.goals <= 5)) f.push(`penaltyserie: ${n} heeft ${r.goals} doelpunten (buiten 0 tot 5)`);
  }
  for (const n of gasten(E)) {
    if (!eerste(E, n, 'pen-uitnodiging-gast')) f.push(`penaltyserie: ${n} kreeg geen uitnodiging`);
    const u2 = eerste(E, n, 'pen-uitslag-gast');
    if (!u2 || !u2.uitslag) f.push(`penaltyserie: ${n} kreeg geen uitslag van de host`);
    else if (!(u2.geldErbij >= 0)) f.push(`penaltyserie: ${n} verloor geld bij de uitslag (${u2.geldErbij})`);
  }
  const us = eerste(E, 'host', 'pen-uitslag');
  if (!us || !Array.isArray(us.rijen)) f.push('penaltyserie: de host kreeg geen ranglijst');
  else if (us.rijen.length < doen.length) f.push(`penaltyserie: de ranglijst heeft ${us.rijen.length} rijen voor ${doen.length} spelers`);
  return f;
}

// Duivenspot: alleen de host heeft de gids; een gast ziet geen gids en zit zelf niet in de duifmodus.
export function keurDuif(E) {
  const f = [];
  if (eerste(E, 'host', 'duif-geen-spot')) return ['duivenspot: er is geen duivenspot in de wereld'];
  const h = eerste(E, 'host', 'duif-host');
  if (!h) f.push('duivenspot: de host logde niets');
  else if (h.gestart !== true || !h.actief) f.push('duivenspot: de host kwam niet in de duifmodus (' + JSON.stringify({ gestart: h.gestart, actief: h.actief }) + ')');
  const na = eerste(E, 'host', 'duif-host-na');
  if (na && na.actief) f.push('duivenspot: de duifmodus van de host stopte niet');
  for (const n of gasten(E)) {
    const g = eerste(E, n, 'duif-gast');
    if (!g) { f.push(`duivenspot: ${n} logde niets`); continue; }
    if (g.gids) f.push(`duivenspot: ${n} ziet de gids van de host (hoort alleen bij de host)`);
    if (g.pigeonMode) f.push(`duivenspot: ${n} zit zelf in de duifmodus`);
  }
  return f;
}

// Plaatsbord of wegwijzer omver: de host breekt een echt bord; elke gast heeft dezelfde sleutel kapot.
export function keurBord(E) {
  const f = [];
  if (eerste(E, 'host', 'bord-geen')) return ['plaatsbord: er staat geen plaatsbord of wegwijzer binnen 900 m'];
  const h = eerste(E, 'host', 'bord-host');
  if (!h) return ['plaatsbord: de host logde niets'];
  if (!['placesign', 'wegwijzer'].includes(h.soort)) f.push('plaatsbord: de host brak een ' + h.soort + ' in plaats van een plaatsbord of wegwijzer');
  if (!h.gebroken || !h.nu) f.push('plaatsbord: het bord ' + h.key + ' is bij de host niet kapot gegaan');
  for (const n of gasten(E)) {
    const g = eerste(E, n, 'bord-gast');
    if (!g) { f.push(`plaatsbord: ${n} logde niets`); continue; }
    const rij = Array.isArray(g.borden) ? g.borden.find((b) => b[0] === h.key) : null;
    if (!rij) f.push(`plaatsbord: ${n} heeft ${h.key} niet in zijn kapot-lijst (${JSON.stringify(g.borden)})`);
    else if (!rij[1]) f.push(`plaatsbord: ${n} heeft ${h.key} in de lijst maar het bord is bij hem niet echt weg`);
  }
  return f;
}

// Hostwissel tijdens een filmpje: de knop weigert zolang het filmpje loopt, en lukt erna.
export function keurFilmpjeWissel(E) {
  const f = [];
  const w = eerste(E, 'host', 'wissel-tijdens-filmpje');
  if (!w) return ['filmpjewissel: de host logde niets'];
  if (!w.actief) f.push('filmpjewissel: het filmpje liep niet toen de overdracht werd aangeboden (de test bewijst dan niets)');
  if (!w.weiger || w.weiger.ok !== false) f.push('filmpjewissel: de overdracht werd tijdens het filmpje niet geweigerd');
  else if (!/Wacht tot het filmpje voorbij is/.test(String(w.weiger.tekst))) f.push('filmpjewissel: de weigering heeft een andere tekst: ' + w.weiger.tekst);
  const na = eerste(E, 'host', 'wissel-na-filmpje');
  if (!na) f.push('filmpjewissel: de host bood na het filmpje niets meer aan');
  else if (na.actief) f.push('filmpjewissel: het filmpje liep nog na de wachttijd');
  else if (na.ok !== true) f.push('filmpjewissel: de overdracht na het filmpje lukte niet: ' + na.tekst);
  if (na && na.ok === true && !eerste(E, 'gast', 'wissel-j')) f.push('filmpjewissel: de gast kreeg de vraag om de host over te nemen niet');
  return f;
}

// Besloten spelen: het keuzescherm van het pauzemenu buiten een sessie, drie kaarten binnen het scherm en niet afgekapt.
export function keurBesloten(E) {
  const f = [];
  if (eerste(E, 'host', 'besloten-in-sessie')) return ['besloten: de host zat nog in een sessie, het keuzescherm is niet in beeld gekomen'];
  const h = eerste(E, 'host', 'besloten-hub');
  if (!h) return ['besloten: de host logde het keuzescherm niet'];
  const k = Array.isArray(h.kaarten) ? h.kaarten : [];
  if (k.length < 3) f.push(`besloten: het keuzescherm heeft ${k.length} kaarten in plaats van drie`);
  if (!k.some((x) => x.label === 'Besloten spelen')) f.push('besloten: de kaart "Besloten spelen" ontbreekt');
  for (const x of k) {
    if (!x.binnen) f.push(`besloten: de kaart "${x.label}" valt buiten het scherm (${JSON.stringify(h.venster)})`);
    if (x.titelAfgekapt) f.push(`besloten: de titel "${x.label}" is afgekapt`);
    if (x.kaartAfgekapt) f.push(`besloten: de kaart "${x.label}" is afgekapt`);
  }
  return f;
}

export const VENSTER_SUITES = { fatbikes: keurFatbikes, penaltyserie: keurPenalty, duivenspot: keurDuif, plaatsbord: keurBord, filmpjewissel: keurFilmpjeWissel, besloten: keurBesloten };
// de suite 'venster' draait alle stappen na elkaar
export const keurVenster = (suite, E) => (suite === 'venster' ? Object.values(VENSTER_SUITES).flatMap((k) => k(E)) : VENSTER_SUITES[suite] ? VENSTER_SUITES[suite](E) : []);
