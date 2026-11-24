// Samen spelen: het tabblad Spelers als tabel met een detailpaneel (ontwerp 24-11, docs/ontwerp/MULTIPLAYER-UI-24-11.md hoofdstuk 5h).
// Pure HTML-functies, geen DOM en geen netwerk: coopspelersui.js zet het resultaat in het paneel en bindt de knoppen. De acties staan bij de gekozen speler
// (Ga erheen, Spel overdragen, Dempen of blokkeren, Uit het spel zetten) en niet drie keer per rij. Verbinding staat in gewone woorden (samensignaal.js);
// nooit milliseconden, nooit een IP-adres. Kleur is nooit het enige: de vorm en het woord staan er altijd naast.
import { VORM_TEKEN, kanEruitZetten, kanOverdragen, overdragenKnopTekst, eruitGezetTekst, veiligeKleur } from './coopspelers.js';
import { NIVEAU_TEKST, verbindingUitleg } from './samensignaal.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const niveauVan = (r) => (r && r.niveau) || (r && r.verbinding === 'lost' ? 'weg' : r && r.verbinding === 'lag' ? 'slecht' : 'goed');

// verbinding: drie streepjes en een woord
export const signaalHtml = (niveau) => `<span class="ss-sig ss-sig--${niveau}"><i aria-hidden="true"><b></b><b></b><b></b></i>${esc(NIVEAU_TEKST[niveau] || NIVEAU_TEKST.goed)}</span>`;
export const vormHtml = (r, klas = '') => `<span class="ss-vorm${klas ? ' ' + klas : ''}${niveauVan(r) === 'weg' ? ' ss-vorm--weg' : ''}" style="color:${esc(veiligeKleur(r.kleur))}" aria-hidden="true">${VORM_TEKEN[r.vorm] || '●'}</span>`;
export const standHtml = (r) => (typeof r.passief !== 'boolean' ? '' : r.passief
  ? '<span class="ss-stand ss-stand--passief">Passief</span>' : '<span class="ss-stand ss-stand--actief">Actief</span>');
const afstand = (r) => (!r.jij && r.afstandTekst ? `${esc(r.afstandTekst)}${r.richting ? ` ${esc(r.richting.pijl)} ${esc(r.richting.woord)}` : ''}` : '');

// de tabel; sel = het slot dat gekozen is
export function tabelHtml(rijen, { sel = null, wachtkamer = false } = {}) {
  const kop = wachtkamer ? '<th class="l">Speler</th><th class="l">Verbinding</th><th class="l">Klaar</th>'
    : '<th class="l">Speler</th><th class="l">Doet</th><th class="l">Waar</th><th class="l">Verbinding</th><th class="l">Stand</th>';
  const rij = (r) => {
    const n = niveauVan(r), weg = n === 'weg';
    const speler = `<td class="l"><span class="ss-speler">${vormHtml(r)}<span class="ss-spelernaam"><span class="ss-naamrij"><b>${esc(r.naam)}</b>${r.jij ? ' <span class="ss-jij">JIJ</span>' : ''}</span>${r.slot === 0 ? '<small>Opende het spel</small>' : ''}</span></span></td>`;
    const rest = wachtkamer
      ? `<td class="l">${signaalHtml(n)}</td><td class="l">${weg ? '<span class="ss-klaar ss-klaar--weg">Weg</span>' : '<span class="ss-klaar">Klaar</span>'}</td>`
      : `<td class="l">${esc(r.doet)}${r.groep ? `<small class="ss-groep">${esc(r.groep)}</small>` : ''}</td><td class="l">${afstand(r) || (weg ? '<small>laatst gezien</small>' : '')}</td><td class="l">${signaalHtml(n)}</td><td class="l">${standHtml(r)}</td>`;
    return `<tr data-kies="${r.slot}" data-slot="${r.slot}" tabindex="0"${r.slot === sel ? ' aria-selected="true"' : ''}${weg ? ' class="is-weg"' : ''}>${speler}${rest}</tr>`;
  };
  return `<div class="ss-tabel"><table class="ds-z-tabel"><thead><tr>${kop}</tr></thead><tbody>${rijen.map(rij).join('')}</tbody></table></div>`;
}

// Dempen en blokkeren zijn één segment voor jou; staat = 'gewoon' | 'gedempt' | 'geblokkeerd'
const segment = (slot, staat) => `<div class="ds-z-segment ds-z-segment--blok ds-z-segment--klein" role="radiogroup" aria-label="Alleen voor jou">${[['gewoon', 'Gewoon'], ['gedempt', 'Gedempt'], ['geblokkeerd', 'Geblokkeerd']].map(([id, t]) => `<button type="button" role="radio" aria-checked="${staat === id}" data-stand="${id}" data-slot="${slot}">${t}</button>`).join('')}</div>`;

// het detail van de gekozen speler. opts: { rol: 'host'|'gast', bevestig (slot dat om bevestiging vraagt), muteStaat(slot), openerNaam }
export function detailHtml(r, { rol = null, bevestig = null, muteStaat = () => 'gewoon', openerNaam = 'de ander' } = {}) {
  if (!r) return '<aside class="ss-detail"><p class="ss-hulp">Kies een speler.</p></aside>';
  const n = niveauVan(r);
  const uitleg = n === 'goed' ? '' : `<p class="ss-uitleg ss-uitleg--${n}">${esc(verbindingUitleg(n, { eigen: !!r.jij, naam: r.naam }))}</p>`;
  const wie = r.slot === 0 ? 'Opende het spel' : 'Doet mee';
  const kop = `<div class="ss-detailkop">${vormHtml(r, 'ss-vorm--groot')}<div><h3>${esc(r.naam)}${r.jij ? ' <span class="ss-jij">JIJ</span>' : ''}</h3><small>${wie}${r.doet ? ' · ' + esc(r.doet) : ''}${afstand(r) ? ' · ' + afstand(r) : ''}</small></div></div>`;
  const verb = `<div class="ss-regel"><span class="ss-label">Verbinding</span>${signaalHtml(n)}</div>${uitleg}`;
  if (r.jij) return `<aside class="ss-detail" data-detail="${r.slot}">${kop}${verb}<p class="ss-hulp">Dit ben jij. Je stand en je roepjes staan onder de tabel.</p></aside>`;
  if (bevestig === r.slot && kanEruitZetten(rol, r)) {
    return `<aside class="ss-detail ss-detail--bevestig" data-detail="${r.slot}">${kop}<h4>${esc(r.naam)} uit het spel zetten?</h4>`
      + `<div class="ss-verlies ss-verlies--weg"><b>Hij verliest</b><span>de sessie; hij speelt weer zijn eigen spel</span></div>`
      + `<div class="ss-verlies"><b>Blijft</b><span>zijn geld, zijn voortgang en zijn eigen spel. Hij kan later opnieuw meedoen.</span></div>`
      + `<div class="ss-acties"><button type="button" class="ds-z-knop" data-eruit-nee="1">Nee, laat hem</button><button type="button" class="ds-z-knop ds-z-knop--gevaar" data-eruit="${r.slot}">Ja, zet hem eruit</button></div></aside>`;
  }
  const acties = `<div class="ss-acties">${r.x != null ? `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-naar="${r.slot}">Ga erheen</button>` : ''}${kanOverdragen(rol, r) ? `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-geef="${r.slot}">${esc(overdragenKnopTekst)}</button>` : ''}</div>`;
  const mute = `<div class="ss-veld"><span class="ss-label">Alleen voor jou</span>${segment(r.slot, muteStaat(r.slot))}<span class="ss-hulp">Dempen en blokkeren zijn alleen voor jou. De ander merkt het niet.</span></div>`;
  const voet = kanEruitZetten(rol, r)
    ? `<div class="ss-voet"><span class="ss-hulp">Alleen jij, die het spel opende, kunt spelers verwijderen.</span><button type="button" class="ds-z-link ss-eruit" data-eruit="${r.slot}">Uit het spel zetten</button></div>`
    : `<div class="ss-voet"><span class="ss-hulp">Spelers verwijderen kan alleen wie het spel opende (${esc(openerNaam)}). Verder ben je gelijk.</span></div>`;
  return `<aside class="ss-detail" data-detail="${r.slot}">${kop}${verb}${acties}${mute}${voet}</aside>`;
}

// jouw stand (passief of actief) en roepen, onder de tabel. kan = de stand is te kiezen (de host kent hem); passief = jouw stand
export function jijStrookHtml({ passief = true, kan = true, tekstUitleg = '', roep = [] } = {}) {
  const stand = kan ? `<section class="ss-blok"><span class="ss-label">Jouw stand</span><div class="ds-z-segment ds-z-segment--blok" role="radiogroup" aria-label="Jouw stand"><button type="button" role="radio" aria-checked="${passief}" data-passief="1">Passief</button><button type="button" role="radio" aria-checked="${!passief}" data-passief="0">Actief (PvP)</button></div><span class="ss-hulp">${esc(tekstUitleg)}</span></section>` : '';
  const roepen = roep.length ? `<section class="ss-blok"><span class="ss-label">Roepen naar de anderen</span><div class="ss-roep">${roep.map((k) => `<button type="button" class="ss-roepknop" data-ping="${esc(k.soort)}"><span class="ds-z-toets">${esc(k.toets)}</span> ${esc(k.tekst)}</button>`).join('')}</div><span class="ss-hulp">Tab in het spel toont dezelfde lijst, kort.</span></section>` : '';
  return stand || roepen ? `<div class="ss-strook">${stand}${roepen}</div>` : '';
}

// de Aandacht-regels voor Spelers: wie weg is, jouw eigen verbinding, wie op Actief staat (het Spel-ontwerp: hoogstens drie, NU, VANDAAG, NIEUW)
export function aandachtRegels(rijen) {
  const uit = [];
  const mij = rijen.find((r) => r.jij);
  if (mij && ['matig', 'slecht'].includes(niveauVan(mij))) uit.push({ urg: 'nu', kop: `Jouw verbinding is ${NIVEAU_TEKST[niveauVan(mij)].toLowerCase()}`, sub: verbindingUitleg(niveauVan(mij), { eigen: true }) });
  for (const r of rijen) if (!r.jij && niveauVan(r) === 'weg') uit.push({ urg: 'nu', kop: `${r.naam} is weg`, sub: 'Het spel gaat door. De voortgang is veilig.' });
  for (const r of rijen) if (!r.jij && r.passief === false) uit.push({ urg: 'nieuw', kop: `${r.naam} staat op Actief`, sub: 'Hij kan vechten met anderen die ook actief staan.' });
  return uit.slice(0, 3);
}
export const aandachtHtml = (regels) => (regels.length ? `<div class="ss-aandacht" role="status"><span class="ss-aandacht__kop">Aandacht</span>${regels.map((a) => `<div class="ss-klus ss-klus--${a.urg}"><b>${a.urg === 'nu' ? 'NU' : a.urg === 'vandaag' ? 'VANDAAG' : 'NIEUW'}</b><span><b>${esc(a.kop)}</b> ${esc(a.sub)}</span></div>`).join('')}</div>` : '');

export { eruitGezetTekst };
