// Laden met terugval (#1073). applySave past de wereld stap voor stap aan; een fout in een late
// stap liet de eerdere stappen toegepast en de autosave schreef die gemengde stand weg. Hier
// staat de pure beslissing: probeer de lading, zet bij een fout de stand van vóór de lading terug
// en meld alleen als ook dat mislukt dat de wereld onbetrouwbaar is (dan moet bewaren uit).
//
// apply(data) past een save toe en gooit bij een fout; snapshot is de serialisatie van de stand
// van vóór de lading (of null als die niet te maken was).

// Uitkomst: { ok, teruggezet, kapot }
//  ok         de nieuwe save is toegepast
//  teruggezet de lading mislukte, maar de oude stand staat er weer in (bewaren mag door)
//  kapot      de lading mislukte en de terugval ook: de wereld is gemengd, bewaren hoort uit
export function laadMetTerugval(apply, data, snapshot, log = () => {}) {
  try {
    apply(data);
    return { ok: true, teruggezet: false, kapot: false };
  } catch (e) {
    log('Laden van het opgeslagen spel mislukt', e);
  }
  if (snapshot) {
    try {
      apply(snapshot);
      return { ok: false, teruggezet: true, kapot: false };
    } catch (e) {
      log('Terugzetten na mislukte lading mislukt', e);
    }
  }
  return { ok: false, teruggezet: false, kapot: true };
}

export const BEWAREN_UIT_TEKST = 'Het laden is mislukt en je spel staat nu half geladen. Er wordt niets bewaard: je vorige opgeslagen spel blijft heel. Laad een opgeslagen spel of start het spel opnieuw.';
