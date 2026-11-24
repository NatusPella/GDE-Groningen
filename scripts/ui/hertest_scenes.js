// Scene definitions for the hertest round (docs/HERTEST-22-11.md): one entry per issue with the label `hertest` or `wacht-beeld`.
// Run by scripts/hertest_pack.mjs through scripts/ui_shots.mjs (desktop --perf-script body, ONE Electron per size, throwaway profile):
//   node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/hertest_scenes.js --out=<dir> --only=1177,1141
// Everything the page needs goes through console.log: '[capture] h<nr>-<name>' (a screenshot, <size>-h<nr>-<name>.png) and
// '[hertest] <json>' (the evidence of one scene: status, notes, metrics, shots). A scene that breaks never stops the rest.
// Kinds: 'image' (setup + screenshots, optionally metrics), 'metric' (numbers/text only), 'question' (no scene: only a human can
// judge it: sound, humour, feel, or play that needs a second window). Samen spelen: every scene runs locally in one game.
// Without Electron this file only defines data: the node test loads it with globalThis.__HERTEST_DEFS_ONLY = true.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const SCENES = {};
const SIZE_HD = '1920x1080';
const SIZE_SD = '1280x720';
// add(nr, { kind, title, check, expected, sizes?, captures?, metrics?, questions?, steps?, early?, run? })
const add = (nr, o) => { SCENES[String(nr)] = { nr, kind: 'question', sizes: [SIZE_HD], captures: [], metrics: [], questions: [], steps: [], early: false, ...o }; };
const image = (nr, title, check, expected, captures, run, extra = {}) => add(nr, { kind: 'image', title, check, expected, captures, run, ...extra });
const metric = (nr, title, check, expected, metrics, run, extra = {}) => add(nr, { kind: 'metric', title, check, expected, metrics, run, ...extra });
const question = (nr, title, check, expected, steps = [], extra = {}) => add(nr, { kind: 'question', title, check, expected, steps, ...extra });
// Known places (world metres, from scripts/qa/hertest_beeld.page.js); the city centre goes through worldframe P(100, 77).
const PTS = { visvlietBrug: [-20762, -5195], zuidhornStation: [-10616, -3026], warffumStation: [-188, -18992], noordStation: [-582, -1173], bourtange: [42473, 22807], marum: [-19954, 8661], usquert: [2776, -20413] };
// Pause-menu screens: one shot of a tab.
const menuRun = (tab, opts, wait) => async (H) => { await H.menu('a', tab, opts, wait); };

// --- A. Beginning of the game: start cards, opening, loading screen, quitting -----------------------------------------------
image(986, 'Nieuw spel: de openingscutscene speelt als eerste', 'Bij een nieuw spel begint de film (keuken, verhuisdag) voordat je zelf iets kunt doen.',
  'Binnen enkele seconden na het laden speelt een film; het spel is nog niet bestuurbaar.', ['a'], async (H) => {
    let actief = false;
    for (let i = 0; i < 40 && !actief; i++) { actief = H.cine.isCinematicActive(); if (!actief) await sleep(500); }
    H.meet('filmActief', actief);
    if (actief) { await sleep(3500); await H.shot('a', 200); } else H.note('geen film actief in de eerste 20 s');
  }, { early: true, metrics: ['filmActief'] });
image(1171, 'Opening: filmstaging volgens het openingsscript', 'Drie momenten uit de openingsfilm: staging, camera en ondertitels kloppen met het script.',
  'Beelden op 3,5 s, 9 s en 16 s tonen verschillende, rustig gerichte shots met leesbare ondertitel.', ['a', 'b', 'c'], async (H) => {
    let actief = false;
    for (let i = 0; i < 40 && !actief; i++) { actief = H.cine.isCinematicActive(); if (!actief) await sleep(500); }
    H.meet('filmActief', actief);
    if (!actief) { H.note('geen film actief'); return; }
    await sleep(3500); await H.shot('a', 100);
    await sleep(5500); await H.shot('b', 100);
    await sleep(7000); await H.shot('c', 100);
  }, { early: true, sizes: [SIZE_HD], metrics: ['filmActief'] });
image(1087, 'Startkeuze: Alleen of Samen spelen', 'De keuzekaart staat er bij de start; het is meteen duidelijk wat je kiest.',
  'Kaart met twee keuzes, korte ondertitels, geen tekstmuur, logo goed zichtbaar.', ['a'], async (H) => {
    const LC = await H.imp('launchchoiceui'); LC.openLaunchChoice({ index: 0 }); await H.shot('a', 1200); H.tap('Escape', 'Escape'); await sleep(600);
  });
image(1120, 'Start en HUD: naamkaart, keuzekaart en hints op 1280x720', 'Naamkaart zonder akkoord (voordat je Samen kiest), logo vrij, geen "Stap n van m", hints leesbaar.',
  'Beide kaarten passen in beeld, niets overlapt; de naamkaart vraagt geen online-akkoord.', ['a', 'b', 'c'], async (H) => {
    const LC = await H.imp('launchchoiceui'); const OC = await H.imp('onlineconsentui');
    LC.openLaunchChoice({ index: 0 }); await H.shot('a', 1200); H.tap('Escape', 'Escape'); await sleep(600);
    OC.openOnlineStart({ naam: '', terug: true }); await H.shot('b', 1200);
    const terug = document.querySelector('[data-terug]'); if (terug) terug.click(); else H.tap('Escape', 'Escape'); await sleep(600);
    await H.jump(...H.stad, 4000); await H.shot('c', 1500);
  }, { sizes: [SIZE_SD] });
image(1001, 'Samen spelen-schermen in het nieuwe ontwerp', 'De naamkaart voor Samen spelen gebruikt de gedeelde schermstijl (papier en inkt).',
  'Rustige kaart in zeefdrukstijl met duidelijke knoppen; geen oude stijl.', ['a'], async (H) => {
    const OC = await H.imp('onlineconsentui'); OC.openOnlineStart({ naam: '', terug: true }); await H.shot('a', 1200);
    const terug = document.querySelector('[data-terug]'); if (terug) terug.click(); else H.tap('Escape', 'Escape'); await sleep(600);
  }, { questions: ['De spelerslijst (Tab), Meedoen? J/N en de hostwissel vragen een tweede venster: bekijk ze bij de volgende Samen-test.'] });
image(1002, 'Laad- en bootscherm in het nieuwe ontwerp', 'Het laadscherm na een verre sprong: balk, voortgangsregel en verhaal tot nu toe in de nieuwe stijl.',
  'Laadscherm in papier en inkt met een vloeiende balk en een statusregel in woorden.', ['a'], async (H) => {
    await H.jump(...H.stad, 3000);
    H.p.x = H.stad[0] + 14000; H.p.y = H.stad[1] + 9000;
    for (let i = 0; i < 60 && !H.loading(); i++) await sleep(100);
    if (H.loading()) await H.shot('a', 900); else H.note('laadscherm niet gezien');
  });
image(1069, 'Laadscherm: geen Enter (Verder)-prompt, laadbalk niet in segmenten', 'Tijdens het laden staat er geen Verder- of Enter-knop en de balk loopt in een stuk.',
  'Geen woord "Verder" of "Enter" op het laadscherm; de balk is een doorlopende strook.', ['a'], async (H) => {
    await H.jump(...H.stad, 3000);
    H.p.x = H.stad[0] + 14000; H.p.y = H.stad[1] + 9000;
    for (let i = 0; i < 60 && !H.loading(); i++) await sleep(100);
    const l = H.loading();
    H.meet('laadschermGezien', !!l);
    H.meet('verderOfEnterTekst', l ? /verder|enter/i.test(l.textContent || '') : null);
    if (l) await H.shot('a', 900);
  }, { metrics: ['laadschermGezien', 'verderOfEnterTekst'] });
image(915, 'Bevestiging bij afsluiten met melding over opslaan', 'De vraag "Weet je het zeker?" met de melding dat je voortgang is opgeslagen.',
  'Een kaart met Ja en Nee en de zin over bewaren; Nee/Escape sluit de kaart zonder het spel af te sluiten.', ['a'], async (H) => {
    const Q = await H.imp('quitconfirmui'); Q.askQuitConfirm({ onYes: () => {}, onNo: () => {} });
    await H.shot('a', 900); H.meet('vraagOpen', Q.isQuitConfirmOpen()); H.tap('Escape', 'Escape'); await sleep(500); H.meet('vraagNaEscape', Q.isQuitConfirmOpen());
  }, { metrics: ['vraagOpen', 'vraagNaEscape'] });
image(1173, 'Benchmark: nieuwe keuze in beeld', 'De benchmarkkeuze (voorinstelling kiezen) in het nieuwe ontwerp.',
  'Keuzekaart in zeefdrukstijl, begrijpelijke opties.', ['a'], async (H) => {
    const BU = await H.imp('benchmarkui'); try { BU.showBenchmarkChoice({}); } catch (e) { H.note('keuzekaart: ' + e.message); }
    await H.shot('a', 1200); H.tap('Escape', 'Escape'); await sleep(500);
  }, { questions: ['De rapportkaart verschijnt pas na een echte meting: bekijk hem bij de perf-run.'] });
question(1015, 'Benchmark heel laag op een sterke pc', 'Draai de benchmark op de pc van de melder (zeer nieuwe AMD-kaart, Ultra).',
  'Het advies past bij wat de pc kan (niet Hoog met 24 fps op Ultra-hardware); de rapportkaart noemt de videokaart goed.',
  ['Start de benchmark vanuit Instellingen.', 'Lees het advies en de gemiddelde fps op de rapportkaart.'], { questions: ['Alleen te beoordelen op de echte pc van de melder (nog niet bekeken).'] });

// --- B. HUD, minimap and map -----------------------------------------------------------------------------------------------
image(995, 'HUD die verschijnt bij behoefte, minimap en wanted', 'Minimap en doelregel blijven; geld, gezondheid en wanted verschijnen bij verandering en gaan weg.',
  'Eerst een rustige HUD met alleen minimap en doel, daarna wanted in beeld bij gezocht niveau 3.', ['a', 'b'], async (H) => {
    await H.jump(...H.stad, 4000); H.w.wanted = 0; await H.shot('a', 1500);
    H.w.wanted = 3; await H.shot('b', 1500); H.w.wanted = 0;
  }, { sizes: [SIZE_SD, SIZE_HD] });
image(952, 'Cijfers bij politie op de minimap', 'Politie op de minimap heeft een ring met uitleg in plaats van losse cijfers.',
  'Bij gezocht niveau 3 staat er een duidelijke politie-aanduiding (ring/legenda) op de minimap.', ['a'], async (H) => {
    await H.jump(...H.stad, 4000); H.w.wanted = 3; await H.shot('a', 2500); H.w.wanted = 0;
  }, { sizes: [SIZE_SD] });
image(1079, 'HUD: locatiekaart naast de minimap', 'De straat- en plaatskaart staat onderin en gaat alleen omhoog als er iets onder wordt getoond.',
  'Zonder melding staat het blok onderin; met een wanted-melding schuift het omhoog zonder overlap.', ['a', 'b'], async (H) => {
    await H.jump(...H.stad, 4000); await H.shot('a', 2000);
    H.w.wanted = 2; await H.shot('b', 2000); H.w.wanted = 0;
  }, { sizes: [SIZE_SD] });
image(1075, 'Toetsplaatjes en tekst: maat en uitlijning', 'Toetsplaatjes staan als woord in de lopende tekst: zelfde hoogte, gelijke uitlijning.',
  'In hints en menu\'s zijn de toetsplaatjes even hoog als de tekst en staan op dezelfde regel.', ['a', 'b'], async (H) => {
    await H.menu('a', 'settings', { sub: 'a11y' }, 1500);
    await H.jump(...H.stad, 4000); await H.shot('b', 2000);
  }, { sizes: [SIZE_SD], questions: ['De openingshint met toetsen zie je alleen in de opening: kijk er bij een nieuw spel op.'] });
image(1141, 'Minimap en kaart draaien mee als je iets anders bestuurt', 'Als de duif wordt bestuurd draait het driehoekje en de kaart mee met de kijkrichting.',
  'Het driehoekje op de minimap wijst dezelfde kant als de duif kijkt; de kaart draait mee.', ['a', 'b'], async (H) => {
    const PIG = await H.imp('pigeonmode');
    await H.jump(...H.stad, 4000);
    try { PIG.startPigeonMode(H.w); } catch (e) { H.note('duif starten: ' + e.message); return; }
    await sleep(2500); await H.shot('a', 500);
    H.key('ArrowLeft', 'ArrowLeft', 'keydown'); await sleep(900); H.key('ArrowLeft', 'ArrowLeft', 'keyup'); await sleep(800);
    await H.shot('b', 500); try { PIG.stopPigeonMode(H.w); } catch (e) { /* weg */ }
  }, { sizes: [SIZE_SD] });
image(1053, 'Duivenmodus: HUD-kaarten, naamplaten en toetsuitleg', 'In de duivenmodus (M10) liggen HUD-onderdelen niet over elkaar.',
  'Geen overlap tussen doelkaart, afstand, naamplaten en toetsuitleg, ook niet op 1280x720.', ['a'], async (H) => {
    const PIG = await H.imp('pigeonmode');
    await H.jump(...H.stad, 4000);
    try { PIG.startPigeonMode(H.w); } catch (e) { H.note('duif starten: ' + e.message); return; }
    await sleep(3000); await H.shot('a', 500); try { PIG.stopPigeonMode(H.w); } catch (e) { /* weg */ }
  }, { sizes: [SIZE_SD, SIZE_HD] });
image(1009, 'Kaartlagen en basiskaart in de nieuwe kleuren', 'Land, water, wegen, gebouwen en de minikaart hebben het nieuwe palet.',
  'De kaart toont de nieuwe, zomerse kleuren; geen oude blauwe en grijze lagen.', ['a', 'b'], async (H) => {
    await H.jump(...H.stad, 4000); await H.shot('b', 1500); await H.menu('a', 'map', {}, 2500);
  });
image(1088, 'Kaart: eerste-keer-uitleg', 'Het scherm dat de eerste keer op de kaart opent is rustig en leesbaar.',
  'Een nette uitlegkaart zonder overlap; geen zootje.', ['a'], menuRun('map', {}, 3000), { sizes: [SIZE_SD, SIZE_HD] });
image(1148, 'Kaartpopups: Reis erheen, plekkaart, Zo werkt de kaart', 'Reis erheen toont alleen vervoer, met de toets in de knop; één navigatiepatroon.',
  'Op de kaart staan de popups netjes; (bij klikken op een plek) alleen trein/bus/taxi/boot met prijs en duur.', ['a'], menuRun('map', {}, 3000),
  { questions: ['Klik zelf op een plek op de kaart en kies Reis erheen: dit scherm kan de run niet aanklikken.'] });
image(1177, 'Kaart: te veel restaurants op zoom 6 in het centrum', 'Op de kaart in het centrum staan niet te veel restaurantmarkers door elkaar.',
  'Op het ingezoomde stadscentrum is horeca gedund per zoomniveau; de kaart is leesbaar.', ['a'], async (H) => {
    await H.jump(...H.stad, 4000); await H.menu('a', 'map', {}, 3500);
  }, { questions: ['Zoom op de kaart zelf in tot zoom 6 en kijk of de restaurants leesbaar blijven.'] });
image(990, 'Kaartontdekking: onthulling en teller', 'De kaart toont wat je ontdekt hebt, met een teller en een Te doen-rij.',
  'Alleen ontdekte streken zijn zichtbaar; de teller klopt met wat je gezien hebt.', ['a'], async (H) => {
    const MV = await H.imp('mapview');
    try { H.meet('ontdektRatio', MV.getDiscoveredRatio()); } catch (e) { H.note('ratio: ' + e.message); }
    await H.menu('a', 'map', {}, 3000);
  }, { metrics: ['ontdektRatio'] });
image(922, 'Live bussen: echte diensten op de kaart', 'Bussen op de kaart zijn echte diensten met lijn en label (Live of Rooster).',
  'Bussen staan met lijnnummer op de kaart; er zijn geen willekeurige bussen buiten de diensten.', ['a'], async (H) => {
    await H.jump(...H.stad, 4000);
    H.meet('busVoertuigen', H.w.vehicles.filter((v) => v.isBus).length);
    await H.menu('a', 'map', {}, 3000);
  }, { metrics: ['busVoertuigen'] });
image(1117, 'Voetbalvelden uit de kaart en lokale clubs', 'Op de kaart staan voetbalvelden en clubs uit de provincie.',
  'Voetbalvelden zijn als markers op de kaart te vinden.', ['a'], menuRun('map', {}, 3000), { questions: ['Zoek zelf een voetbalveld in een dorp op de kaart.'] });
image(1164, 'Interieurs pakket 8: kaartlaag Betreedbaar', 'De kaart heeft een laag Betreedbaar die toont welke panden je in kunt.',
  'Een kaartlaag (aan/uit) met betreedbare panden is aanwezig.', ['a'], menuRun('map', {}, 3000), { questions: ['De binnen-ambience (geluid) kan alleen een mens horen: loop een café of winkel in.'] });
image(1036, 'De gele routelijn in de wereld verdwijnt niet', 'Met een doel gezet blijft de gele routelijn in de wereld zichtbaar terwijl je loopt.',
  'Routelijn zichtbaar in beide beelden (voor en na een stuk lopen).', ['a', 'b'], async (H) => {
    await H.jump(...H.stad, 4000);
    try { window.__goal.set({ kind: 'waypoint', x: H.stad[0] + 400, y: H.stad[1] + 300, name: 'Hertest' }); H.meet('doelGezet', true); } catch (e) { H.meet('doelGezet', false); H.note('doel zetten: ' + e.message); }
    await H.shot('a', 2500); H.p.x += 30; await H.shot('b', 2500);
    try { window.__goal.clear(); } catch (e) { /* weg */ }
  }, { metrics: ['doelGezet'] });
image(1038, 'Luchtroute in het vliegtuig', 'In de lucht is de route een rechte lijn naar het doel, met doelnaam in de HUD.',
  'HUD in de lucht noemt het doel en de afstand.', ['a'], async (H) => {
    await H.jump(...H.stad, 4000); H.note('vliegen kan alleen een mens: zie de vraag'); await H.shot('a', 1500);
  }, { questions: ['Stap in een vliegtuig of heli met een doel gezet: is de lijn recht en klopt de doelnaam?'] });

// --- C. Pause-menu screens ----------------------------------------------------------------------------------------------------
image(846, 'Loopbanen: alle 19 een keer beginnen', 'Het loopbanenscherm toont elk vak met startplek, kaartjes, teller en een Te-doen-rij.',
  'Per loopbaan staat te zien wat je hierna kunt doen.', ['a'], menuRun('loopbaan', {}, 1800));
image(999, 'Winkels, missies, loopbanen en andere v2-schermen', 'Het pauzemenu en loopbanen staan in zeefdrukstijl; kassabon blijft als component.',
  'Geen oude kassabonstijl op de pagina; gestippelde regels op papier.', ['a', 'b'], async (H) => { await H.menu('a', 'spel', {}, 1500); await H.menu('b', 'loopbaan', {}, 1500); });
image(1013, 'Boerderij- en Spullen-schermen visueel verfijnd', 'Boerderij heeft een hero-blok en de Spullen-koppen zijn niet afgekapt.',
  'Geen afgekapte groepskoppen; kleine regels zijn leesbaar.', ['a', 'b'], async (H) => { await H.menu('a', 'boerderij', { sub: 'overzicht' }, 1800); await H.menu('b', 'spullen', {}, 1800); });
image(1147, 'Spullen: galerij van 3D-plaatjes', 'Spullen toont een raster van 3D-plaatjes met een compact detail.',
  'Raster van renders zoals bij de Garage; geen groot model rechts.', ['a'], menuRun('spullen', {}, 2500));
image(1102, 'Bezit 7: tak Bedrijven', 'Het Bezit-scherm toont panden, omzet en personeel.',
  'Overzicht van bedrijven en panden is te lezen; niets valt buiten beeld.', ['a', 'b'], async (H) => {
    await H.menu('a', 'boerderij', { sub: 'overzicht' }, 1800); await H.menu('b', 'boerderij', { sub: 'tekoop' }, 2500);
  });
image(1122, 'Verhaal WP-A: Aanwijzingen weg uit het pauzemenu, recapkaart', 'Het tabblad Verhaal heeft geen Aanwijzingen meer; de kaart Waar waren we? bestaat.',
  'Geen Aanwijzingen-tab; wel een recap bij het hervatten.', ['a'], menuRun('verhaal', {}, 1800), { questions: ['De recapkaart verschijnt na een pauze of een nieuwe sessie: laad een bestaand spel en kijk.'] });
image(1093, 'Microanimaties (DS3): prestatie als moment', 'Een prestatiemelding komt als moment binnen met een lichte animatie.',
  'De prestatietoast is leesbaar (naam, voortgang) en staat niet in de weg.', ['a'], async (H) => {
    const A = await H.imp('achievements'); const a = A.ACHIEVEMENTS.find((x) => x && x.id && !A.isUnlocked(x.id));
    if (!a) { H.note('geen prestatie om te ontgrendelen'); return; }
    await H.jump(...H.stad, 4000); A.unlockAchievement(H.w, a.id); await H.shot('a', 1800);
  }, { questions: ['Of de bewegingen goed voelen (te snel of te druk) kan alleen een mens beoordelen.'] });
image(996, 'Vier grote schermmomenten', 'Missie geslaagd, mislukt, opgepakt, nieuw gebied en wanted als groot moment in zeefdruk.',
  'Elk moment is schermvullend of een rand, in korte Nederlandse tekst, zonder getoond geweld.', ['geslaagd', 'mislukt', 'opgepakt', 'gebied', 'wanted'], async (H) => {
    const BM = await H.imp('bigmoment'); await H.jump(...H.stad, 3000);
    for (const soort of BM.SOORTEN) {
      try { BM.showBigMoment({ soort, titel: soort === 'geslaagd' ? 'Gelukt!' : undefined, beloning: soort === 'opgepakt' ? -120 : 250 }); } catch (e) { H.note(soort + ': ' + e.message); }
      await H.shot(soort, 1600); await sleep(2500);
    }
  });
image(1081, 'Eindkaart van missies met impact', 'De eindkaart slaat in beeld met gestaffelde onderdelen en geluid.',
  'Het gele vlak slaat in beeld; onderdelen komen na elkaar; de teller loopt op.', ['a', 'b'], async (H) => {
    const BM = await H.imp('bigmoment'); await H.jump(...H.stad, 3000);
    try { BM.showBigMoment({ soort: 'geslaagd', titel: 'Gelukt!', beloning: 350, tijd: '1:42' }); } catch (e) { H.note(e.message); }
    await H.shot('a', 500); await H.shot('b', 1500);
  }, { questions: ['Het geluid (impact) kan alleen een mens horen.'] });
image(1064, 'Alle UI via Designsysteem 3', 'Steekproef: pauzemenu, instellingen, keuzekaart en afsluitvraag in dezelfde zeefdrukstijl.',
  'Geen scherm in de oude stijl tussen deze vier.', ['a', 'b', 'c', 'd'], async (H) => {
    await H.menu('a', 'spel', {}, 1500); await H.menu('b', 'settings', { sub: 'sound' }, 1500);
    const LC = await H.imp('launchchoiceui'); LC.openLaunchChoice({ index: 0 }); await H.shot('c', 1200); H.tap('Escape', 'Escape'); await sleep(600);
    const Q = await H.imp('quitconfirmui'); Q.askQuitConfirm({}); await H.shot('d', 900); H.tap('Escape', 'Escape');
  });
image(981, 'Voetballen in de Euroborg', 'Het voetbalscherm onder Loopbanen met een carrière start.',
  'Selectie, kalender en stand zijn te lezen.', ['a'], async (H) => {
    const CL = await H.imp('voetbalcarrierelive'); try { CL.createNew(H.w, 'tammo', 0); } catch (e) { H.note('carrière: ' + e.message); }
    await H.menu('a', 'voetbal', {}, 4500);
  }, { questions: ['De wedstrijd zelf (commentaar, spelgevoel) kan alleen een mens beoordelen.'] });
image(1110, 'Voetbalcarrière 4/12: Voetbal-scherm en de start', 'Het Voetbal-scherm onder Loopbanen en de wedstrijdstart werken.',
  'Het scherm toont de carrière; een wedstrijd kan gestart worden.', ['a', 'b'], async (H) => {
    const CL = await H.imp('voetbalcarrierelive'); const VB = await H.imp('voetbal');
    try { CL.createNew(H.w, 'tammo', 0); } catch (e) { H.note('carrière: ' + e.message); }
    await H.menu('a', 'voetbal', {}, 4500);
    let ok = false; try { ok = !!VB.launchCareerMatch(H.w); } catch (e) { H.note('wedstrijd: ' + e.message); }
    H.meet('wedstrijdGestart', ok);
    if (ok) { await sleep(6000); await H.shot('b', 6000); for (let i = 0; i < 3; i++) { H.tap('Escape', 'Escape'); await sleep(1200); } }
  }, { metrics: ['wedstrijdGestart'] });

// --- D. Visible world bugs (position, camera, vehicle, props) -------------------------------------------------------------
image(919, 'Bruggen zijn niet transparant', 'De brug bij Visvliet heeft een dicht, zichtbaar dek.',
  'In alle drie de beelden is het brugdek dicht en zichtbaar; geen doorkijk naar het water.', ['schuin', 'dek', 'onder'], async (H) => {
    const [bx, by] = PTS.visvlietBrug; await H.jump(bx, by, 6000); const z = H.gh(bx, by);
    H.cam(bx + 40, by - 40, z + 30, bx, by, z, 60); await H.shot('schuin', 1800);
    H.cam(bx + 14, by, z + 5, bx - 4, by - 8, z + 1.5, 70); await H.shot('dek', 1800);
    H.cam(bx - 6, by - 12, z - 0.5, bx, by, z + 1, 80); await H.shot('onder', 1800); H.camOff();
  });
image(1063, "Beppe's huis eerder unlocken", "Het eerbetoon bij Visvliet staat er en is te bezoeken.",
  "Het huis en de berm zijn te zien; de plek is op de kaart te vinden.", ['a', 'b'], async (H) => {
    const [bx, by] = PTS.visvlietBrug; await H.jump(bx, by, 6000); await H.shot('a', 1800);
    H.cam(bx + 30, by + 30, H.gh(bx, by) + 15, bx, by, H.gh(bx, by), 60); await H.shot('b', 1800); H.camOff();
  });
image(917, 'Z-fighting op gebouwen', 'Gevels in de stad flakkeren niet; kijk vanaf een rijafstand en vanaf dichtbij.',
  'Gebouwvlakken zijn stabiel: geen wisselende of gestreepte patronen.', ['a', 'b'], async (H) => {
    await H.jump(...H.stad, 5000); const [x, y] = H.stad; const z = H.gh(x, y);
    H.cam(x + 30, y + 30, z + 12, x, y, z + 6, 60); await H.shot('a', 1800);
    H.cam(x + 8, y + 8, z + 4, x, y, z + 4, 70); await H.shot('b', 1800); H.camOff();
  });
image(1076, 'Nepinterieurs in de ramen: perspectief op afstand', 'De interieurs achter het glas houden hun perspectief in de eerste persoon: op 6, 40, 90 en 140 m, ook schuin langs de gevel (docs/NEPINTERIEUR-22-11.md).',
  'Ramen tonen een kamer met diepte en een kijkhoek die meebeweegt; voorbij ca. 100 m gaat het raam gelijkmatig over in een vlakke kamertoon, zonder flikkering of spiegeling.', ['a', 'b', 'c', 'd'], async (H) => {
    const FP = await H.imp('firstperson').catch(() => null);
    await H.jump(...H.stad, 5000); if (FP) { try { FP.setFirstPerson(H.w, true); } catch (e) { H.note('eerste persoon: ' + e.message); } }
    const [x, y] = H.stad; const z = H.gh(x, y);
    // ooghoogte 1,7 m, FOV 70, schuin langs de straat naar de gevels (grazende hoek op de lange afstanden)
    for (const [tag, d] of [['a', 6], ['b', 40], ['c', 90], ['d', 140]]) { H.cam(x + d, y + d * 0.45, z + 1.7, x, y, z + 4, 70); await H.shot(tag, 1800); }
    H.camOff(); if (FP) { try { FP.setFirstPerson(H.w, false); } catch (e) { /* weg */ } }
  }, { questions: ['Dichtbij (a): schuift de kamer achter het glas mee als je zijwaarts loopt, zonder spiegeling of wegglijden?', 'Op 90 en 140 m (c, d): geen flikkering en geen harde rand; ramen worden een vlakke, warme of koele toon.', 'Kijk ook schuin naar een gevel die niet langs de straatrichting staat: dezelfde kamerdiepte als bij een gevel recht voor je?'] });
image(943, 'First person: handen en wapens bij vechten', 'In de eerste persoon zie je je handen en het gekozen wapen.',
  'Handen zichtbaar onderin beeld; bij een wapen is het wapen te zien.', ['a'], async (H) => {
    const FP = await H.imp('firstperson').catch(() => null);
    await H.jump(...H.stad, 4000); if (FP) { try { FP.setFirstPerson(H.w, true); } catch (e) { H.note('eerste persoon: ' + e.message); } }
    await H.shot('a', 2000); if (FP) { try { FP.setFirstPerson(H.w, false); } catch (e) { /* weg */ } }
  }, { questions: ['Sla zelf een keer in de eerste persoon: bewegen de handen mee?'] });
image(1029, 'Derde persoon in de trekker: zicht op bestuurder en weg', 'De camera staat ver genoeg weg om bestuurder en weg te zien.',
  'Bestuurder en weg zijn zichtbaar; de cabine vult niet het hele scherm.', ['a'], async (H) => {
    const VH = await H.imp('vehicle'); await H.jump(...H.stad, 4000);
    const v = new VH.Vehicle(H.p.x + 4, H.p.y, 0, { ...VH.TRACTOR_MODEL }); v.speed = 0; H.w.vehicles.push(v);
    try { H.p.enterVehicle(v, H.w); H.meet('inTrekker', !!H.p.inVehicle); } catch (e) { H.meet('inTrekker', false); H.note('instappen: ' + e.message); }
    await H.shot('a', 2500); try { H.p.exitVehicle(H.map, H.w); } catch (e) { /* weg */ }
    const k = H.w.vehicles.indexOf(v); if (k >= 0) H.w.vehicles.splice(k, 1);
  }, { metrics: ['inTrekker'] });
image(1007, 'Textuur error: weg rond de auto blijft dezelfde textuur', 'Met een rijdende auto verdwijnen weg en fietspad niet rond de auto.',
  'Weg en fietspad blijven zichtbaar rondom de auto, ook na een sprong.', ['a', 'b'], async (H) => {
    const VH = await H.imp('vehicle'); await H.jump(...H.stad, 4000);
    const pt = H.map.nearestRoadPoint(H.p.x, H.p.y, 60, true, true);
    const v = VH.spawnVehicleOnRoad(H.map, pt.road, false, Math.random, false, false, pt, false, null); v.playerOwned = true; H.w.vehicles.push(v);
    H.p.x = v.x; H.p.y = v.y - 3; try { H.p.enterVehicle(v, H.w); } catch (e) { H.note('instappen: ' + e.message); }
    await H.shot('a', 2500); await H.jump(PTS.visvlietBrug[0], PTS.visvlietBrug[1], 5000); await H.shot('b', 2000);
  }, { questions: ['Het ging mis na een sprong naar Visvliet: rijd zelf een stuk en kijk of de weg blijft staan.'] });
image(1057, 'Usquert: zwarte zuilen met brede schaduw', 'Op de plek in Usquert staan geen enorme zwarte zuilen meer.',
  'Geen zwarte zuilen of brede donkere schaduw bovenin beeld.', ['a', 'b'], async (H) => {
    const [bx, by] = PTS.usquert; await H.jump(bx, by, 6000); const z = H.gh(bx, by);
    await H.shot('a', 1800); H.cam(bx - 20, by - 20, z + 40, bx, by, z + 20, 70); await H.shot('b', 1800); H.camOff();
  }, { sizes: [SIZE_SD, SIZE_HD] });
image(953, 'Vesting Bourtange: opgeruimd, beloopbaar en als monument', 'Je valt niet in het water in de vesting, de geometrie is netjes en het dorp voelt als een monument (klinkers, baksteen, geen verkeer, geen moderne lantaarns of borden; docs/BOURTANGE-MONUMENT-22-11.md).',
  'Beelden tonen een nette vesting met klinkerstraten, rode baksteen en pannendaken, wallen met gras, kanonnen en linden; geen auto, bushokje of lantaarnpaal; het aantal natte cellen op het plein is nul of laag.', ['a', 'b', 'poort', 'kerk', 'wal', 'gracht', 'plein', 'avond'], async (H) => {
    const [bx, by] = PTS.bourtange; await H.jump(bx, by, 7000); let nat = 0; let n = 0;
    for (let dx = -30; dx <= 30; dx += 3) for (let dy = -30; dy <= 30; dy += 3) { n++; if (H.wet(bx + dx, by + dy)) nat++; }
    H.meet('natteCellen', nat); H.meet('gemetenCellen', n);
    await H.shot('a', 1800); H.cam(bx + 40, by + 40, H.gh(bx, by) + 35, bx, by, H.gh(bx, by), 60); await H.shot('b', 1800); H.camOff();
    // de plekken voor de hertest: de Munsterse Poort, de kerk, een wal bij een bolwerk, de gracht, het Marktplein en 's avonds
    const kijk = async (naam, [px, py], [lx, ly], hoogte = 6, fov = 65) => {
      await H.jump(px, py, 3500);
      const z = H.gh(px, py);
      H.cam(px, py, z + hoogte, lx, ly, z + 2, fov); await H.shot(naam, 1800); H.camOff();
    };
    await kijk('poort', [42492, 22912], [42492, 22881]);
    await kijk('kerk', [42440, 22745], [42417, 22773]);
    await kijk('wal', [42560, 22660], [42583, 22679], 9);
    await kijk('gracht', [42468, 22610], [42468, 22640], 4, 70);
    await kijk('plein', [42470, 22790], [42470, 22810], 5);
    // 's avonds: de lantaarns branden warm (de klok gaat naar 22 uur; werkt dat niet, dan staat dat in de notitie)
    try { if (H.w.dayNight) H.w.dayNight.hour = 22; H.w.clock = 22; } catch (e) { H.note('klok zetten mislukte: ' + e.message); }
    await kijk('avond', [42470, 22790], [42470, 22810], 4);
    const auto = (H.w.vehicles || []).filter((v) => v.driver !== 'player' && !v.isBike && Math.hypot(v.x - bx, v.y - by) < 235).length;
    H.meet('autosInGebied', auto);
    H.meet('walHoogte', Math.round((H.gh(42583, 22679) - H.gh(42470, 22800)) * 10) / 10);
    H.note('monumentgebied: ' + (H.w.map && H.w.map.meta && H.w.map.meta.monumenten ? H.w.map.meta.monumenten.length + ' op de kaart' : 'geen kaartpunt'));
  }, { metrics: ['natteCellen', 'gemetenCellen', 'autosInGebied', 'walHoogte'], questions: ['Loop door Bourtange: voelt het als een monument (klinkers, rode baksteen, wallen, kanonnen, geen auto of bord)?', 'Staat de wal bij een bolwerk echt hoger dan het plein, en kun je er zonder te vallen overheen lopen?'] });
image(1092, 'Procedurele randen om landbouwpercelen weg', 'Rond velden en weilanden staan geen verzonnen heggen, hekken en bermen.',
  'Randen komen alleen uit kaartlijnen; geen nepbermen die op sloten lijken.', ['a', 'b'], async (H) => {
    const [bx, by] = PTS.marum; await H.jump(bx, by, 6000); const z = H.gh(bx, by);
    H.cam(bx, by, z + 120, bx + 1, by + 1, z, 60); await H.shot('a', 2000);
    H.cam(bx + 30, by, z + 6, bx, by + 40, z + 1, 65); await H.shot('b', 2000); H.camOff();
  });
image(1077, 'Gebiedsmelding noemt geen stadswijk buiten de stad', 'Buiten de stad noemt de HUD en de kaart geen stadswijk als Paddepoel-Noord.',
  'De locatieregel noemt een dorp of streek, geen stadswijk.', ['a'], async (H) => {
    const [bx, by] = PTS.marum; await H.jump(bx, by, 6000);
    await H.shot('a', 2500); H.meet('wijkTekst', H.zichtbaar(/Paddepoel|Hoogkerk|Helpman|Vinkhuizen|Oosterpark/i).join(' | ') || 'geen');
  }, { metrics: ['wijkTekst'] });
image(1080, 'Heli-pad boven de gebouwen', 'De luchtroute en de ringen van de heli liggen boven de gebouwen.',
  'Geen ring of lijn die door een gebouw loopt.', ['a'], async (H) => {
    await H.jump(...H.stad, 4000); await H.shot('a', 1500);
  }, { questions: ['Vlieg een heli-missie in de stad: blijft de lijn boven de daken?'] });
image(1085, 'Live treinen: dienstregeling en vertragingen op de vertrekborden', 'Op een station tonen de vertrekborden echte tijden met verzonnen lijnnamen.',
  'Een vertrekbord met tijden en eventueel vertraging is leesbaar.', ['a'], async (H) => {
    const [bx, by] = PTS.noordStation; await H.jump(bx, by, 6000); await H.shot('a', 2000);
  }, { questions: ['Of vertragingen live kloppen vraagt een echt netwerk: kijk op een station of er minuten bij staan.'] });
image(926, 'Treinreis toont een trein en omgeving', 'De treinreis is een echte scène met rails en omgeving, geen balk met skip.',
  'Het station staat er; de reis zelf (kies trein bij Reis erheen) moet een mens starten.', ['a'], async (H) => {
    const [bx, by] = PTS.zuidhornStation; await H.jump(bx, by, 6000); await H.shot('a', 2000);
  }, { questions: ['Zet een waypoint op een ander station en reis met de trein: zie je trein en omgeving?'] });
image(1083, 'Boten alleen op logische plekken', 'Boten staan aan een kade, steiger of haven, niet op een willekeurig slootje.',
  'Elke boot in het gemeten gebied staat bij een kade of haven.', ['a'], async (H) => {
    await H.jump(...H.stad, 4000);
    const boten = H.w.vehicles.filter((v) => v.isBoat); H.meet('aantalBoten', boten.length);
    H.meet('botenPlekken', boten.slice(0, 12).map((v) => [Math.round(v.x), Math.round(v.y)]));
    await H.menu('a', 'map', {}, 3000);
  }, { metrics: ['aantalBoten', 'botenPlekken'] });
image(1030, 'Parkkit in de streek: geen bomen en heggen op het wegdek', 'In de streek staan geen bomen en heggen op de weg.',
  'Wegdek is vrij van bomen en heggen.', ['a', 'b'], async (H) => {
    const [bx, by] = PTS.marum; await H.jump(bx, by, 6000); await H.shot('a', 1800);
    H.cam(bx + 40, by + 40, H.gh(bx, by) + 25, bx, by, H.gh(bx, by), 60); await H.shot('b', 1800); H.camOff();
  }, { questions: ['De plek heet in het issue "de Streek": loop een landplek en kijk naar de weg.'] });
image(1152, 'Kleding: voetgangers en winkeliers op rolpools', 'Voetgangers en winkeliers dragen kleding die bij hun rol past.',
  'Winkeliers, wachters en voetgangers zien er passend uit; niet allemaal hetzelfde.', ['a'], async (H) => {
    await H.jump(...H.stad, 5000); await H.shot('a', 2500);
  });
image(1156, 'Kleding: de kapper als pakket', 'Het pashokje en de kapper tonen haar in de outfit.',
  'Pashokje werkt met 3D-voorvertoning; haar is te kiezen.', ['a'], async (H) => {
    const SH = await H.imp('shops'); await H.jump(...H.stad, 8000);
    try { SH.openFittingRoom(H.w, 'hertest', H.p.x, H.p.y); } catch (e) { H.note('pashokje: ' + e.message); }
    await H.shot('a', 2500); await H.sluit();
  }, { questions: ['De reactie en de prestatie bij de kapper vragen een echte kappersbeurt.'] });

// --- E. Measurements ------------------------------------------------------------------------------------------------------
metric(1019, 'Taxi als reisoptie verschijnt altijd', 'Bij elke afstand staat de taxi in de reisopties (mogelijk uitgeschakeld met reden).',
  'Alle drie de afstanden hebben een taxi-optie.', ['optiesKort', 'optiesMidden', 'optiesVer'], async (H) => {
    const RK = await H.imp('reiskaart'); await H.jump(...H.stad, 4000);
    const naam = (o) => String(o.id || o.type || o.naam || o.label || '?');
    for (const [k, d] of [['optiesKort', 40], ['optiesMidden', 900], ['optiesVer', 9000]]) {
      try { H.meet(k, RK.reisOptiesVoor(H.w, { x: H.p.x + d, y: H.p.y }).map(naam)); } catch (e) { H.meet(k, 'fout: ' + e.message); }
    }
  });
metric(1040, 'Geheugen: JS-heappiek', 'Na het laden van de stad en een verre sprong blijft de heap onder de grens.',
  'Heap na de stad en na een sprong (MB) is gemeten; vergelijk met de 3,1 GB uit de melding.', ['heapStadMB', 'heapNaSprongMB'], async (H) => {
    const mb = () => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
    await H.jump(...H.stad, 8000); H.meet('heapStadMB', mb());
    await H.jump(PTS.marum[0], PTS.marum[1], 8000); H.meet('heapNaSprongMB', mb());
  }, { questions: ['Een echte piek zie je pas na een lange sessie: dit is een eerste puntmeting.'] });
metric(1052, 'Opwarmfase: stad wordt vastgepind en streamt niet in de eerste minuut', 'Frametijden in de eerste seconden in de stad.',
  'Gemiddelde frametijd (ms) in de eerste 20 s is gemeten; hoog = regressie.', ['frameMs'], async (H) => {
    await H.jump(...H.stad, 1000); const t0 = performance.now(); let n = 0;
    await new Promise((res) => { const f = () => { n++; if (performance.now() - t0 < 20000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    H.meet('frameMs', Math.round(((performance.now() - t0) / n) * 10) / 10);
  }, { questions: ['De echte fps-meting hoort bij de exclusieve perf-run (docs/PERF-MEETPUNTEN-21-11.md).'] });
metric(1008, 'Lag en haperingen bij laden in de stad', 'Frametijden direct na een sprong in de stad.',
  'Langste frame (ms) in 15 s na een sprong is gemeten.', ['langsteFrameMs'], async (H) => {
    await H.jump(PTS.marum[0], PTS.marum[1], 3000); H.p.x = H.stad[0]; H.p.y = H.stad[1];
    let max = 0; let last = performance.now(); const t0 = last;
    await new Promise((res) => { const f = () => { const nu = performance.now(); max = Math.max(max, nu - last); last = nu; if (nu - t0 < 15000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    H.meet('langsteFrameMs', Math.round(max));
  }, { questions: ['Het gevoel van haperen blijft een mensenoordeel.'] });

// --- F. Questions only a human can judge (sound, humour, feel, story, or play that needs another window) --------------------
question(882, 'Taxi: tijdens de rit is een taxi te zien', 'Neem een taxi (Reis erheen > Taxi).', 'Je ziet een echte rit in de cabine of de taxi in beeld; geen kale balk.', ['Zet een waypoint ver weg.', 'Kies Taxi.']);
question(1185, 'Spawn binnen in de woning (Paddepoel-flat)', 'Sla op na het slapen in de flat, sluit en kies Doorgaan; kies daarna in het pauzemenu Naar huis vanaf een straat in de stad.', 'Na Doorgaan en na Naar huis sta je in de woonkamer van de flat, kijkend naar het raam, niet in een meubel; de lift en de voordeur brengen je naar beneden; een save die buiten stond blijft buiten; met Start binnen (thuis) uit sta je voor de deur.', ['Slaap in het bed en sla op; sluit het spel; Doorgaan.', 'Zet Start binnen (thuis) uit (Instellingen > Spel) en laad opnieuw: voor de deur.', 'Sla buiten bij het huis op en laad: je blijft buiten.', 'Pauzemenu > Naar huis vanaf een straat ver weg.', 'Samen spelen met twee vensters: host boven in de flat, de gast sluit aan en staat buiten naast de toren.']);
question(958, 'Uit het water klimmen gaat niet door de kade', 'Zwem naar een kade en klim eruit.', 'Je klimt alleen op een geldige plek, nooit door de kade.', ['Spring in een gracht in de stad.', 'Zwem naar de kade en klim eruit (E).']);
question(962, 'Minder storytelling via quicktime-events', 'Speel een missie met een timingbalk.', 'Korte, makkelijke momenten; bij de tweede misser een hint om over te slaan.', ['Mis een timingbalk twee keer.']);
question(963, 'In een cirkel wachten: animatie en props', 'Wacht in een missiecirkel.', 'Een passende animatie en prop (wachtfiguur) maken het wachten niet leeg.', ['Start een missie met een wachtstap.']);
question(983, 'Samen spelen: gast uit de openbare lijst kan opnieuw verbinden', 'Twee vensters nodig: val als gast weg en verbind opnieuw.', 'De gast komt terug in dezelfde sessie.', ['Host maakt de sessie openbaar.', 'Gast sluit aan via de lijst en verbreekt de verbinding.', 'Gast kiest Opnieuw verbinden.']);
question(987, 'Opening en eerste missies: zinnen helder', 'Speel de opening en M01 tot M03.', 'De zinnen zijn te volgen zonder het verhaal te kennen; geen stortvloed aan namen.', ['Start een nieuw spel.']);
question(989, 'Uitleg met iconen en animaties', 'Bekijk de uitleg bij de eerste missies.', 'Uitleg gaat met iconen en meters, niet met muren van tekst.', ['Start een nieuw spel en speel M01.']);
question(1000, 'Minigames in het nieuwe ontwerp', 'Speel een minigame (kartbaan of klimtoren).', 'Bord, score en resultaat in zeefdruk; tussenstand als tabel.', ['Start een minigame en rond hem af.']);
question(1003, 'Website, logo\'s en iconen in het nieuwe ontwerp', 'Open de website uit de repo (website/) in de browser.', 'De website staat in zeefdruk met het nieuwe logo.', ['Open website/index.html.']);
question(1004, 'Eigen identiteit per context: golf en farming', 'Open de golf- en de boerderijmenu\'s.', 'Golf heeft maaistrepen in de kopband, farming voren.', ['Open Golf en Boerderij.']);
question(1016, 'Pop-in bij lopen, rijden en vliegen', 'Rijd snel door de stad en vlieg over het land.', 'Weinig of geen plotseling verschijnende gebouwen, bomen en voertuigen.', ['Rijd vijf minuten, let op de horizon.'], { questions: ['Alleen een mens met een echte pc kan dit oordelen.'] });
question(1018, 'Fiets uit de stalling en omver geduwde fiets', 'Pak een fiets uit een stalling; duw er een om.', 'Je kunt altijd een fiets pakken; een omgeduwde fiets is kapot of langzamer.', ['Loop naar een fietsenstalling (E).', 'Duw een fiets met de auto om.']);
question(1020, 'De taxi rijdt niet door een gebouw', 'Neem drie taxiritten in de stad.', 'De taxi blijft op de weg.', ['Kies Taxi bij Reis erheen, drie keer.']);
question(1021, 'Audio-glitches en ruisgeluid', 'Luister tien minuten naar het spel.', 'Geen knetters of ruis.', ['Speel in de stad en op het land.']);
question(1084, 'Soms witte ruis in het spel', 'Luister naar stiltemomenten.', 'Geen witte ruis.', ['Speel tien minuten, let op geluid bij wisselende plekken.']);
question(1023, 'Op een rijdende auto met NPC-bestuurder word je meegevoerd', 'Spring op een rijdende auto.', 'Je rijdt mee.', ['Zoek een rijdende auto en sta erop.']);
question(1027, 'Fatbikes ontwijken: de route loopt langs de baan', 'Volg de routelijn van M08.', 'De routelijn volgt de baan van de fatbikes.', ['Start M08 en volg de lijn.']);
question(1039, 'Render/GPU-prestaties', 'Meet in de perf-run (Hoog en Ultra).', 'Minder drawcalls en frametijd dan voorheen.', ['Draai de perf-run van de coördinator.']);
question(1044, 'Props en gebouwen op verkeerde plekken', 'Loop langs eerder gemelde plekken.', 'Geen bomen op de weg, geen kraan in een weiland.', ['Loop een rondje door de streek.']);
question(1046, 'Spel starten: geen stilstand in de opening', 'Start een nieuw spel en kijk naar haperingen.', 'Geen stilstand van 10 tot 57 seconden.', ['Start een nieuw spel op de perf-pc.']);
question(1047, 'AI-auto\'s rijden niet langs gevels en naar de sloot', 'Kijk naar het verkeer in smalle straten.', 'Auto\'s blijven op de weg.', ['Sta tien minuten in een smalle straat.']);
question(1061, 'Samen spelen in echte vensters', 'De testbank met vier vensters (Fatbikes, penaltyserie, duivenspot, plaatsborden, filmpje-hostwissel).', 'De stappen slagen in echte vensters.', ['Draai scripts/coop/testbank.mjs met de suites uit het issue.']);
question(1070, 'Muziek op 128 kbps', 'Luister naar de muziek.', 'De kwaliteit is niet slechter hoorbaar.', ['Speel de radio en de dagmuziek.']);
question(1073, 'Mislukte lading laat de wereld niet half geladen', 'Laad een beschadigd opslagbestand.', 'Het spel zet de oude stand terug en bewaart niet over de vorige slot heen.', ['Maak een kapotte save in een wegwerpprofiel en laad hem.']);
question(1126, 'Verhaal WP3: akte 2', 'Speel akte 2 (M07, M08, Mem, Tessa en de boerderij).', 'Oma\'s recept in drie beurten, Mem als stem.', ['Speel M07 en M08.']);
question(1127, 'Verhaal WP4: akte 3', 'Speel akte 3 (Jelle in persoon).', 'Jelle legt zijn plan zelf uit.', ['Speel M14 en M15.']);
question(1128, 'Verhaal WP5: akte 4', 'Speel akte 4.', 'Het doel (de bal terughalen) is duidelijk; Jelle is vaker aanwezig.', ['Speel M16 tot M21.']);
question(1129, 'Verhaal WP6: akte 5 en de epiloog', 'Speel akte 5 en de epiloog.', 'Korte finale; de wagen groeit mee als succes.', ['Speel akte 5.']);
question(1130, 'Verhaal WP7: Deel 4 en de wagen', 'Speel M30.', 'M30 nodigt uit voor de open wereld.', ['Speel M30.']);
question(1138, 'Verhaal WP15: regie in de sleutelscenes', 'Kijk naar de keuken, het Loket, de lege vitrine en de sloot.', 'Meer camera en emotie; routinescenes blijven licht.', ['Speel de sleutelscenes.']);
question(1146, 'Cutscenes: linter-vondsten', 'Kijk een paar cutscenes.', 'Camera en dialoog zijn netjes.', ['Speel enkele cutscenes.']);
question(1153, 'Kleding: outfit-wissel naar medespelers', 'Twee vensters nodig: wissel van outfit.', 'De medespeler ziet je nieuwe outfit.', ['Host en gast spelen samen.', 'De gast wisselt van outfit.']);
question(1154, 'Kleding: snelwisseltoets en pashokje in de auto', 'Wissel van outfit met de snelwisseltoets.', 'Outfit wisselt snel; het pashokje werkt ook in de auto.', ['Zet twee outfits klaar.', 'Gebruik de toets.']);
question(1160, 'Samen spelen: berovingen alleen bij wie het spel opende', 'Twee vensters nodig: laat een gast beroven.', 'Beroving gebeurt lokaal per speler.', ['Host en gast spelen samen.', 'Laat de gast beroven.']);

globalThis.__HERTEST_SCENES = SCENES;

const draai = async () => {
  const imp = (f) => import('/js/' + f + '.js');
  const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
  const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
  const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
  const size = innerWidth + 'x' + innerHeight;
  const wantsScene = (s) => s.kind !== 'question' && (!ONLY.length || ONLY.includes(String(s.nr))) && (s.sizes.includes(size) || !/^(1280x720|1920x1080)$/.test(size));
  const loading = () => document.querySelector('.ls.on:not(.out)');
  const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
  const todo = Object.values(SCENES).filter(wantsScene);
  const cine = await imp('cinematics');
  const report = [];
  const runScene = async (s, H) => {
    const ev = { nr: s.nr, size, status: 'ok', notes: [], metrics: {}, shots: [] };
    H.ev = ev; console.error('[hertest] scene ' + s.nr);
    try { await s.run(H); } catch (e) { ev.status = 'error'; ev.notes.push('FOUT: ' + (e && e.message)); }
    await H.close(); report.push(ev);
    console.log('[hertest] ' + JSON.stringify(ev));
  };
  // 1. early scenes (the opening film): the game is already starting; no skipping yet
  const early = todo.filter((s) => s.early);
  const mk = (extra) => ({ imp, key, tap, sleep, cine, loading, size, ...extra });
  if (early.length) {
    for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    const base = mk({ shot: async (name, wait = 1200) => { await sleep(wait); console.log('[capture] h' + early[0].nr + '-' + name); await sleep(700); }, meet: () => {}, note: () => {}, close: async () => {} });
    for (const s of early) {
      const ev = { nr: s.nr, size, status: 'ok', notes: [], metrics: {}, shots: [] };
      const H = { ...base, shot: async (name, wait = 1200) => { await sleep(wait); console.log('[capture] h' + s.nr + '-' + name); ev.shots.push(name); await sleep(700); }, meet: (k, v) => { ev.metrics[k] = v; }, note: (t) => ev.notes.push(String(t)) };
      try { await s.run(H); } catch (e) { ev.status = 'error'; ev.notes.push('FOUT: ' + (e && e.message)); }
      report.push(ev); console.log('[hertest] ' + JSON.stringify(ev));
      // a fresh game has one film: later early scenes of the same run see no film (noted by the scene itself)
    }
  }
  for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
  // het eigen camerabeeld (H.cam, id ht-view) niet wegklikken: anders vielen alle cameraschoten terug op de volgcamera (hertest 24-11: 919 en 1057)
  const skipper = setInterval(() => { if (cine.isCinematicActive() && !cine.isCinematicActive('ht-view')) cine.skipCinematic(); }, 100);
  for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
  for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
  await sleep(3000);
  const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
  w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
  const beat = setInterval(() => console.error('[hertest] beat ' + Math.round(performance.now() / 1000)), 5000);
  const PM = await imp('pausemenu'); const SHUI = await imp('shopui');
  const { P } = await imp('worldframe'); const { isInWater } = await imp('util'); const DN = await imp('daynight');
  const stad = P(100, 77);
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const fix = (hour = 14) => { w.clock = hour; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
  let curPose = null;
  const camOff = () => { curPose = null; if (cine.isCinematicActive()) cine.skipCinematic(); w.cameraOverride = null; };
  const H = mk({
    D, w, p, map, stad, gh, PM, ev: null,
    shot: async (name, wait = 1200) => {
      await sleep(wait);
      // een ander filmpje (plaatskaart, ontdekking) kan het eigen camerabeeld hebben vervangen: opnieuw zetten (wereldbugs 24-11)
      if (curPose && !cine.isCinematicActive('ht-view')) { const q = curPose; curPose = null; H.cam(q.position.x, q.position.y, q.position.z, q.lookAt.x, q.lookAt.y, q.lookAt.z, q.fov); await sleep(900); }
      fix(); console.log('[capture] h' + H.ev.nr + '-' + name); H.ev.shots.push(name); await sleep(700); },
    meet: (k, v) => { H.ev.metrics[k] = v; }, note: (t) => H.ev.notes.push(String(t)),
    wet: (x, y) => !!isInWater(map, x, y),
    zichtbaar: (re) => [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && e.offsetParent !== null && re.test(e.textContent || '')).slice(0, 5).map((e) => e.textContent.trim().slice(0, 80)),
    jump: async (x, y, settle = 5000) => {
      camOff(); if (p.inVehicle) p.exitVehicle(map, w);
      p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
      for (let i = 0; i < 40 && !loading(); i++) await sleep(100);
      for (let i = 0; i < 400 && loading(); i++) await sleep(100);
      await sleep(settle); p.x = x; p.y = y; p.gz = gh(x, y); fix();
    },
    cam: (x, y, z, lx, ly, lz, fov = 60) => {
      curPose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
      if (!cine.isCinematicActive()) cine.playCinematic({ id: 'ht-view', duration: 3000, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => curPose });
    },
    camOff,
    sluit: async () => { for (let i = 0; i < 3; i++) { tap('Escape', 'Escape'); await sleep(300); } try { PM.closePauseMenu(); } catch (e) { /* weg */ } try { SHUI.closeShopMenu({ save: false }); } catch (e) { /* weg */ } await sleep(400); },
    menu: async (name, tab, opts, wait = 1800) => { PM.openPauseMenu(tab, opts || {}); await H.shot(name, wait); await H.sluit(); },
    close: async () => { camOff(); w.wanted = 0; await H.sluit(); },
  });
  H.key = key;
  for (const s of todo.filter((x) => !x.early)) await runScene(s, H);
  clearInterval(skipper); clearInterval(beat);
  console.log('[hertest-klaar] ' + JSON.stringify(report.map((r) => r.nr + ':' + r.status)));
};
if (!globalThis.__HERTEST_DEFS_ONLY) await draai();
