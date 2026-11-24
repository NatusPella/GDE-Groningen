// Samen spelen: het tabblad Spelers als tabel met een detailpaneel (ontwerp 24-11, docs/ontwerp/MULTIPLAYER-UI-24-11.md hoofdstuk 5h).
// Pure HTML-functies, geen DOM en geen netwerk: coopspelersui.js zet het resultaat in het paneel en bindt de knoppen. De acties staan bij de gekozen speler
// (Ga erheen, Spel overdragen, Dempen of blokkeren, Uit het spel zetten) en niet drie keer per rij. Verbinding staat in gewone woorden (samensignaal.js);
// nooit milliseconden, nooit een IP-adres. Kleur is nooit het enige: de vorm en het woord staan er altijd naast.
import { keyTextHtml } from './keycap.js';
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

// het detail van de gekozen speler. opts: { rol: 'host'|'gast', muteStaat(slot), openerNaam }
export function detailHtml(r, { rol = null, muteStaat = () => 'gewoon', openerNaam = 'de ander' } = {}) {
  if (!r) return '<aside class="ss-detail"><p class="ss-hulp">Kies een speler.</p></aside>';
  const n = niveauVan(r);
  const uitleg = n === 'goed' ? '' : `<p class="ss-uitleg ss-uitleg--${n}">${esc(verbindingUitleg(n, { eigen: !!r.jij, naam: r.naam }))}</p>`;
  const wie = r.slot === 0 ? 'Opende het spel' : 'Doet mee';
  const kop = `<div class="ss-detailkop">${vormHtml(r, 'ss-vorm--groot')}<div><h3>${esc(r.naam)}${r.jij ? ' <span class="ss-jij">JIJ</span>' : ''}</h3><small>${wie}${r.doet ? ' · ' + esc(r.doet) : ''}${afstand(r) ? ' · ' + afstand(r) : ''}</small></div></div>`;
  const verb = `<div class="ss-regel"><span class="ss-label">Verbinding</span>${signaalHtml(n)}</div>${uitleg}`;
  if (r.jij) return `<aside class="ss-detail" data-detail="${r.slot}">${kop}${verb}<p class="ss-hulp">Dit ben jij. Je stand en je roepjes staan onder de tabel.</p></aside>`;
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
  const roepen = roep.length ? `<section class="ss-blok"><span class="ss-label">Roepen naar de anderen</span><div class="ss-roep">${roep.map((k) => `<button type="button" class="ss-roepknop" data-ping="${esc(k.soort)}"><span class="ds-z-toets">${esc(k.toets)}</span> ${esc(k.tekst)}</button>`).join('')}</div><span class="ss-hulp">${keyTextHtml('{TAB} in het spel toont dezelfde lijst, kort.')}</span></section>` : '';
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
// de strook Aandacht van het Spel-ontwerp (sp-strook, ds-spel.css): hetzelfde uiterlijk als op Overzicht
export const aandachtHtml = (regels) => (regels.length ? `<div class="sp-strook" role="status"><div class="sp-strook__kop"><span>Aandacht</span></div>${regels.map((a) => `<div class="sp-klus sp-klus--${a.urg}"><span class="ds-z-status${a.urg === 'nu' ? ' ds-z-status--probleem' : a.urg === 'nieuw' ? ' ds-z-status--goed' : ''}">${a.urg === 'nu' ? 'NU' : a.urg === 'vandaag' ? 'VANDAAG' : 'NIEUW'}</span><span class="sp-klus__tekst"><b>${esc(a.kop)}</b><span>${esc(a.sub)}</span></span></div>`).join('')}</div>` : '');

export { eruitGezetTekst };

// ---- Uitnodigen en Sessie (ontwerp 24-11, hoofdstuk 5i). Pure HTML; de knoppen bindt samenkamerui.js.
// Uitnodigen: de kamercode groot met Kopieer, drie stappen en wie er al is. Een openbare sessie heeft geen code nodig en een gast kent de kamercode dan ook niet.
// opts: { code ('' als onbekend), openbaar, openbaarNaam, rol, openerNaam, spelers (rijen), max }
export function uitnodigenHtml({ code = '', openbaar = false, openbaarNaam = '', rol = 'gast', openerNaam = 'de ander', spelers = [], max = 8 } = {}) {
  const heeftCode = !!code && !openbaar;
  const stappen = '<ol class="ss-stappen"><li>Je vriend kiest <b>Spel, Samen spelen, Meedoen</b>.</li><li>Hij typt deze code.</li><li>Hij staat bij je in de lijst. Dat duurt een paar seconden.</li></ol>';
  const links = openbaar
    ? `<div class="ss-hero"><span class="ss-label">Deze sessie staat in de lijst</span><h3>${esc(openbaarNaam || 'Jouw sessie')}</h3><p>Je vrienden vinden hem bij <b>Spel, Samen spelen, Meedoen, Openbare sessies</b>. Een code is niet nodig${rol === 'gast' ? ` en jij hebt hem ook niet: alleen ${esc(openerNaam)} kent de kamercode` : ''}.</p></div>`
      + (rol === 'host' ? '<div class="ss-acties"><button type="button" class="ds-z-knop ds-z-knop--secundair" data-privaat>Weer privé maken</button><span class="ss-hulp">De sessie verdwijnt binnen een minuut uit de lijst. Wie de kamercode al heeft, kan nog binnen.</span></div>' : '')
    : heeftCode
      ? `<div class="ss-hero"><span class="ss-code" aria-label="Kamercode">${esc(code)}</span><div class="ss-acties"><button type="button" class="ds-z-knop" data-kopieer="${esc(code)}">Kopieer de code</button></div></div>${stappen}${rol === 'gast' ? '<p class="ss-hulp">Iedereen mag vrienden uitnodigen. Alleen ' + esc(openerNaam) + ' kan spelers weer verwijderen.</p>' : ''}`
      : `<div class="ss-hero"><p>De kamercode is er nog niet: de sessie wordt klaargezet. Probeer het zo opnieuw.</p></div>`;
  const wie = spelers.map((r) => `<div class="ss-wierij">${vormHtml(r, 'ss-vorm--s')}<b>${esc(r.naam)}</b>${signaalHtml(niveauVan(r))}</div>`).join('');
  return `<div class="ss-md ss-md--uitnodigen"><div class="ss-kol"><h3 class="ds-z-tussenkop">Zo komt een vriend binnen</h3>${links}</div><div class="ss-kol"><h3 class="ds-z-tussenkop">Wie er al is</h3>${wie}<dl class="ss-feiten"><dt>Plekken</dt><dd>${spelers.length} van ${max}</dd></dl></div></div>`;
}

// Sessie: wat is ingesteld (door wie het spel draait, want de sessie draait op zijn computer), hoe jullie samen kiezen, en het logboek. opts: { naam, openbaar, max, wachtwoord, rol, openerNaam, logboek: [{ titel, namen, tijd }] }
export const SAMEN_KIEZEN = Object.freeze([
  ['Slapen, tijd verzetten of reizen met tijdverlies', 'Iedereen kan het voorstellen; iedereen stemt', 'Voor iedereen'],
  ['Een ander spel laden', 'Wie als opener laadt, stelt het eerst voor; stopt de sessie voor iedereen', 'Voor iedereen'],
  ['Cheats aan', 'Iedereen kan het voorstellen; iedereen moet ja zeggen', 'Voor iedereen'],
  ['Pauzeren', 'Jij zelf: je menu stopt alleen jouw invoer', 'Alleen voor jou'],
]);
export function sessieHtml({ naam = '', openbaar = false, max = 8, wachtwoord = false, rol = 'gast', openerNaam = 'de ander', logboek = [] } = {}) {
  const slot = '';
  const veld = (l, w) => `<div class="ss-veld"><span class="ss-label">${esc(l)}</span><div class="ss-invoer">${w}${slot}</div></div>`;
  const inst = `<div class="ss-grid2">${veld('Naam', esc(naam || 'Jouw sessie'))}${veld('Zichtbaar', openbaar ? 'Openbaar' : 'Privé')}${veld('Hoeveel spelers', String(max))}${veld('Wachtwoord', wachtwoord ? 'ingesteld' : 'geen')}</div>`
    + `<p class="ss-uitleg ss-uitleg--info">${rol === 'gast' ? `Dit stelt ${esc(openerNaam)} in, want de sessie draait op zijn computer. De keuzes hieronder doen jullie samen.` : 'Dit kun alleen jij instellen, want de sessie draait op jouw computer. Het geeft geen extra macht in het spel.'}</p>`;
  const tabel = `<div class="ss-tabel ss-tabel--s"><table class="ds-z-tabel"><thead><tr><th class="l">Keuze</th><th class="l">Wie beslist</th><th class="l">Voor wie</th></tr></thead><tbody>${SAMEN_KIEZEN.map(([a, b, c]) => `<tr><td class="l"><b>${esc(a)}</b></td><td class="l">${esc(b)}</td><td class="l">${esc(c)}</td></tr>`).join('')}</tbody></table></div>`;
  const log = logboek.length
    ? logboek.slice(-6).reverse().map((l) => `<div class="ss-logrij"><b>${esc(l.titel)}</b><span class="ss-hulp">${esc((l.namen || []).join(', '))}</span><span class="ss-hulp ss-tijd">${esc(l.tijd || '')}</span></div>`).join('')
    : '<p class="ss-hulp">Nog niets samen gedaan.</p>';
  const acties = `<div class="ss-acties"><button type="button" class="ds-z-knop ds-z-knop--secundair" data-stop-voorstel>Stel voor om te stoppen</button>${rol === 'gast' ? '<button type="button" class="ds-z-knop ds-z-knop--secundair" data-verlaat>Spel verlaten</button>' : ''}</div><span class="ss-hulp">${rol === 'gast' ? 'Verlaten brengt je terug naar je eigen spel. Stoppen voor iedereen stemt de groep.' : 'De anderen stemmen ja of nee.'}</span>`;
  return `<div class="ss-md ss-md--sessie"><div class="ss-kol"><h3 class="ds-z-tussenkop">Zo is de sessie ingesteld</h3>${inst}<h3 class="ds-z-tussenkop">Hoe jullie samen kiezen</h3>${tabel}</div>`
    + `<div class="ss-kol"><h3 class="ds-z-tussenkop">Dit deden jullie samen</h3>${log}<p class="ss-hulp">Je voortgang en je geld staan in <b>jouw eigen spel</b>. Dit overzicht is alleen een logboek.</p>${acties}</div></div>`;
}

// De voet van de wachtkamer onder Spelers: de gele start (of Vraag om te starten) met zijn reden. knop = playerstatus.startKnop(...)
export const wachtkamerVoetHtml = (knop, { openerNaam = '' } = {}) => `<div class="ss-wachtvoet"><span class="ss-hulp">${esc(knop.hint || '')}</span><button type="button" class="ds-z-knop" data-start-spel${knop.disabled ? ' disabled aria-disabled="true"' : ''}${knop.busy ? ' aria-busy="true"' : ''}>${esc(knop.label)}</button></div>`;
