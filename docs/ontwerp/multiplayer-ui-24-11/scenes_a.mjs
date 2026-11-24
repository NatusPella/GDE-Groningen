// Schermen A: de start. Waar speel je, Samen spelen starten, meedoen via code of lijst, eerste keer, openen (privé of openbaar), sessienaam, verbinden, je figuur.
import { spelKop, I, esc, toets, knop, klein, link, tussenkop, status, blokStatus, seg, stapper, feiten, notitie, vink, sig, vorm, standTekst, P, frame, kop, tabrij, hints, HINT_STD, TABS_ZONDER, hudFrame } from './helpers.mjs';

const KOP_START = spelKop('Samen spelen');

export default function (S) {
  // 1. Samen spelen starten, zonder sessie: twee doelen, een code gewoon op het scherm
  S['a1-start'] = () => frame({
    koptekst: KOP_START,
    inhoud: `<div class="mp-grid2" style="gap:18px;margin-top:6px;flex:1;min-height:0;align-content:start">
      <section class="mp-keuze">
        <div class="mp-keuze__titel">${I('spelers', 'mp-ic--xl')}Meedoen</div>
        <p>Je vriend gaf je een code. Typ hem hier en je staat zo in zijn wereld.</p>
        <div class="mp-veld"><span class="mp-label">Kamercode</span><div class="mp-input" style="font-family:var(--ds-font-zeef-kop);font-weight:800;letter-spacing:.14em;font-size:30px;min-height:60px"><span class="mp-zacht">K3J9D-8F2MN</span><button type="button" class="ds-z-knop ds-z-knop--secundair">Toetsenbord</button></div></div>
        <div class="mp-actie">${knop('Verbinden', 'secundair', 'mp-groot')}${link('Kies uit openbare sessies')}</div>
        <p class="mp-hulp">Vraagt de sessie een wachtwoord, dan vraagt het spel je dat na het verbinden.</p>
      </section>
      <section class="mp-keuze mp-keuze--hoofd">
        <div class="mp-keuze__titel">${I('plus', 'mp-ic--xl')}Open je spel</div>
        <p>Anderen komen in jouw wereld. Standaard is je sessie privé: alleen met jouw code.</p>
        ${feiten([['Zichtbaar', 'Privé'], ['Spelers', 'tot 8'], ['Wachtwoord', 'geen']])}
        <div class="mp-actie">${knop('Open je spel', '', 'mp-groot')}${link('Instellingen eerst')}</div>
        <p class="mp-hulp">Je krijgt meteen een code om te delen.</p>
      </section>
    </div>
    ${tussenkop('Zo werkt samen spelen')}<div class="mp-zo"><div><b>${I('wereldbol')}Eén wereld</b><span>De wereld draait op de computer van wie het spel opende. Dat kan wisselen; niemand is de baas.</span></div><div><b>${I('tas')}Eigen spel</b><span>Je houdt je eigen geld, voertuigen en verhaal. Niemand verliest iets als iemand wegvalt.</span></div><div><b>${I('vraag')}Meedoen is een keuze</b><span>Bij elke activiteit vraagt het spel: meedoen, ja of nee. Geen antwoord is nee: dan kijk je mee.</span></div></div>
    <div class="mp-voet"><span class="mp-hulp">${I('slot', 'mp-ic--s')} Pas als je verbindt gaat er iets naar buiten: je IP-adres, naar je medespelers en naar openbare hulpservers.</span>${link('Wat precies?')}<span class="mp-voet__ruimte"></span>${link('Verbinding testen')}</div>`,
    hint: [['↑+↓+←+→', 'kiezen'], ['Enter', 'doen'], ['Q+E', 'tabblad'], ['Esc', 'terug']],
  });

  // 2. Eerste keer: naam en toestemming op één kaart, eerlijk over wie wat ziet
  S['b-eerste-keer'] = () => hudFrame({ klas: 'is-donker', inhoud: `<div class="scherm"><section class="hudkaart hudkaart--kop" style="width:1180px;padding-bottom:0"><div class="kop">Voordat je met anderen speelt</div>
      <div style="display:grid;grid-template-columns:400px 1fr;gap:28px;padding:20px 24px 8px">
        <div class="mp-kol" style="gap:12px">
          <div class="mp-veld"><span class="mp-label">Je naam voor Samen spelen</span><div class="mp-input mp-input--ok"><span>Sem</span><small>3 van 16</small></div></div>
          <div class="mp-veld"><span class="mp-label">Zo zien anderen je</span><div class="mp-rij" style="background:var(--ds-c-ink-inkt);border-radius:var(--ds-r);padding:14px;justify-content:center"><span class="mp-naamplaat">${vorm('#4fb3ff', '●', 's')}Sem</span></div></div>
          <p class="mp-hulp">Een verzonnen naam of je voornaam is prima. Geen achternaam, geen e-mailadres.</p>
        </div>
        <div class="mp-kol" style="gap:8px">
          <div class="mp-label">Wie ziet wat als je verbindt</div>
          <table class="mp-wie"><thead><tr><th>Wie</th><th>Ziet</th></tr></thead><tbody>
            <tr><td>Je medespelers<small>de mensen in jouw sessie</small></td><td>Je naam, je kleur en je IP-adres. Een rechtstreekse verbinding kan niet zonder.</td></tr>
            <tr><td>Hulpservers<small>openbaar, om elkaar te vinden</small></td><td>Je IP-adres en dát je een verbinding zoekt, zoals elke server die je bereikt. Berichten voor het opzetten zijn versleuteld: zij kunnen ze niet lezen.</td></tr>
            <tr class="is-niets"><td>Wij<small>de makers van het spel</small></td><td><b>Niets.</b> Er gaat niets naar een server van ons en er wordt niets bewaard.</td></tr>
          </tbody></table>
          <p class="mp-hulp">Openbaar in een lijst komt je sessie alleen als jij dat zelf kiest. Je trekt je akkoord altijd in bij Instellingen, Samen spelen.</p>
        </div>
      </div>
      <div class="mp-voet" style="padding:12px 24px 18px;margin-top:6px">${vink('Niet meer vragen op dit apparaat', false)}<span class="mp-voet__ruimte"></span>${knop('Terug naar alleen spelen', 'secundair')}${knop('Akkoord en doorgaan')}</div>
    </section></div>`,
  });

  // 3a. Open je spel, privé
  const hostForm = (openbaar, naamState) => frame({
    koptekst: spelKop('Samen spelen'),
    inhoud: `<div class="mp-md" style="grid-template-columns:1fr 520px;margin-top:6px">
      <div class="mp-kol" style="gap:14px">
        ${tussenkop('Wie mag meedoen')}
        ${seg([['prive', 'Privé: alleen met de code'], ['openbaar', 'Openbaar: in de lijst']], openbaar ? 'openbaar' : 'prive', 'ds-z-segment--blok', 'Wie mag meedoen')}
        <div class="mp-grid2" style="gap:14px">
          <div class="mp-veld"><span class="mp-label">Wachtwoord (niet verplicht)</span><div class="mp-input"><span class="mp-zacht">Leeg: geen wachtwoord</span></div></div>
          <div class="mp-veld"><span class="mp-label">Hoeveel spelers hoogstens</span><div>${stapper('8')}</div></div>
        </div>
        ${openbaar ? `<div class="mp-veld"><span class="mp-label">Naam van je sessie</span>${naamState}</div>` : `<p class="mp-hulp">Een privé sessie staat nergens in een lijst. Ook niet voor spelers die je niet kent.</p>`}
        ${openbaar ? `<div class="mp-grid2" style="gap:14px"><section class="mp-blok"><div class="mp-label">Dit staat in de lijst</div><ul style="padding-left:18px;font-size:17px"><li>de naam van je sessie</li><li>hoeveel spelers er zijn, en het maximum</li><li>de versie van het spel</li><li>een willekeurig sessie-id</li></ul></section><section class="mp-blok"><div class="mp-label">Dit staat er nooit in</div><ul style="padding-left:18px;font-size:17px"><li>je IP-adres</li><li>je wachtwoord en je kamercode</li><li>je eigen naam</li></ul></section></div>` : ''}
      </div>
      <aside class="mp-kol" style="gap:12px">
        ${tussenkop('Zo zien anderen het')}
        ${openbaar ? `<div class="mp-blok"><div class="mp-label">Openbare sessies</div><table class="ds-z-tabel"><thead><tr><th class="l">Sessie</th><th>Spelers</th><th>Versie</th></tr></thead><tbody><tr aria-selected="true"><td class="l"><b>${esc('Zomeravond')}</b></td><td>1/8</td><td>0.66.0</td></tr></tbody></table></div>` : `<div class="mp-notitie">${I('slot')}<span>Niemand vindt je sessie zonder code. Alleen wie de code heeft komt binnen, en jij kunt iedereen weer verwijderen.</span></div>`}
        ${openbaar ? notitie('Het spel zet de regel elke 15 seconden bij de openbare hulpservers. Die zien hem onversleuteld. Je zet het weer uit met “Weer privé maken”; dan stopt het en krijg je een nieuwe code.', 'info', 'let') : ''}
        ${openbaar ? `<div class="mp-vink" style="margin-top:4px">${vink('Ik snap dat dit voor iedereen met het spel zichtbaar is', true)}</div>` : ''}
      </aside></div>
      <div class="mp-voet">${knop('Terug', 'secundair')}<span class="mp-hulp">${openbaar ? 'Je code komt zodra de sessie open is.' : 'Je krijgt meteen een code om te delen.'}</span><span class="mp-voet__ruimte"></span>${knop('Open je spel')}</div>`,
    hint: [['↑+↓', 'kiezen'], ['Enter', 'open je spel'], ['Esc', 'terug']],
  });
  S['c1-openen-prive'] = () => hostForm(false);
  S['c2-openen-openbaar'] = () => hostForm(true, `<div class="mp-input mp-input--ok"><span>Zomeravond</span><small>10 van 24</small></div><span class="mp-veldmelding mp-veldmelding--ok">${I('vinkje', 'mp-ic--s')}Deze naam kan.</span>`);

  // 3b. Sessienamen: de drie toestanden van het veld, met de lijst verboden woorden in gewone taal
  S['c3-sessienaam'] = () => frame({
    koptekst: spelKop('Samen spelen'),
    inhoud: `<div class="mp-grid2" style="margin-top:8px;gap:22px;align-content:start">
      <div class="mp-kol" style="gap:18px">
        ${tussenkop('Toegestaan')}
        <div class="mp-veld"><span class="mp-label">Naam van je sessie</span><div class="mp-input mp-input--ok"><span>Fietsen in Grunn</span><small>16 van 24</small></div><span class="mp-veldmelding mp-veldmelding--ok">${I('vinkje', 'mp-ic--s')}Deze naam kan.</span></div>
        ${tussenkop('Geweigerd: verboden woord')}
        <div class="mp-veld"><span class="mp-label">Naam van je sessie</span><div class="mp-input mp-input--fout"><span>Familie Jansen</span><small>14 van 24</small></div><span class="mp-veldmelding mp-veldmelding--fout">${I('waarschuwing', 'mp-ic--s')}Deze naam kan niet: kies een andere. Scheldwoorden, echte merken en namen van echte mensen mogen niet.</span></div>
        ${tussenkop('Geweigerd: adres of nummer')}
        <div class="mp-veld"><span class="mp-label">Naam van je sessie</span><div class="mp-input mp-input--fout"><span>speel.mee.nl</span><small>12 van 24</small></div><span class="mp-veldmelding mp-veldmelding--fout">${I('waarschuwing', 'mp-ic--s')}Een naam mag geen adres, telefoonnummer of internetadres zijn.</span></div>
      </div>
      <div class="mp-kol" style="gap:14px">
        ${tussenkop('Zo gaat het veld te werk')}
        <ul class="mp-stappen"><li>Je typt; het spel controleert elke toets, niet pas bij “Open je spel”.</li><li>Een geweigerde naam blijft staan en krijgt de reden eronder. Je hoeft niets over te typen.</li><li>Hoogstens 24 tekens. Letters, cijfers, spaties en . , ' ! ? & ( ) + -</li><li>Lege naam: het spel kiest “Zomeravond” of een andere vaste naam.</li></ul>
        ${tussenkop('Ideeën, als je even niets weet')}
        <div class="mp-rij" style="flex-wrap:wrap;gap:8px">${['Zomeravond', 'Pannenkoeken', 'Late dienst', 'Fietsen in Grunn', 'Zondagse ronde'].map((t) => klein(esc(t), 'secundair')).join('')}</div>
        ${notitie('De lijst met verboden woorden blijft in het spel zelf (net/serverlijst.js). De speler ziet nooit de lijst, alleen de reden: zo is hij niet te omzeilen door hem te lezen.', 'info')}
      </div></div>`,
    hint: [['Enter', 'bewaren'], ['Esc', 'terug']],
  });

  // 4. Openbare sessies: een tabel met detail, in plaats van pillen en zinnen
  S['d1-lijst'] = () => {
    const rijen = [['Zomeravond', '3/8', '0.66.0', true, 'Ontspannen', ''], ['Pannenkoeken', '1/4', '0.66.0', true, 'Standaard', ''], ['Fietsen in Grunn', '2/6', '0.66.0', true, 'Standaard', 'ster'], ['Late dienst', '8/8', '0.66.0', false, 'Uitdagend', 'vol'], ['Terpentijn', '2/8', '0.65.2', false, 'Standaard', 'versie']];
    return frame({
      koptekst: spelKop('Samen spelen'),
      inhoud: `<div class="mp-rij" style="gap:14px;margin-top:4px"><div class="mp-input" style="flex:1;min-height:42px;font-size:19px"><span class="mp-zacht">Zoek op naam</span><button type="button" class="ds-z-knop ds-z-knop--secundair">Toetsenbord</button></div>${seg([['k', 'Kan meedoen'], ['f', 'Favorieten'], ['a', 'Alles']], 'k', 'ds-z-segment--klein', 'Filter')}<span class="ds-z-stapper"><button type="button">‹</button><span>Sorteren: Meeste spelers</span><button type="button">›</button></span></div>
      <div class="mp-md" style="grid-template-columns:1fr 440px">
        <div class="mp-tabel"><table class="ds-z-tabel"><thead><tr><th class="c" style="width:48px"></th><th class="l">Sessie</th><th>Spelers</th><th>Wereld</th><th class="l">Versie</th></tr></thead><tbody>${rijen.map(([n, sp, v, kan, niv, x], i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${!kan ? ' class="is-weg"' : ''}><td class="c">${x === 'ster' ? I('ster_vol') : I('ster', 'mp-zacht')}</td><td class="l"><b style="font-size:20px">${esc(n)}</b></td><td>${sp}</td><td>${niv}</td><td class="l">${x === 'versie' ? `<span class="ds-z-status ds-z-status--probleem">${I('waarschuwing', 'mp-ic--s')}${v} (jij 0.66.0)</span>` : x === 'vol' ? `<span class="ds-z-status ds-z-status--zacht">Vol</span>` : `<span class="ds-z-status ds-z-status--goed">${I('vinkje', 'mp-ic--s')}${v} gelijk</span>`}</td></tr>`).join('')}</tbody></table></div>
        <aside class="mp-detail"><div class="mp-hero"><div class="mp-label">Gekozen sessie</div><div class="mp-hero__titel">Zomeravond</div>${feiten([['Spelers', '3 van 8'], ['Wereld', 'Ontspannen'], ['Versie', '0.66.0, gelijk aan jouw spel']])}<div class="mp-actie">${knop('Meedoen', '', '')}<span class="mp-actie__sub">Je vraagt de sessie om een code; het kost niets.</span></div></div>${notitie('Wie de sessie opende, zie je pas als je binnen bent. Hier staan geen namen van mensen.', 'info')}<div class="mp-rij">${link('Maak favoriet')}${link('Verberg deze sessie')}</div></aside></div>
      <div class="mp-voet">${knop('Terug', 'secundair')}<span class="mp-hulp">${I('slot', 'mp-ic--s')} De lijst komt van dezelfde openbare servers. Je naam gaat er niet heen.</span><span class="mp-voet__ruimte"></span>${knop('Lijst verversen', 'secundair')}</div>`,
      hint: [['↑+↓', 'kiezen'], ['Enter', 'meedoen'], ['F', 'favoriet'], ['Esc', 'terug']],
    });
  };

  // 5. Verbinden: de staten van een gast, zonder jargon
  S['d2-verbinden'] = () => {
    const stap = (t, st) => `<li style="list-style:none;display:flex;gap:10px;align-items:center;font-size:19px">${st === 'klaar' ? I('vinkje', 'mp-plus') : st === 'bezig' ? I('zandloper') : st === 'fout' ? I('kruis', 'mp-min') : I('puntjes', 'mp-zacht')}<span class="${st === 'later' ? 'mp-zacht' : ''}">${t}</span></li>`;
    const kaart = (titel, inhoud, acties, mod = '') => `<section class="hudkaart hudkaart--kop" style="box-shadow:none"><div class="kop"${mod ? ' style="background:var(--ds-c-rood)"' : ''}>${titel}</div><div class="mp-kol" style="gap:10px">${inhoud}<div class="mp-actie">${acties}</div></div></section>`;
    const lijst = (...s) => `<ul class="mp-kol" style="gap:6px;padding:0">${s.join('')}</ul>`;
    return frame({
      koptekst: spelKop('Samen spelen'),
      inhoud: `<div class="mp-grid2" style="gap:16px;margin-top:6px;align-content:start">
        ${kaart('Verbinden', lijst(stap('De kamer zoeken', 'klaar'), stap('Contact leggen met Sem', 'bezig'), stap('Binnenkomen', 'later')) + `<div class="mp-tijd"><b style="width:55%"></b></div><span class="mp-hulp">Dit duurt meestal minder dan een halve minuut.</span>`, knop('Annuleren', 'secundair'))}
        ${kaart('De sessie vraagt een wachtwoord', `<p>Wie het spel opende heeft er een op gezet. Je vraagt het hem gewoon.</p><div class="mp-veld"><span class="mp-label">Wachtwoord</span><div class="mp-input"><span>••••••</span><button type="button" class="ds-z-knop ds-z-knop--secundair">Toetsenbord</button></div></div>`, knop('Probeer opnieuw') + knop('Terug', 'secundair'))}
        ${kaart('Dit lukt niet', `<p><b>De code klopt niet.</b> Controleer of de laatste tekens goed staan: het zijn letters en cijfers, zonder O of 0 door elkaar.</p>`, knop('Opnieuw typen') + link('Hulp bij verbinden'), 'ds-z-kaart--probleem')}
        ${kaart('Deze sessie zit vol', `<p>Er zijn 8 van 8 spelers. Vraag Sem om een plek, of kijk of er een andere sessie is.</p>`, knop('Openbare sessies') + knop('Terug', 'secundair'), 'ds-z-kaart--probleem')}
        </div>
        <div class="mp-voet"><span class="mp-hulp">Je eigen spel staat tijdens het verbinden veilig: er verandert niets aan je voortgang.</span></div>`,
      hint: [['Enter', 'doen'], ['Esc', 'annuleren']],
    });
  };

  // 6. Je figuur: naam, kleur, vorm, personage en kleding bij het meedoen, met een voorbeeld zoals anderen je zien
  S['e-figuur'] = () => frame({
    koptekst: spelKop('Samen spelen'),
    inhoud: `<div class="mp-md" style="grid-template-columns:460px 1fr;margin-top:6px">
      <div class="mp-hero" style="align-items:center;gap:12px"><div class="mp-label" style="align-self:flex-start">Voorbeeld</div>
        <div style="width:100%;height:330px;border:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt);border-radius:var(--ds-r);background:var(--ds-c-papier-2);display:grid;place-items:center;position:relative;overflow:hidden"><div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:8px"><span class="mp-naamplaat">${vorm('#5bd6a0', '★', 's')}Iris</span><div style="width:110px;height:200px;background:var(--ds-c-ink-papier);border:3px solid var(--ds-c-ink-inkt);border-radius:55px 55px 8px 8px;display:grid;place-items:center" class="mp-zacht">3D</div></div></div>
        <span class="mp-hulp">In het spel is dit het 3D-voorbeeld van je figuur.</span></div>
      <div class="mp-kol" style="gap:12px">
        <div class="mp-veld"><span class="mp-label">Je naam</span><div class="mp-input mp-input--ok"><span>Iris</span><small>4 van 16</small></div></div>
        <div class="mp-veld"><span class="mp-label">Kleur en vorm</span><div class="mp-rij" style="gap:10px">${[['#4fb3ff', '●'], ['#5bd6a0', '★'], ['#f2b134', '✚'], ['#ff9a62', '♥'], ['#ff7ab8', '☾'], ['#b78cff', '◆'], ['#e86a6a', '■'], ['#6fd3e0', '≈']].map(([k, v], i) => `<span style="position:relative;width:56px;height:56px;display:grid;place-items:center;border:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt);border-radius:var(--ds-r);background:var(--ds-zeef-bg);${i === 1 ? 'outline:4px solid var(--ds-c-ink-bord);outline-offset:2px;box-shadow:var(--ds-schaduw-hard-klein)' : ''}">${vorm(k, v)}${i === 1 ? '<span style="position:absolute;right:-8px;top:-10px;background:var(--ds-c-ink-bord);color:var(--ds-c-wit);width:22px;height:22px;display:grid;place-items:center;border-radius:50%;font-size:14px">✓</span>' : ''}</span>`).join('')}</div><span class="mp-hulp">Gekozen: groen met een ster. De vorm helpt wie kleuren moeilijk ziet: kleur is nooit het enige.</span></div>
        <div class="mp-veld"><span class="mp-label">Je figuur</span>${seg([['t', 'Tessa'], ['m', 'Tammo'], ['e', 'Een andere figuur']], 't', '', 'Figuur')}</div>
        <div class="mp-veld"><span class="mp-label">Kleding</span>${seg([['e', 'Mijn eigen kleding'], ['s', 'Vaste set']], 'e', '', 'Kleding')}<span class="mp-hulp">Je draagt wat je zelf bij Spullen hebt gekozen. Anderen zien het ook.</span></div>
        ${notitie('Je verhaal blijft Tammo of Tessa, wat dat verhaal vraagt. Dit gaat alleen over hoe anderen je zien.', 'info')}
      </div></div>
      <div class="mp-voet">${knop('Terug', 'secundair')}<span class="mp-hulp">Je kunt dit later aanpassen bij Instellingen, Samen spelen.</span><span class="mp-voet__ruimte"></span>${knop('Verder')}</div>`,
    hint: [['↑+↓+←+→', 'kiezen'], ['Enter', 'verder'], ['Esc', 'terug']],
  });
}
