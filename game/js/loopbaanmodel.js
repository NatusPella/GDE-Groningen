// Het model achter het Loopbanen-overzicht (menu-ronde 21-11, #1010): elke loopbaan als kaart met niveau, voortgang, de volgende beloning en
// een duidelijke hoofdactie (Doorgaan of Nu starten), en per gekozen loopbaan de hoofdknop, de eis en wat het betaalt. Puur: geen DOM, geen
// wereld; het profiel en de lijst van nu te kiezen bijbanen komen van de aanroeper. loopbaanui.js tekent wat dit geeft;
// test: scripts/loopbaanmodel_test.mjs.
// Samen spelen: een loopbaan is van de speler zelf (eigen profiel, gde-loopbaan-v1); een gast ziet in dit scherm zijn eigen voortgang.
import * as L from './loopbaan.js';

export const ACTIE = {
  doorgaan: 'Doorgaan',
  starten: 'Nu starten',
  klaar: 'Hoogste niveau',
};

const pct = (deel) => Math.round(Math.max(0, Math.min(1, deel)) * 100);

// De beloning van het volgende niveau in gewone woorden: de nieuwe titel en wat het loon erbij stijgt.
export function volgendeBeloning(d) {
  if (!d || !d.volgend) return 'Hoogste niveau bereikt';
  const plus = L.percentage(L.factorVoorNiveau(d.volgendNiveau || d.niveau + 1));
  return plus > 0 ? `${d.volgend}: +${plus}% loon` : d.volgend;
}

// Eén vak als kaart.
export function vakKaart(profiel, info) {
  const d = L.volgendDoel(profiel, info.id);
  const gestart = L.isGestart(profiel, info.id);
  const actie = !gestart ? 'starten' : d.volgend ? 'doorgaan' : 'klaar';
  return {
    id: info.id, naam: info.naam, icoon: info.icoon, groep: info.groep,
    niveau: d.niveau, max: L.MAX_NIVEAU, titel: d.titel, gestart,
    deel: d.deel, pct: pct(d.deel), nodig: d.nodig, volgend: d.volgend,
    beloning: volgendeBeloning(d),
    actie, actieLabel: ACTIE[actie],
    stand: gestart ? `Niveau ${d.niveau} van ${L.MAX_NIVEAU}` : 'Nog niet begonnen',
  };
}

// De kaarten per groep, in de vaste volgorde van loopbaan.js (de lijst springt niet als je punten haalt).
export function vakKaarten(profiel) {
  return L.GROEPEN.map((g) => ({ groep: g, kaarten: L.VAKKEN.filter((v) => v.groep === g.id).map((v) => vakKaart(profiel, v)) }));
}

// Wat de gele knop van het detail doet. Een vak dat je niet begon, start nu (de eerste klus staat in de kaart eronder); een vak dat
// loopt wijst naar de volgende bijbaan als die nu te kiezen is, anders naar Activiteiten; het hoogste niveau heeft geen hoofdknop.
// `doelen`: de verzameling bijbanen die nu als doel te zetten zijn (todoui.baanDoelen).
export function hoofdActie(profiel, id, doelen = new Set()) {
  const info = L.vakInfo(id);
  if (!info) return null;
  const k = vakKaart(profiel, info);
  const stap = L.volgendeStap(profiel, id);
  if (!k.gestart) return { soort: 'start', label: ACTIE.starten, vak: id, hint: (L.startVan(id) || {}).klus ? `Eerste klus: ${L.startVan(id).klus}` : '' };
  if (!k.volgend) return { soort: 'klaar', label: ACTIE.klaar, vak: id, hint: stap ? stap.tekst : '' };
  const baan = stap && !stap.klaar && stap.waar && doelen.has(stap.waar) ? stap.waar : null;
  if (baan) return { soort: 'doel', label: ACTIE.doorgaan, vak: id, baan, hint: stap.tekst };
  return { soort: 'activiteiten', label: ACTIE.doorgaan, vak: id, hint: stap ? stap.tekst : 'Kijk bij Activiteiten wat er nu te doen is.' };
}

// De eis en de verdiensten van een vak, elk een korte zin: wat je nog moet halen, wat het betaalt en wat het volgende niveau erbij geeft.
export function eisEnVerdiensten(profiel, id) {
  const d = L.volgendDoel(profiel, id);
  const factor = L.loonFactor(profiel, id);
  const nu = factor > 1 ? `+${L.percentage(factor)}% loon` : 'basisloon';
  const eis = d.volgend ? `Nog ${d.nodig.toLocaleString('nl-NL')} punten tot ${d.volgend}` : 'Hoogste niveau bereikt';
  return { eis, verdiensten: nu, volgende: d.volgend ? volgendeBeloning(d) : '', deel: d.deel, pct: pct(d.deel), nodig: d.nodig };
}

// Het hele overzicht in één aanroep: de kaarten en hoeveel er begonnen zijn (voor de leeg-staat: nog niets begonnen).
export function overzicht(profiel) {
  const groepen = vakKaarten(profiel);
  const alle = groepen.flatMap((g) => g.kaarten);
  const begonnen = alle.filter((k) => k.gestart).length;
  return { groepen, begonnen, totaal: alle.length, leeg: begonnen === 0 };
}
