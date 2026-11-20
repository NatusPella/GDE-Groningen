// Eén compacte verticale stapel voor de kaarten bovenin beeld (AAA, duivenspot en museum): uitleg, spotopdracht, hoogtekaart,
// ondertitel en naamplaten lagen over elkaar omdat elke kaart zijn eigen vaste top kreeg. Hier staat de regel, puur (geen DOM):
//
//   stapel(kaarten, { top, ruimte, gap })   welke kaarten blijven, op welke top, en welke vallen weg
//
// kaart: { id, prio, h, compactH?, nodig? }  prio: hoger is belangrijker; h: hoogte in px; compactH: de hoogte als de kaart
// compact getekend wordt (de uitleg zonder doelzin); nodig: false = de kaart is nu niet nodig en valt automatisch weg.
// De volgorde van de lijst is de volgorde van boven naar beneden. Past de stapel niet in `ruimte`, dan worden eerst de kaarten met
// de laagste prio compact, en daarna weggelaten (laagste prio eerst); de kaart met de hoogste prio blijft altijd.
export const STAPEL_TOP = 204;   // px: onder de missieregel en de meters
export const STAPEL_GAP = 8;

const eindig = (v) => typeof v === 'number' && Number.isFinite(v);

export function stapel(kaarten, { top = STAPEL_TOP, ruimte = 260, gap = STAPEL_GAP } = {}) {
  const lijst = (Array.isArray(kaarten) ? kaarten : []).filter((k) => k && k.id && eindig(k.h) && k.nodig !== false)
    .map((k) => ({ id: k.id, prio: eindig(k.prio) ? k.prio : 0, h: k.h, compactH: eindig(k.compactH) && k.compactH < k.h ? k.compactH : null, compact: false, weg: false }));
  const weg = (Array.isArray(kaarten) ? kaarten : []).filter((k) => k && k.id && k.nodig === false).map((k) => k.id);
  const hoogte = () => {
    const zicht = lijst.filter((k) => !k.weg);
    return zicht.reduce((s, k) => s + (k.compact ? k.compactH : k.h), 0) + Math.max(0, zicht.length - 1) * gap;
  };
  // eerst compact (laagste prio eerst), dan weg (laagste prio eerst); de belangrijkste kaart blijft
  const opPrio = [...lijst].sort((a, b) => a.prio - b.prio);
  for (const k of opPrio) { if (hoogte() <= ruimte) break; if (k.compactH != null) k.compact = true; }
  for (const k of opPrio) {
    if (hoogte() <= ruimte) break;
    if (lijst.filter((x) => !x.weg).length <= 1) break;
    k.weg = true;
  }
  let y = top;
  const zichtbaar = [];
  for (const k of lijst) {
    if (k.weg) { weg.push(k.id); continue; }
    const h = k.compact ? k.compactH : k.h;
    zichtbaar.push({ id: k.id, top: y, h, compact: k.compact });
    y += h + gap;
  }
  return { zichtbaar, weg, onder: y - gap };
}

// Overlap-controle voor de test en de debug: geeft de paren ids die elkaar raken (leeg = goed).
export function overlap(zichtbaar) {
  const uit = [];
  for (let i = 0; i < zichtbaar.length; i++) for (let j = i + 1; j < zichtbaar.length; j++) {
    const a = zichtbaar[i], b = zichtbaar[j];
    if (a.top < b.top + b.h && b.top < a.top + a.h) uit.push([a.id, b.id]);
  }
  return uit;
}

// De ruimte voor de stapel: tot net boven het midden van het scherm (daar staat de pijl naar het doel), in px van het HUD-vlak
// (viewportH al gedeeld door --ui). Nooit minder dan één kaart.
export function stapelRuimte(viewportH, top = STAPEL_TOP, midden = 0.5, pijl = 70) {
  const tot = (eindig(viewportH) ? viewportH : 720) * midden - pijl;
  return Math.max(110, tot - top);
}

// De standaardkaarten van de duivenspot, in volgorde van boven naar beneden: de opdracht (altijd), de uitleg van de eerste vlucht
// (alleen tot hij gezien is; compact als de ruimte krap is) en de hoogtekaart (alleen bij een museum-doel dat hoog hangt).
export function duivenKaarten({ introActief, holdActief, hoogteActief, intro = { h: 150, compactH: 74 }, opdracht = { h: 84, holdH: 110 }, hoogte = { h: 54 } } = {}) {
  return [
    { id: 'opdracht', prio: 3, h: holdActief ? opdracht.holdH : opdracht.h },
    { id: 'uitleg', prio: 2, h: intro.h, compactH: intro.compactH, nodig: !!introActief },
    { id: 'hoogte', prio: 1, h: hoogte.h, nodig: !!hoogteActief },
  ];
}
