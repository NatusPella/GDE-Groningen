// Schermen C: toestemming, in het spel (Tab, naamplaten, kaart), Meedoen?, gezamenlijke keuzes, hostwissel, verbindingsverlies, hervatten, beloning, praten (gereserveerd), instellingen, toestanden, bediening.
import { spelKop, I, esc, toets, knop, klein, link, tussenkop, status, blokStatus, seg, stapper, feiten, notitie, vink, sig, vorm, standTekst, P, frame, kop, tabrij, hints, HINT_STD, TABS_ZONDER, hudFrame, sessieFrame, tabsMet } from './helpers.mjs';

const nu = (t) => `<span class="mp-naamplaat">${t}</span>`;
const kaartKop = (titel, ic) => `<div class="kop">${ic ? I(ic) : ''}${esc(titel)}</div>`;
const stemTeller = (items) => `<div class="mp-stemmen">${items.map(([n, s]) => `<span class="${s}">${s === 'ja' ? I('vinkje', 'mp-ic--s') : s === 'nee' ? I('kruis', 'mp-ic--s') : I('zandloper', 'mp-ic--s')}${esc(n)}</span>`).join('')}</div>`;
const tijdBalk = (pct, tekst) => `<div class="mp-rij" style="gap:10px"><div class="mp-tijd" style="flex:1"><b style="width:${pct}%"></b></div><span class="mp-getal" style="font-size:20px">${tekst}</span></div>`;

export default function (S) {
  // ---- toestemming bij het verbinden: eerlijk, per dienst, zonder jargon in de koppen
  S['j-toestemming'] = () => frame({
    actief: 'samen', koptekst: spelKop('Samen spelen'),
    inhoud: `<div class="mp-kol" style="gap:10px;margin-top:6px"><table class="mp-wie"><thead><tr><th>Wie</th><th>Wat zien ze</th><th>Waarom</th></tr></thead><tbody>
        <tr><td>Je medespelers<small>de mensen in jouw sessie</small></td><td>Je naam, je kleur en je IP-adres.</td><td>Een rechtstreekse verbinding tussen jullie computers kan niet zonder.</td></tr>
        <tr><td>Hulpservers om elkaar te vinden<small>openbaar, niet van ons</small></td><td>Je IP-adres, en dat je een verbinding zoekt. Net als elke server die je bereikt.</td><td>Ze vertellen je computer hoe die van buiten te bereiken is.</td></tr>
        <tr><td>Postbussen voor het opzetten<small>openbare servers</small></td><td>Alleen versleutelde berichten. Zij kunnen ze niet lezen.</td><td>Jullie wisselen er het adres van de kamer uit.</td></tr>
        <tr><td>De lijst met openbare sessies<small>alleen als jij dat kiest</small></td><td>De naam van je sessie, het aantal spelers en de versie. Geen IP-adres, geen wachtwoord.</td><td>Spelers die je niet kent kunnen zo meedoen.</td></tr>
        <tr class="is-niets"><td>Wij<small>de makers van het spel</small></td><td><b>Niets.</b> Er gaat niets naar een server van ons.</td><td>Je IP-adres wordt nergens in het spel getoond of bewaard.</td></tr></tbody></table>
        ${notitie('Los hiervan haalt het spel openbare gegevens op, zoals de live bussen en treinen. Daar gaat niets over jou naartoe; je zet ze uit bij Instellingen.', 'info')}</div>
      <div class="mp-voet">${vink('Niet meer vragen op dit apparaat', false)}<span class="mp-voet__ruimte"></span>${knop('Annuleren', 'secundair')}${knop('Akkoord en verbinden')}</div>`,
    hint: [['Enter', 'akkoord en verbinden'], ['Esc', 'annuleren']],
  });

  // ---- in het spel: de Tab-lijst, naamplaten en de minikaart
  S['k1-hud-tab'] = () => {
    const rij = (p, i) => `<div class="mp-rij" style="gap:12px;padding:3px 8px;border-bottom:var(--ds-lijn) solid var(--ds-c-ink-inkt);${p.sig === 'weg' ? 'opacity:.6' : ''}">${vorm(p.k, p.v, 's')}<span class="mp-naam" style="min-width:110px;font-size:20px">${esc(p.naam)}${i === 0 ? '<span class="mp-jij">JIJ</span>' : ''}</span><span style="width:130px;font-size:17px">${esc(p.doet)}</span><span class="mp-hulp" style="width:100px">${esc(p.afstand || '')}</span>${sig(p.sig)}<span style="margin-left:auto">${p.stand === 'actief' ? I('zwaard', 'mp-ic--s') : I('schild', 'mp-ic--s mp-zacht')}</span></div>`;
    const lijst = `<div class="hud hudkaart" style="left:640px;top:100px;width:640px;padding:6px 14px;gap:0"><div class="mp-rij mp-rij--tussen"><h2 style="font-size:22px">Spelers <small class="mp-getal" style="font-size:16px">5</small></h2><span class="mp-hulp">${toets('Tab')} loslaten sluit</span></div>${P.map(rij).join('')}</div>`;
    const plaat = (x, y, inh, mod = '') => `<div class="hud" style="left:${x}px;top:${y}px;transform:translateX(-50%)"><span class="mp-naamplaat ${mod}">${inh}</span></div>`;
    const mini = (x, y, p, extra = '') => `<span class="hud mp-vorm mp-vorm--s" style="left:${x}px;top:${y}px;--k:${p.k};${extra}">${p.v}</span>`;
    return hudFrame({ inhoud: lijst
      + plaat(668, 392, vorm('#5bd6a0', '★', 's') + 'Iris')
      + plaat(965, 372, vorm('#4fb3ff', '●', 's') + 'Sem <small>jij</small>')
      + plaat(1190, 400, vorm('#f2b134', '✚', 's') + 'Tijn ' + `<span class="mp-sig mp-sig--matig" style="font-size:12px"><i><b></b><b></b><b></b></i></span>`, 'mp-naamplaat--ver')
      + plaat(1330, 470, vorm('#ff9a62', '♥', 's') + 'Liv · weg', 'mp-naamplaat--weg')
      + mini(236, 800, P[1]) + mini(150, 860, P[4]) + mini(300, 762, P[2], 'opacity:.6') + `<span class="hud mp-vorm mp-vorm--s mp-vorm--weg" style="left:80px;top:742px;--k:#ff9a62">♥</span>`
      + `<div class="hud mp-hulp" style="left:360px;top:760px;background:var(--ds-c-ink-papier);border:2px solid var(--ds-c-ink-inkt);border-radius:6px;padding:6px 10px;font-size:15px;max-width:290px;color:var(--ds-c-ink-inkt)"><b>Minikaart:</b> elke speler heeft zijn eigen vorm en kleur; buiten beeld wijst een pijl met zijn vorm. Wie weg is, staat als holle vorm op de laatste plek.</div>` });
  };

  // ---- de kaart (M): medespelers met vorm, kleur en lijst
  S['k2-kaart'] = () => {
    const mark = (x, y, p, ex = '') => `<span class="mp-vorm mp-vorm--s" style="position:absolute;left:${x}px;top:${y}px;--k:${p.k};${ex}">${p.v}</span><span class="mp-naamplaat" style="position:absolute;left:${x + 30}px;top:${y}px;font-size:16px;padding:0 8px">${p.naam}</span>`;
    return frame({
      railNaam: 'Kaart', actief: 'kaart', tabs: [['kaart', 'Kaart'], ['plekken', 'Plekken'], ['route', 'Route']], koptekst: kop({ eb: 'Doen', titel: 'Kaart', sub: 'Groningen · 08:07', rechts: blokStatus('Spelers op de kaart', '5', 'spelers') }),
      inhoud: `<div class="mp-md" style="grid-template-columns:1fr 380px;margin-top:6px"><div class="kaartvlak" style="height:100%"><svg viewBox="0 0 900 560" preserveAspectRatio="none"><rect width="900" height="560" fill="var(--ds-c-papier-2)"/><path d="M0,330 C150,300 250,380 400,350 S700,300 900,340 L900,420 C700,380 550,430 400,430 S120,410 0,420Z" fill="var(--ds-c-glas)" opacity=".55"/>${[[80, 40, 700, 40], [80, 150, 700, 150], [120, 40, 120, 520], [330, 40, 330, 520], [560, 40, 560, 520], [750, 40, 750, 520], [80, 250, 860, 250]].map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="var(--ds-c-ink-inkt)" stroke-width="6" opacity=".25"/>`).join('')}</svg>
        <div style="position:absolute;inset:0">${mark(420, 200, P[0])}${mark(560, 120, P[1])}${mark(470, 330, P[2], 'opacity:.7')}${mark(300, 170, P[4])}<span class="mp-vorm mp-vorm--s mp-vorm--weg" style="position:absolute;left:180px;top:250px;--k:#ff9a62">♥</span><span class="mp-hulp" style="position:absolute;left:215px;top:252px;background:var(--ds-c-ink-papier);padding:0 6px">Liv · laatst gezien</span>
        <div class="mp-rij" style="position:absolute;left:12px;bottom:12px;gap:8px;background:var(--ds-c-ink-papier);border:2px solid var(--ds-c-ink-inkt);border-radius:6px;padding:4px 10px;font-size:15px">${toets('S')} spelers tonen of verbergen</div></div></div>
        <aside class="mp-detail">${tussenkop('Spelers')}${P.map((p) => `<div class="mp-rij" style="padding:7px 0;border-bottom:var(--ds-lijn) solid var(--ds-c-ink-inkt)">${vorm(p.k, p.v, 's')}<div class="mp-kol" style="gap:0"><span class="mp-naam" style="font-size:19px">${p.naam}${p.id === 0 ? '<span class="mp-jij">JIJ</span>' : ''}</span><span class="mp-hulp">${p.afstand || p.doet}</span></div><span style="margin-left:auto">${p.id === 0 ? '' : link('Ga erheen')}</span></div>`).join('')}${notitie('“Ga erheen” zet een route naar die speler. Jouw route zien anderen niet.', 'info')}</aside></div>`,
      hint: [['←+→+↑+↓', 'kaart verschuiven'], ['Enter', 'ga erheen'], ['S', 'spelers'], ['Esc', 'terug']] });
  };

  // ---- Meedoen?: gast en opener
  const meedoenKaart = (rol) => `<div class="hud hudkaart hudkaart--kop" style="left:520px;top:640px;width:880px">${kaartKop('Meedoen?', 'spelers')}
      ${rol === 'gast' ? `<h2>Meedoen met Race naar het Hoofdstation?</h2><p>Sem begint hem. Je krijgt de volledige beloning en je eigen verhaalstap. Geen antwoord: je kijkt mee.</p>` : `<h2>Race naar het Hoofdstation</h2><p>Je hebt de race gestart. Wie meedoet krijgt de volledige beloning. Wie niet antwoordt, kijkt mee.</p>`}
      ${tijdBalk(rol === 'gast' ? 76 : 76, '8 s')}
      ${stemTeller(rol === 'gast' ? [['Sem', 'ja'], ['Tijn', 'wacht'], ['Gijs', 'nee']] : [['Iris', 'ja'], ['Tijn', 'wacht'], ['Gijs', 'nee']])}
      <div class="mp-actie">${rol === 'gast' ? `${knop('Ja ' + toets('J'), '', 'ds-z-knop--toets')}${knop('Nee ' + toets('N'), 'secundair')}` : `${knop('Nu beginnen', 'secundair')}<span class="mp-actie__sub">Het begint vanzelf als iedereen antwoordde of de tijd om is.</span>`}</div><span class="mp-hulp">${rol === 'gast' ? 'Aansluiten halverwege een race kan niet. Komt er een volgende, dan vraagt het spel het weer.' : 'Wie later komt, kijkt mee en doet de volgende mee.'}</span></div>`;
  S['l1-meedoen-gast'] = () => hudFrame({ inhoud: meedoenKaart('gast') });
  S['l2-meedoen-opener'] = () => hudFrame({ inhoud: meedoenKaart('opener') });

  // ---- gezamenlijke keuzes: voorstel doen, stemmen, uitslag
  S['m-stemming'] = () => hudFrame({ klas: 'is-donker', inhoud: `<div class="scherm"><div style="display:grid;grid-template-columns:660px 660px;gap:24px;align-items:start">
    <div class="hudkaart hudkaart--kop">${kaartKop('Samen kiezen', 'tijd')}<div class="mp-hulp" style="font-size:15px;align-self:flex-start">1. Iris wil slapen en doet een voorstel</div><h2>Slapen tot 07:00?</h2><p>Als iedereen akkoord is, springt de tijd voor jullie allemaal vooruit.</p><div class="mp-rij"><span class="mp-hulp">Op een bed:</span>${knop('Stel voor ' + toets('E'), 'secundair', 'mp-klein')}<span class="mp-hulp">Alleen jij? Dan slaap je meteen.</span></div></div>
    <div class="hudkaart hudkaart--kop">${kaartKop('Samen kiezen', 'tijd')}<div class="mp-hulp" style="font-size:15px;align-self:flex-start">2. De anderen stemmen</div><h2>Iris wil slapen tot 07:00</h2><p>De tijd springt dan voor iedereen vooruit.</p>${tijdBalk(70, '7 s')}${stemTeller([['Iris', 'ja'], ['Sem', 'wacht'], ['Tijn', 'wacht'], ['Gijs', 'ja']])}<div class="mp-actie">${knop('Ja ' + toets('J'), '', 'ds-z-knop--toets')}${knop('Nee ' + toets('N'), 'secundair')}</div></div>
    <div class="hudkaart hudkaart--kop">${kaartKop('Samen kiezen', 'tijd')}<div class="mp-hulp" style="font-size:15px;align-self:flex-start">3a. Iedereen akkoord</div><h2>Akkoord: jullie slapen</h2><p>De tijd springt naar 07:00. Wie wegviel tijdens de stem telde niet mee.</p>${stemTeller([['Iris', 'ja'], ['Sem', 'ja'], ['Tijn', 'ja'], ['Gijs', 'ja']])}</div>
    <div class="hudkaart hudkaart--kop">${kaartKop('Samen kiezen', 'tijd')}<div class="mp-hulp" style="font-size:15px;align-self:flex-start">3b. Niet iedereen akkoord</div><h2>Niet akkoord: de tijd blijft</h2><p>Tijn zei nee. Er verandert niets. Een nieuw voorstel kan over een minuut.</p>${stemTeller([['Iris', 'ja'], ['Sem', 'ja'], ['Tijn', 'nee'], ['Gijs', 'ja']])}</div>
    </div></div>` });

  // ---- hostwissel: wie het spel draait verandert, niemand verliest iets
  S['n-hostwissel'] = () => hudFrame({ klas: 'is-donker', inhoud: `<div class="scherm"><div style="display:grid;grid-template-columns:660px 660px;gap:24px;align-items:start">
    <div class="hudkaart hudkaart--kop">${kaartKop('Het spel overnemen?', 'handdruk')}<div class="mp-hulp" style="font-size:15px;align-self:flex-start">1. Voor Iris, die gevraagd wordt</div><p>Sem wil het spel aan jou overdragen. Daarna draait het spel op jouw computer. Tijd, weer en je voortgang blijven zoals ze waren.</p>${tijdBalk(70, '14 s')}<div class="mp-actie">${knop('Ja ' + toets('J'), '', 'ds-z-knop--toets')}${knop('Nee ' + toets('N'), 'secundair')}</div><span class="mp-hulp">Zonder antwoord is het nee.</span></div>
    <div class="hudkaart hudkaart--kop">${kaartKop('Even wachten', 'zandloper')}<div class="mp-hulp" style="font-size:15px;align-self:flex-start">2. Voor iedereen, tijdens het overzetten</div><p>Het spel gaat over naar Iris. Je blijft verbonden en niemand verliest iets.</p>${tijdBalk(40, '± 20 s')}<div class="mp-actie">${knop('Stoppen', 'secundair')}</div><span class="mp-hulp">Alleen Sem kan het overzetten stoppen zolang hij het spel nog heeft.</span></div>
    <div class="hudkaart hudkaart--kop">${kaartKop('Klaar', 'vinkje')}<div class="mp-hulp" style="font-size:15px;align-self:flex-start">3. Voor iedereen, een melding</div><h2>Iris heeft nu het spel</h2><p>Tijd, weer, verkeer en je opdracht zijn gelijk gebleven. Sem speelt gewoon verder als een van jullie.</p></div>
    <div class="hudkaart hudkaart--kop">${kaartKop('Het spel is overgenomen', 'handdruk')}<div class="mp-hulp" style="font-size:15px;align-self:flex-start">4. Als Sem onverwacht wegvalt</div><h2>Sem is weg: Iris neemt het over</h2><p>Na 12 seconden stilte neemt Iris het spel over. Jullie blijven samen. Wie later aansluit, komt in de wereld van Iris.</p></div>
    </div></div>` });

  // ---- verbindingsverlies: jij raakt weg, een ander valt weg
  S['o1-weg-jij'] = () => hudFrame({ klas: 'is-donker', inhoud: `<div class="scherm"><div class="hudkaart hudkaart--kop" style="width:760px"><div class="kop" style="background:var(--ds-c-rood)">${I('wifi_uit')}Je verbinding is weg</div><p>Het spel probeert opnieuw te verbinden. Je eigen spel staat veilig: je geld en je voortgang zijn net nog bewaard.</p>${tijdBalk(40, 'poging 2 van 5')}${notitie('Zonder nieuwe verbinding ga je terug naar je eigen spel, precies waar je was. Je mist alleen wat de anderen doen.', 'info')}<div class="mp-actie">${knop('Opnieuw verbinden')}${knop('Terug naar mijn eigen spel', 'secundair')}${link('Verbinding testen')}</div></div></div>` });
  S['o2-weg-ander'] = () => hudFrame({ inhoud: `<div class="hud hudkaart" style="left:1280px;top:210px;width:560px;padding:10px 14px;flex-direction:row;align-items:center;gap:12px">${vorm('#ff9a62', '♥', 's')}<div class="mp-kol" style="gap:0"><b style="font-size:20px">Liv is weg</b><span style="font-size:16px">Het spel gaat door. Zijn voortgang blijft veilig.</span></div></div>
    <div class="hud hudkaart hudkaart--kop" style="left:520px;top:600px;width:880px">${kaartKop('Wachten op Liv', 'zandloper')}<p>De race heeft Liv nodig. Het spel wacht even tot zijn verbinding terug is.</p>${tijdBalk(60, '18 s')}<div class="mp-actie">${knop('Nu zonder Liv verder', 'secundair')}<span class="mp-actie__sub">Liv blijft in de sessie en kan weer meedoen aan de volgende. Na 30 seconden gaat het vanzelf verder.</span></div></div>` });

  // ---- hervatten
  S['p-hervat'] = () => hudFrame({ klas: 'is-donker', inhoud: `<div class="scherm"><div class="hudkaart hudkaart--kop" style="width:780px"><div class="kop" style="background:var(--ds-c-ink-bord)">${I('vinkje')}Je bent weer verbonden</div><h2>Welkom terug in het spel van Sem</h2><p>Je was 1 minuut en 12 seconden weg. Je eigen spel is niet veranderd.</p>${tussenkop('Dit gebeurde ondertussen')}<ul class="mp-kol" style="gap:6px;padding:0;list-style:none;font-size:18px"><li>${I('medaille', 'mp-ic--s')} Race naar het Hoofdstation is begonnen zonder jou. Je hebt niets gemist: wie niet antwoordt, kijkt mee.</li><li>${I('vis', 'mp-ic--s')} Iris is gaan hengelen.</li></ul><div class="mp-actie">${knop('Verder spelen')}${knop('Naar de anderen toe ' + toets('B'), 'secundair')}</div></div></div>` });

  // ---- beloning en voortgang na een gezamenlijke activiteit
  S['q-beloning'] = () => hudFrame({ klas: 'is-donker', inhoud: `<div class="scherm"><div class="hudkaart hudkaart--kop" style="width:1180px">${kaartKop('Race naar het Hoofdstation: klaar', 'medaille')}<div style="display:grid;grid-template-columns:1fr 440px;gap:26px;margin:0 20px">
      <div class="mp-kol" style="gap:6px">${tussenkop('Uitslag')}${[['1', P[1], '3:12'], ['2', P[0], '3:20'], ['3', P[2], '3:41']].map(([pl, p, t]) => `<div class="mp-rij" style="padding:6px 8px;${p.id === 0 ? 'background:var(--ds-c-sel-vlak);border-left:var(--ds-status-rand) solid var(--ds-c-ink-bord)' : 'border-bottom:var(--ds-lijn) solid var(--ds-c-ink-inkt)'}"><span class="mp-getal" style="font-size:26px;width:30px">${pl}</span>${vorm(p.k, p.v, 's')}<span class="mp-naam">${p.naam}${p.id === 0 ? '<span class="mp-jij">JIJ</span>' : ''}</span><span class="mp-getal" style="margin-left:auto;font-size:22px">${t}</span></div>`).join('')}
        ${notitie('Gijs en Liv deden niet mee en keken mee. Ze krijgen geen beloning en verliezen niets.', 'info')}</div>
      <div class="mp-kol" style="gap:8px">${tussenkop('Voor jou')}<div class="ds-z-bon mp-bon"><div class="ds-z-bon__regel"><span>Beloning, tweede plek</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">€ 180</span></div><div class="ds-z-bon__regel"><span>Samen gedaan, 3 spelers (×2)</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag mp-plus">+ € 180</span></div><div class="ds-z-bon__totaal"><span>Verdiend</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">€ 360</span></div></div>${feiten([['Loopbaan, race', '+ 40 punten'], ['Je verhaal', 'ongewijzigd']])}
        <span class="mp-hulp">${I('vinkje', 'mp-ic--s')} Opgeslagen in <b>jouw</b> spel. Je ziet alleen je eigen bedrag; de anderen krijgen hun eigen beloning.</span></div></div>
      <div class="mp-actie" style="padding-bottom:4px">${knop('Doorgaan')}${knop('Nog een keer voorstellen', 'secundair')}</div></div></div>` });

  // ---- praten (#451): alleen een gereserveerde plek, nog niets gebouwd
  S['r-praten'] = () => sessieFrame({
    actief: 'praten', rol: 'opener', n: 4, tabs: tabsMet(4).map((t) => (t[0] === 'praten' ? ['praten', 'Praten · later', null, 'uit'] : t)),
    inhoud: `<div class="mp-md" style="grid-template-columns:1fr 520px;margin-top:6px"><div class="mp-kol" style="gap:12px">${tussenkop('De plek is er al')}
      <div class="mp-gereserveerd"><div class="mp-rij">${I('bericht', 'mp-ic--l')}<b style="font-size:22px;font-family:var(--ds-font-zeef-kop);text-transform:uppercase;letter-spacing:.04em">Praten: komt later</b></div><span style="font-size:18px">Hier komen straks tekstchat en voicechat. Er is nog niets gebouwd. Wat al vaststaat:</span>
      <ul class="mp-stappen" style="gap:6px"><li>Alleen <b>opt-in</b>: standaard uit, jij zet het aan.</li><li><b>Dempen en blokkeren</b> per speler, net als nu; de keuze blijft na een hostwissel.</li><li>Niets wordt opgeslagen. Geen geschiedenis, geen opnames.</li><li>Het spel is 18+: je kunt een speler altijd blokkeren.</li></ul></div>
      ${tussenkop('Wat er nu al kan')}<div class="mp-rij" style="gap:10px;flex-wrap:wrap">${['Kom hier', 'Help!', 'Kijk daar', 'Ja', 'Nee', 'Wacht even'].map((z) => klein(z, 'secundair')).join('')}</div><span class="mp-hulp">Vaste Nederlandse zinnen en een emote (Instellingen, Samen spelen: “Snelle zinnen”). Dit blijft ook als chat er is.</span></div>
      <aside class="mp-kol" style="gap:10px">${tussenkop('Waar het straks verschijnt')}
        <div class="mp-blok"><div class="mp-label">In de spelerslijst</div><div class="mp-rij" style="gap:10px">${vorm('#5bd6a0', '★', 's')}<b class="mp-naam" style="font-size:19px">Iris</b><span style="margin-left:auto;display:inline-flex;gap:6px" class="mp-gereserveerd"><span>${I('koptelefoon', 'mp-ic--s')} stem</span></span></div></div>
        <div class="mp-blok"><div class="mp-label">Boven je figuur</div><div class="mp-rij" style="gap:8px"><span class="mp-naamplaat">${vorm('#5bd6a0', '★', 's')}Iris <span class="mp-gereserveerd" style="padding:0 6px;border-radius:4px">${I('koptelefoon', 'mp-ic--s')}</span></span><span class="mp-hulp">het plekje blijft leeg tot spreken bestaat</span></div></div>
        <div class="mp-blok"><div class="mp-label">Bij Instellingen, Samen spelen</div>${vink('Chat en voice gebruiken', false)}<span class="mp-hulp">Grijs en uit tot #451 is gebouwd.</span></div></aside></div>`,
    hint: [['Q+E', 'tabblad'], ['Esc', 'terug']],
  });

  // ---- Instellingen, Samen spelen
  S['s-instellingen'] = () => frame({
    railNaam: 'Instellingen', actief: 'samen', tabs: [['beeld', 'Beeld'], ['geluid', 'Geluid'], ['regels', 'Spelregels'], ['moeilijk', 'Moeilijkheid'], ['besturing', 'Besturing'], ['interface', 'Interface'], ['hints', 'Hints'], ['toegank', 'Toegankelijkheid'], ['samen', 'Samen spelen']],
    koptekst: kop({ eb: 'Systeem', titel: 'Instellingen', sub: 'Samen spelen: je naam, je akkoord en wat je deelt.', rechts: blokStatus('Akkoord', 'Gegeven', 'vinkje', 'goed') }),
    inhoud: `<div class="mp-md" style="grid-template-columns:1fr 1fr;margin-top:6px"><div class="mp-kol" style="gap:12px">${tussenkop('Zo zien anderen je')}<div class="mp-veld"><span class="mp-label">Je naam</span><div class="mp-input mp-input--ok"><span>Sem</span><button type="button" class="ds-z-knop ds-z-knop--secundair">Toetsenbord</button></div></div><div class="mp-rij" style="gap:10px;background:var(--ds-c-ink-inkt);border-radius:var(--ds-r);padding:10px 14px"><span class="mp-naamplaat">${vorm('#4fb3ff', '●', 's')}Sem</span><span style="color:var(--ds-c-wit);font-size:15px">zo staat het boven je figuur</span></div>${seg([['b', 'Blauw ●'], ['g', 'Groen ★'], ['y', 'Geel ✚'], ['o', 'Oranje ♥']], 'b', '', 'Kleur')}<span class="mp-hulp">Meer kleuren en vormen bij “Je figuur”.</span>
        ${tussenkop('Snelle zinnen')}${vink('Snelle zinnen aan (Kom hier, Help!, Kijk daar en meer)', true)}<span class="mp-hulp">Vaste Nederlandse zinnen, geen vrije tekst. Je dempt of blokkeert per speler bij Spelers.</span></div>
      <div class="mp-kol" style="gap:12px">${tussenkop('Wat het spel naar buiten stuurt')}${[['Alleen spelen', 'Niets over jou.', 'slot', 'goed'], ['Samen spelen', 'Je IP-adres, naar je medespelers en de openbare hulpservers. Je akkoord staat aan.', 'wifi', ''], ['Openbare lijst', 'Alleen als jij je sessie openbaar maakt: naam, spelers en versie.', 'wereldbol', 'zacht'], ['Live bussen en treinen', 'Het spel haalt openbare gegevens op, zonder iets over jou. Je kunt het uitzetten.', 'bus', 'zacht']].map(([t, w, ic, s]) => `<div class="mp-rij" style="align-items:flex-start;padding:6px 0;border-bottom:var(--ds-lijn) solid var(--ds-c-ink-inkt)">${I(ic, 'mp-ic--l')}<div class="mp-kol" style="gap:0"><b style="font-size:19px">${t}</b><span class="mp-hulp" style="font-size:16px">${w}</span></div></div>`).join('')}
        <div class="mp-actie">${knop('Akkoord intrekken', 'secundair')}${link('Wat precies?')}</div><span class="mp-hulp">Na intrekken vraagt het spel het opnieuw als je Samen spelen kiest. Je naam blijft staan.</span></div></div>`,
    hint: [['↑+↓', 'kiezen'], ['←+→', 'wijzigen'], ['Q+E', 'tabblad'], ['Esc', 'terug']],
  });


  // ---- bevestigingen (afgestemd met het Spel-ontwerp): wat je verliest en wat blijft; de veilige keuze is geel met de focus, het onomkeerbare is rood en vraagt vasthouden
  S['v-bevestig'] = () => {
    const bev = (titel, regel, verliest, blijft, veilig, rood, gewoon) => `<section class="mp-bevestig" style="width:640px;padding:18px 22px;gap:10px"><h2 class="mp-bevestig__kop" style="font-size:32px">${titel}</h2><p>${regel}</p><div class="mp-verlies mp-verlies--weg"><div class="mp-verlies__regel">${I('waarschuwing', 'mp-ic--s')}<b>Je verliest</b><span>${verliest}</span></div></div><div class="mp-verlies"><div class="mp-verlies__regel">${I('vinkje', 'mp-ic--s')}<b>Blijft</b><span>${blijft}</span></div></div><div class="mp-bevestig__acties">${knop(veilig + ' ' + toets('Enter'), '', 'mp-focus')}${rood ? knop(rood + ' ' + toets('Enter'), 'gevaar', 'mp-vasthoud mp-rechts') : ''}${gewoon ? knop(gewoon, 'secundair', 'mp-rechts') : ''}</div></section>`;
    const kaarten = `<div class="scherm"><div style="display:grid;grid-template-columns:640px 640px;gap:22px;align-items:start">
      ${bev('Tijn uit het spel zetten?', 'Hij verlaat de sessie en speelt weer zijn eigen spel.', 'de sessie en de race; zonder hem gaat die door', 'zijn geld, zijn voortgang en zijn eigen spel. Hij kan later opnieuw meedoen.', 'Nee, laat hem', 'Houd vast om hem uit het spel te zetten')}
      ${bev('Weer privé maken?', 'Je sessie verdwijnt uit de lijst en krijgt een nieuwe code.', 'de oude code: wie hem heeft kan niet meer binnenkomen', 'iedereen die al in de sessie zit, en jullie spel.', 'Nee, laat openbaar', 'Houd vast om privé te maken')}
      ${bev('Akkoord intrekken?', 'Samen spelen is dan uit tot je opnieuw akkoord geeft.', 'de sessie: je speelt weer je eigen spel', 'je naam, je voortgang en je eigen spel.', 'Nee, houd akkoord', 'Houd vast om in te trekken')}
      ${bev('Het spel verlaten?', 'Iris neemt het spel over en jullie blijven samen.', 'wat de anderen doen; je speelt weer in je eigen spel', 'tijd, weer en opdracht voor de anderen, en al je eigen voortgang.', 'Nee, blijf', null, 'Ja, verlaat het spel')}
    </div></div>`;
    return S['g1-spelers-opener']().replace(/<\/div>\s*$/, kaarten + '</div>');
  };

  // ---- toestanden
  S['t-toestanden'] = () => {
    const kaart = (titel, tekst, acties = '', mod = '') => `<section class="hudkaart hudkaart--kop" style="box-shadow:none;min-height:150px"><div class="kop"${mod ? ' style="background:var(--ds-c-rood)"' : ''}>${titel}</div><span style="font-size:17px">${tekst}</span>${acties ? `<div class="mp-actie">${acties}</div>` : ''}</section>`;
    return frame({
      actief: 'samen', koptekst: spelKop('Samen spelen'),
      inhoud: `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding-top:6px;align-content:start">
        <section class="mp-kol" style="gap:6px"><div class="mp-label">Lijst laden</div><div class="mp-skel" style="height:34px"></div><div class="mp-skel" style="height:34px"></div><div class="mp-skel" style="height:34px"></div><span class="mp-hulp">De lijst wordt opgehaald. Dit duurt hooguit 3 seconden.</span></section>
        ${kaart('Geen openbare sessies', 'Nu is er niemand die zijn spel deelt. Open zelf een spel, of vraag een vriend om zijn code.', knop('Open je spel') + link('Kamercode typen'))}
        ${kaart('De lijst komt niet binnen', 'Je internet of de openbare servers reageren niet. Een kamercode werkt vaak nog wel. Je eigen spel is niet geraakt.', knop('Opnieuw proberen') + link('Verbinding testen'), 'ds-z-kaart--probleem')}
        ${kaart('Je bent nog alleen', 'Er is nog niemand bij je. Deel je code, dan staat hij hier zodra hij binnen is.', knop('Kopieer de code', 'secundair'))}
        ${kaart('Andere versie', 'Terpentijn draait 0.65.2 en jij 0.66.0. Jullie kunnen niet samen spelen. De eigenaar moet bijwerken, of jij.', link('Wat nu?'), 'ds-z-kaart--probleem')}
        ${kaart('Je bent uit het spel gezet', 'Sem heeft je uit de sessie gezet. Je speelt weer je eigen spel; je voortgang is bewaard. Je kunt later opnieuw meedoen.', knop('Verder in mijn eigen spel'))}
        ${kaart('Offline', 'Geen internet. Alleen spelen werkt gewoon; Samen spelen kan niet tot je weer online bent.', knop('Terug naar Alleen spelen', 'secundair'))}
        ${kaart('De sessie is gestopt', 'Iedereen was akkoord: het spel is gestopt. Je speelt weer je eigen spel, precies waar je was.', knop('Doorgaan'))}
        ${kaart('Toestemming ingetrokken', 'Je trok je akkoord in. Samen spelen is uit tot je opnieuw akkoord geeft.', knop('Akkoord geven', 'secundair'))}
      </div>`,
      hint: [['Enter', 'doen'], ['Esc', 'terug']],
    });
  };

  // ---- bediening
  S['u-bediening'] = () => {
    const rij = (w, t, c, a) => `<tr><td class="l"><b style="font-size:19px">${w}</b></td><td class="l">${t}</td><td class="l">${c}</td><td class="l">${a}</td></tr>`;
    return frame({
      actief: 'spelers', tabs: tabsMet(5), koptekst: spelKop('Spelers', 'Spel · Zomeravond · 5 van 8 spelers'),
      inhoud: `<div class="mp-kol" style="gap:10px;margin-top:6px"><div class="mp-tabel"><table class="ds-z-tabel"><thead><tr><th class="l">Wat</th><th class="l">Toetsenbord</th><th class="l">Controller</th><th class="l">Aanraking</th></tr></thead><tbody>
        ${rij('Tabblad wisselen', toets('Q') + ' ' + toets('E'), 'LB en RB', 'tik op het tabblad')}${rij('Speler kiezen', toets('↑') + ' ' + toets('↓'), 'D-pad', 'tik op de rij')}${rij('Acties van een speler', toets('Enter'), 'A', 'tik')}${rij('Terug', toets('Esc'), 'B', 'terugknop')}
        ${rij('Ja of nee (Meedoen?, stemmen)', toets('J') + ' ' + toets('N'), 'A en B', 'tik op Ja of Nee')}${rij('Spelerslijst in het spel', toets('Tab') + ' vasthouden', 'R3', 'knop Spelers')}${rij('Roepen', toets('7') + toets('8') + toets('9'), 'radiaal: R1', 'radiaal')}${rij('Code kopiëren', toets('Enter') + ' op de code', 'A', 'tik op Kopieer')}</tbody></table></div>
        <div class="mp-grid2" style="gap:16px">${notitie('<b>Focus.</b> Eén ring (de DS-ring). In de spelerstabel loopt de focus per rij; rechts verschijnen de acties van die rij. Met Tab in het menu spring je tussen de tabel en het detail.', 'info')}${notitie('<b>Vragen met een tijd</b> (Meedoen?, stemmen, overdragen) nemen de focus pas als je een knop indrukt, zodat je niet per ongeluk antwoordt terwijl je loopt. Geen antwoord is nee.', 'let')}</div></div>`,
      hint: [['↑+↓', 'kiezen'], ['Q+E', 'tabblad'], ['Esc', 'terug']],
    });
  };
}
