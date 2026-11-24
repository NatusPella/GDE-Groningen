// Schermen B: de kamer. Wachtkamer, Spelers, Uitnodigen, Sessie; opener en gast naast elkaar waar ze verschillen.
import { I, esc, toets, knop, klein, link, tussenkop, status, blokStatus, seg, stapper, feiten, notitie, vink, sig, vorm, standTekst, P, sessieFrame, SIG } from './helpers.mjs';

const naamCel = (p, jij, opener) => `<div class="mp-celspeler">${vorm(p.k, p.v, p.sig === 'weg' ? 'weg' : '')}<div><span class="mp-naam">${esc(p.naam)}${p.id === jij ? '<span class="mp-jij">JIJ</span>' : ''}</span>${p.id === opener ? '<small class="mp-hulp">Opende het spel</small>' : ''}</div></div>`;

// de spelerstabel: één rij per speler, de acties in het detail rechts (niet drie knoppen per rij)
function spelersTabel({ jij = 0, opener = 0, sel = 2, rijen = P, kolommen = 'spel' }) {
  const kop = kolommen === 'wacht'
    ? '<th class="l">Speler</th><th class="l">Verbinding</th><th class="l">Klaar</th>'
    : '<th class="l">Speler</th><th class="l">Doet</th><th class="l">Waar</th><th class="l">Verbinding</th><th class="l">Stand</th>';
  const rij = (p) => {
    const w = p.sig === 'weg';
    const basis = `<td class="l">${naamCel(p, jij, opener)}</td>`;
    if (kolommen === 'wacht') {
      const klaar = p.sig === 'weg' ? `<span class="ds-z-status ds-z-status--probleem">${I('kruis', 'mp-ic--s')}Weg</span>` : p.id === 2 ? `<span class="ds-z-status ds-z-status--zacht">${I('zandloper', 'mp-ic--s')}Verbindt</span>` : `<span class="ds-z-status ds-z-status--goed">${I('vinkje', 'mp-ic--s')}Klaar</span>`;
      return `<tr${p.id === sel ? ' aria-selected="true"' : ''}${w ? ' class="is-weg"' : ''}>${basis}<td class="l">${p.id === 2 ? sig('bezig') : sig(p.sig)}</td><td class="l">${klaar}</td></tr>`;
    }
    return `<tr${p.id === sel ? ' aria-selected="true"' : ''}${w ? ' class="is-weg"' : ''}>${basis}<td class="l">${esc(p.doet)}</td><td class="l">${esc(p.plek)}${p.afstand ? `<br><small class="mp-hulp">${esc(p.afstand)}</small>` : ''}</td><td class="l">${sig(p.sig)}</td><td class="l">${standTekst(p.stand)}</td></tr>`;
  };
  return `<div class="mp-tabel"><table class="ds-z-tabel"><thead><tr>${kop}</tr></thead><tbody>${rijen.map(rij).join('')}</tbody></table></div>`;
}

const codeBlok = (code = 'K3J9D-8F2MN', primair = false) => `<div class="mp-kol" style="gap:10px"><span class="mp-code">${code}</span><div class="mp-actie">${knop('Kopieer de code', primair ? '' : 'secundair')}${link('Wachtwoord instellen')}</div></div>`;
const drieStappen = `<ul class="mp-stappen"><li>Je vriend kiest <b>Spel, Samen spelen, Meedoen</b>.</li><li>Hij typt deze code.</li><li>Hij staat bij je in de lijst. Dat duurt een paar seconden.</li></ul>`;

export default function (S) {
  // ---- wachtkamer: het spel begint pas als iemand start
  const wachtkamer = (rol) => sessieFrame({
    actief: 'spelers', rol, n: 3, zicht: 'Privé', verb: 'goed', naam: 'Zomeravond',
    sub: rol === 'opener' ? '<b>Zomeravond</b> · de wachtkamer: het spel begint als jullie starten' : '<b>Zomeravond</b> · wachtkamer · Sem opende het spel',
    inhoud: `<div class="mp-md" style="grid-template-columns:1fr 520px;margin-top:6px">
      <div class="mp-kol" style="gap:10px">${tussenkop('Wie er is', `<small>3 van 8 plekken</small>`)}${spelersTabel({ jij: rol === 'opener' ? 0 : 1, opener: 0, sel: 99, rijen: P.slice(0, 3), kolommen: 'wacht' })}
        ${notitie(rol === 'opener' ? 'Tijn verbindt nog. Het spel kan starten zodra iedereen “Klaar” staat.' : 'Sem en jij zijn klaar. Tijn verbindt nog.', 'zandloper')}
        <p class="mp-hulp">Jullie zien de opening samen. Elke speler houdt zijn eigen geld en verhaal.</p>${tussenkop('Dit kunnen jullie samen')}<div class="mp-grid2" style="gap:8px;font-size:18px">${[['auto', 'Samen rijden en bijrijden'], ['vis', 'Hengelen en boeren'], ['pakket', 'Bezorgen, taxi en krant'], ['medaille', 'Racen en golfen'], ['winkel', 'Winkelen en eten'], ['zwaard', 'Vechten, als jullie beiden actief zijn']].map(([ic, t]) => `<span class="mp-rij" style="gap:8px">${I(ic, 'mp-ic--s')}${t}</span>`).join('')}</div></div>
      <aside class="mp-kol" style="gap:12px">${rol === 'opener' ? `${tussenkop('Nodig vrienden uit')}${codeBlok()}${drieStappen}` : `${tussenkop('Nodig vrienden uit')}${codeBlok()}<span class="mp-hulp">Je mag de code delen: iedereen mag vrienden uitnodigen.</span>`}</aside></div>
      <div class="mp-voet">${knop(rol === 'opener' ? 'Sessie stoppen' : 'Spel verlaten', 'secundair')}<span class="mp-hulp">${rol === 'opener' ? 'Starten kan met minstens twee spelers die “Klaar” zijn.' : 'Sem krijgt je verzoek en start het spel.'}</span><span class="mp-voet__ruimte"></span>${knop(rol === 'opener' ? 'Spel starten' : 'Vraag om te starten')}</div>`,
    hint: [['↑+↓', 'kiezen'], ['Enter', rol === 'opener' ? 'spel starten' : 'vraag om te starten'], ['Q+E', 'tabblad'], ['Esc', 'terug']],
  });
  S['f1-wachtkamer-opener'] = () => wachtkamer('opener');
  S['f2-wachtkamer-gast'] = () => wachtkamer('gast');

  // ---- Spelers: tabel links, detail rechts met de acties van de gekozen speler
  const detail = (p, rol) => {
    const jijIsOpener = rol === 'opener';
    const ik = p.id === (jijIsOpener ? 0 : 1);
    const uitleg = { goed: 'Alles loopt soepel.', matig: 'Zijn beeld loopt soms een tikje achter. Dat lost meestal vanzelf op. Het ligt aan zijn internet, niet aan dat van jou.', slecht: 'Zijn beeld hapert merkbaar. Hij ziet jou ook met vertraging. Vraag hem eventueel wat dichterbij zijn router te gaan zitten.', weg: 'Het spel wacht even. Komt hij binnen 12 seconden niet terug, dan gaat het spel door zonder hem; zijn voortgang blijft veilig.' }[p.sig];
    return `<aside class="mp-detail">
      <div class="mp-hero"><div class="mp-rij">${vorm(p.k, p.v, 'l')}<div class="mp-kol" style="gap:2px"><div class="mp-hero__titel">${esc(p.naam)}${ik ? ' <span class="mp-jij" style="font-size:14px">JIJ</span>' : ''}</div><span class="mp-hulp">${p.id === 0 ? 'Opende het spel' : 'Doet mee'} · ${esc(p.doet)}${p.afstand ? ' · ' + esc(p.afstand) : ''}</span></div></div>
        <div class="mp-rij mp-rij--tussen"><span class="mp-label">Verbinding</span>${sig(p.sig)}</div>
        ${p.sig !== 'goed' ? notitie(uitleg, p.sig === 'weg' ? 'waarschuwing' : 'info', p.sig === 'goed' ? '' : p.sig === 'matig' ? 'let' : 'probleem') : ''}
        ${ik ? `<span class="mp-hulp">Dit ben jij. Je stand en je roepjes staan links onder de tabel.</span>` : `<div class="mp-actie">${klein('Ga erheen')}${jijIsOpener ? klein('Spel overdragen') : ''}</div>
        <div class="mp-veld"><span class="mp-label">Alleen voor jou</span>${seg([['g', 'Gewoon'], ['d', 'Gedempt'], ['b', 'Geblokkeerd']], 'g', 'ds-z-segment--blok ds-z-segment--klein', 'Dempen of blokkeren')}<span class="mp-hulp">Dempen en blokkeren zijn alleen voor jou. De ander merkt het niet.</span></div>
        ${jijIsOpener ? `<div class="mp-kol" style="gap:4px;border-top:var(--ds-lijn) solid var(--ds-c-ink-inkt);padding-top:8px"><span class="mp-hulp">Alleen jij, die het spel opende, kunt spelers verwijderen.</span><button type="button" class="ds-z-link" style="color:var(--ds-c-rood-tx);align-self:flex-start">Uit het spel zetten</button></div>` : `<span class="mp-hulp" style="border-top:var(--ds-lijn) solid var(--ds-c-ink-inkt);padding-top:8px">Spelers verwijderen kan alleen wie het spel opende (Sem). Verder ben je gelijk.</span>`}`}
      </div></aside>`;
  };
  const jijStrook = (rol) => `<div class="mp-grid2" style="gap:12px;margin-top:2px"><section class="mp-blok"><div class="mp-label">Jouw stand</div>${seg([['p', 'Passief'], ['a', 'Actief (PvP)']], 'p', 'ds-z-segment--blok', 'Stand')}<span class="mp-hulp">Passief: niemand raakt jou en jij raakt niemand. Omschakelen kan niet meteen weer.</span></section><section class="mp-blok"><div class="mp-label">Roepen naar de anderen</div><div class="mp-rij" style="gap:16px;flex-wrap:wrap">${[['7', 'Kom hier'], ['8', 'Help!'], ['9', 'Kijk daar']].map(([t, w]) => `<span class="mp-rij" style="gap:6px">${toets(t)} ${w}</span>`).join('')}</div><span class="mp-hulp">Tab in het spel toont dezelfde lijst, kort.</span></section></div>`;
const spelers = (rol, sel, extra = '', verb = 'goed') => sessieFrame({
    actief: 'spelers', rol, n: 5, zicht: 'Privé', verb,
    inhoud: `<div class="mp-md" style="grid-template-columns:1fr 470px;margin-top:6px"><div class="mp-kol" style="gap:10px">${extra}${spelersTabel({ jij: rol === 'opener' ? 0 : 1, opener: 0, sel })}${jijStrook(rol)}</div>${detail(P[sel], rol)}</div>`,
    hint: [['↑+↓', 'speler kiezen'], ['Enter', 'acties'], ['Q+E', 'tabblad'], ['Esc', 'terug']],
  });
  S['g1-spelers-opener'] = () => spelers('opener', 2);
  S['g2-spelers-gast'] = () => spelers('gast', 0);

  // ---- Spelers met een slechte verbinding van jezelf, en wat de woorden betekenen
  S['g3-spelers-verbinding'] = () => sessieFrame({
    actief: 'spelers', rol: 'gast', n: 5, zicht: 'Privé', verb: 'matig',
    inhoud: `<div class="mp-md" style="grid-template-columns:1fr 470px;margin-top:6px"><div class="mp-kol" style="gap:10px">${notitie('<b>Jouw verbinding is matig.</b> Anderen zien je soms schokken en jij ziet hen met een tikje vertraging. Het spel loopt gewoon door.', 'waarschuwing', 'let')}${spelersTabel({ jij: 1, opener: 0, sel: 1 })}<div class="mp-actie">${link('Verbinding testen')}<span class="mp-hulp">De test kijkt of internet en de hulpservers bereikbaar zijn. Er wordt niets van jou verstuurd.</span></div></div>
      <aside class="mp-detail"><div class="mp-hero"><div class="mp-label">Wat de woorden betekenen</div>
        ${[['goed', 'Alles loopt soepel.', ''], ['matig', 'Af en toe een schok. Prima om door te spelen.', 'Tip: zit dichter bij je router, of zet downloads even stil.'], ['slecht', 'Het hapert merkbaar. Zware momenten, zoals een race, kunnen vervelend worden.', 'Tip: gebruik een kabel, of stap uit de race en kijk mee.'], ['weg', 'Geen contact. Het spel wacht even en probeert het opnieuw.', 'Je voortgang blijft veilig.']].map(([n, w, t]) => `<div class="mp-kol" style="gap:2px;padding:6px 0;border-top:var(--ds-lijn) solid var(--ds-c-ink-inkt)">${sig(n)}<span style="font-size:17px">${w}</span>${t ? `<span class="mp-hulp">${t}</span>` : ''}</div>`).join('')}
        <span class="mp-hulp">Technische getallen, zoals reactietijd, staan alleen achter “Meer details” in de test.</span></div></aside></div>`,
    hint: [['↑+↓', 'speler kiezen'], ['Q+E', 'tabblad'], ['Esc', 'terug']],
  });

  // ---- Uitnodigen: de code groot, drie stappen, wie er al is
  const uitnodigen = (rol, openbaar) => sessieFrame({
    actief: 'uitnodigen', rol, n: 4, zicht: openbaar ? 'Openbaar' : 'Privé',
    inhoud: `<div class="mp-md" style="grid-template-columns:1fr 520px;margin-top:6px"><div class="mp-kol" style="gap:14px">${tussenkop('Zo komt een vriend binnen')}
      ${openbaar ? `<div class="mp-hero"><div class="mp-label">Deze sessie staat in de lijst</div><div class="mp-hero__titel">Zomeravond</div><p style="font-size:19px">Je vrienden vinden hem bij <b>Spel, Samen spelen, Meedoen, Openbare sessies</b>. Een code is niet nodig${rol === 'gast' ? ' en jij hebt hem ook niet: alleen Sem kent de kamercode' : ''}.</p></div>` : `<div class="mp-hero">${codeBlok('K3J9D-8F2MN', true)}</div>`}
      ${openbaar ? '' : drieStappen}
      ${rol === 'opener' && openbaar ? `<div class="mp-actie">${knop('Weer privé maken', 'secundair')}<span class="mp-actie__sub">De sessie verdwijnt binnen een minuut uit de lijst en je krijgt een nieuwe code. De oude werkt dan niet meer.</span></div>` : ''}
      ${rol === 'gast' && !openbaar ? notitie('Iedereen mag vrienden uitnodigen. Alleen Sem kan spelers weer verwijderen.', 'info') : ''}</div>
      <aside class="mp-kol" style="gap:12px">${tussenkop('Wie er al is')}${P.slice(0, 4).map((p) => `<div class="mp-rij" style="padding:6px 0;border-bottom:var(--ds-lijn) solid var(--ds-c-ink-inkt)">${vorm(p.k, p.v, 's')}<span class="mp-naam" style="font-size:19px">${esc(p.naam)}</span><span style="margin-left:auto">${sig(p.sig)}</span></div>`).join('')}${feiten([['Plekken', '4 van 8'], ['Wachtwoord', rol === 'opener' ? 'geen' : 'geen']])}</aside></div>`,
    hint: [['Enter', 'kopieer de code'], ['Q+E', 'tabblad'], ['Esc', 'terug']],
  });
  S['h1-uitnodigen-opener'] = () => uitnodigen('opener', false);
  S['h2-uitnodigen-gast-openbaar'] = () => uitnodigen('gast', true);

  // ---- Sessie: instellingen (van wie het spel draait), de afspraken en wat jullie samen deden
  const regel = (wat, hoe, wie, slot) => `<tr><td class="l"><b style="font-size:19px">${wat}</b></td><td class="l" style="white-space:normal">${hoe}</td><td class="l" style="white-space:normal">${wie}</td></tr>`;
  const sessie = (rol) => sessieFrame({
    actief: 'sessie', rol, n: 4, zicht: 'Privé',
    inhoud: `<div class="mp-md" style="grid-template-columns:1fr 560px;margin-top:6px"><div class="mp-kol" style="gap:12px;overflow:hidden">${tussenkop('Zo is de sessie ingesteld')}
      <div class="mp-grid2" style="gap:12px"><div class="mp-veld"><span class="mp-label">Naam</span><div class="mp-input${rol === 'gast' ? '' : ''}"><span>Zomeravond</span>${rol === 'gast' ? I('slot', 'mp-zacht') : ''}</div></div><div class="mp-veld"><span class="mp-label">Zichtbaar</span>${seg([['p', 'Privé'], ['o', 'Openbaar', rol === 'gast']], 'p', 'ds-z-segment--blok', 'Zichtbaar')}</div><div class="mp-veld"><span class="mp-label">Hoeveel spelers</span>${rol === 'gast' ? `<div class="mp-input"><span>8</span>${I('slot', 'mp-zacht')}</div>` : stapper('8')}</div><div class="mp-veld"><span class="mp-label">Wachtwoord</span><div class="mp-input"><span class="mp-zacht">geen</span>${rol === 'gast' ? I('slot', 'mp-zacht') : ''}</div></div></div>
      ${rol === 'gast' ? notitie('Dit stelt Sem in, want de sessie draait op zijn computer. Wil je iets anders? Vraag het in het spel; de keuzes hieronder doen jullie samen.', 'info') : notitie('Dit kun alleen jij instellen, want de sessie draait op jouw computer. Het geeft geen extra macht in het spel.', 'info')}
      ${tussenkop('Hoe jullie samen kiezen')}
      <div class="mp-tabel mp-tabel--s"><table class="ds-z-tabel"><thead><tr><th class="l">Keuze</th><th class="l">Wie beslist</th><th class="l">Voor wie</th></tr></thead><tbody>
        ${regel('Slapen, tijd verzetten of reizen met tijdverlies', 'Iedereen kan het voorstellen; iedereen stemt', 'Voor iedereen')}${regel('Een ander spel laden', 'Voorstel; stopt de sessie voor iedereen', 'Voor iedereen')}${regel('Pauzeren', 'Jij zelf: je menu stopt alleen jouw invoer', 'Alleen voor jou')}${regel('Cheats', 'Staan uit zolang jullie samen spelen', 'Voor iedereen')}
      </tbody></table></div></div>
      <aside class="mp-kol" style="gap:10px">${tussenkop('Dit deden jullie samen', `<small>vanaf 19:04</small>`)}
        ${[['medaille', 'Race naar het Hoofdstation', 'Sem, Iris, Tijn · Iris was eerste', '19:52'], ['vis', 'Hengelen bij de Kardinge', 'Iris, Gijs', '19:31'], ['pakket', 'Bezorgen: drie pakketten', 'Sem, Tijn', '19:17']].map(([ic, t, w, tijd]) => `<div class="mp-rij" style="padding:8px 0;border-bottom:var(--ds-lijn) solid var(--ds-c-ink-inkt);align-items:flex-start">${I(ic, 'mp-ic--l')}<div class="mp-kol" style="gap:0"><b style="font-size:19px">${t}</b><span class="mp-hulp">${w}</span></div><span class="mp-hulp" style="margin-left:auto">${tijd}</span></div>`).join('')}
        <div class="mp-notitie">${I('vinkje')}<span>Je voortgang en je geld staan in <b>jouw eigen spel</b>. Dit overzicht is alleen een logboek.</span></div>
        <div class="mp-actie" style="margin-top:auto">${knop(rol === 'opener' ? 'Stel voor om te stoppen' : 'Spel verlaten', 'secundair')}<span class="mp-actie__sub">${rol === 'opener' ? 'De anderen stemmen ja of nee.' : 'Je gaat terug naar je eigen spel.'}</span></div></aside></div>`,
    hint: [['↑+↓', 'kiezen'], ['Enter', 'doen'], ['Q+E', 'tabblad'], ['Esc', 'terug']],
  });
  S['i1-sessie-opener'] = () => sessie('opener');
  S['i2-sessie-gast'] = () => sessie('gast');
}
