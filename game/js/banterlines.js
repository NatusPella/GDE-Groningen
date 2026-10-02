// Tammo and Anita's car banter as data (banter.js plays it). Pure data: no
// imports, so scripts/tts_banter_lines.mjs can read it in Node.
// The beats follow docs/verhaal/D-definitief.md: one summer in August, the
// Escapade is Tammo's, the Fjord Frituur is Anita's dream, and Tammo never
// says it out loud before H18.
//
// Exchange fields
//   id       unique and stable: the heard-list and the voice file names use it
//   trigger  when it may play, see TRIGGERS
//   needs    story step id(s) from storyarc.js STEPS that must be done ('H6', 'k-fiets', ...)
//   until    story step id(s) that must NOT be done yet (lines that go stale)
//   arc      (after:*) only when the mission was played in story order: every story
//            mission before it is done, like the full dialogue in missionstory.js
//   lines    [speaker, text, tag]: speaker 'T' (Tammo) or 'A' (Anita); tag is the
//            emotion the recording is made with (English, a few words)
//
// TRIGGERS, by priority
//   1 after:<H-code>:pass|fail   first shared ride after a mission (story code from storyarc.js,
//                                also for missions played outside the story), within 5 minutes
//     after:job:<id>:pass|fail   same for a bijbaantje shift (sidejobs.js id); pass = at least one round
//   2 story:<step id>            while that story step is the next one (vooruitblik)
//     story:end:<part>           while the built story waits at that part's "Wordt vervolgd"
//   3 place:<landmark>           driving past a map.meta.landmarks entry (by name)
//     wijk:<name>                entering a wijk (map.meta.neighbourhoodPoints name)
//   4 situation:<kind>           storm, onweer, rain, night, dawn, speed, flitser, heli (flying the own heli)
//     idle                       chit-chat when nothing else is going on
//
// Adding lines: append exchanges with new ids, gate them with `needs` (and
// `until` where a line goes stale), use the story codes H1-H18 for
// after-lines, then run
//   node scripts/tts_banter_lines.mjs && python3 scripts/tts_banter.py
// which only records the new lines. A line without a recording still plays
// as a subtitle, and an edited line goes silent until it is recorded again.

export const SPEAKERS = { T: 'Tammo', A: 'Anita' };

export const BANTER = [
  // --- after a mission -------------------------------------------------------
  { id: 'h1-pass-koffie', trigger: 'after:H1:pass', lines: [
    ['A', 'Geen kras. Berend moest bijna huilen.', 'proud, amused'],
    ['T', 'Dat was de koffie. Die was koud.', 'dry, deadpan']] },
  { id: 'h1-pass-klomp', trigger: 'after:H1:pass', arc: true, lines: [
    ['T', 'Een Fries die een bakkie wil kopen. Uit een klomp.', 'puzzled, dry'],
    ['A', 'Contant. Wie betaalt er nou nog contant?', 'suspicious, curious'],
    ['T', 'Iemand met een klomp vol geld.', 'deadpan']] },
  { id: 'h1-pass-ventieldopje', trigger: 'after:H1:pass', lines: [
    ['A', 'Vijftig euro. Dat is een ventieldopje van de Fjord.', 'wistful, dry'],
    ['T', 'Dan hebben we er één. Dat is een begin.', 'dry, encouraging']] },
  { id: 'h1-pass-ladder', trigger: 'after:H1:pass', lines: [
    ['A', 'Berend zei "goud". Dat is trede twee.', 'impressed, laughing'],
    ['T', 'Er zijn er zes.', 'dry'],
    ['A', 'Dan hebben we er nog vier.', 'determined, cheerful'],
    ['T', 'Bij Berend? Die haalt niemand.', 'deadpan']] },
  { id: 'h1-fail-tellen', trigger: 'after:H1:fail', lines: [
    ['T', 'Misschien telt hij niet zo goed.', 'hopeful, sheepish'],
    ['A', 'Hij telt al veertig jaar zijn nederlagen, Tammo. Hij telt heel goed.', 'exasperated, laughing']] },

  { id: 'h2-pass-moeder', trigger: 'after:H2:pass', lines: [
    ['A', 'Een pinautomaat in de achterbak. Mijn moeder zou trots zijn.', 'giggling, proud'],
    ['T', 'Je moeder werkte bij de bank.', 'dry'],
    ['A', 'Precies.', 'smug']] },
  { id: 'h2-pass-dopjes', trigger: 'after:H2:pass', lines: [
    ['A', 'Vierhonderd euro. Dat zijn acht ventieldopjes.', 'wistful, calculating'],
    ['T', 'Bijna een band.', 'hopeful'],
    ['A', 'Een heel klein bandje, Tammo.', 'dry, laughing']] },
  { id: 'h2-pass-brein', trigger: 'after:H2:pass', lines: [
    ['T', 'Twee reuzen trekken een automaat uit de muur. En dan vergeten ze hem.', 'baffled, dry'],
    ['A', 'Twee reuzen, één brein.', 'mocking'],
    ['T', 'En dat brein had vrij.', 'deadpan']] },
  { id: 'h2-pass-weigering', trigger: 'after:H2:pass', arc: true, lines: [
    ['A', 'Als iemand die bal steelt, Tammo, dan liever wij. Dan is hij tenminste nog in Stad.', 'persuasive, quick'],
    ['T', 'Mijn opa stond in 1953 op de Grote Markt toen we hem wonnen. Hij huilde. Hij huilde nooit.', 'quiet, serious'],
    ['A', 'Je opa huilde bij elke voetbalwedstrijd.', 'gentle, teasing'],
    ['T', 'Dat was verlies. Dit was anders.', 'stubborn, quiet'],
    ['A', '…Je mag nee zeggen.', 'soft, careful'],
    ['T', 'Ik zeg niks. Dat is ook een antwoord.', 'dry, firm']] },
  { id: 'h2-fail', trigger: 'after:H2:fail', lines: [
    ['A', 'Dat alarm zat er dus wél in.', 'annoyed, sarcastic'],
    ['T', 'Het was een heel eerlijk alarm. Het deed wat het zei.', 'defensive, dry']] },

  { id: 'h3-pass-content', trigger: 'after:H3:pass', lines: [
    ['T', 'Jelmer zei "content". Ik heb me nog nooit zo weinig content gevoeld.', 'grumpy, deadpan'],
    ['A', 'Tienduizend kijkers. Je moeder keek ook.', 'teasing, laughing'],
    ['T', 'Die kijkt alles. Ook het weerbericht van gisteren.', 'resigned']] },
  { id: 'h3-pass-terras', trigger: 'after:H3:pass', lines: [
    ['T', 'Een terras dat applaudisseert. Terwijl het nat is.', 'amazed, dry'],
    ['A', 'Niemand geraakt. Alles omver.', 'proud, laughing'],
    ['T', 'Zo hoort een zomeravond.', 'content'],
    ['A', 'Er ligt een kliko in de fontein, Tammo.', 'giggling'],
    ['T', 'Die zwemt. Het is warm.', 'deadpan']] },
  { id: 'h3-pass-peiling', trigger: 'after:H3:pass', arc: true, lines: [
    ['A', 'Wie was die JelleWâld in de chat?', 'curious, suspicious'],
    ['T', 'Iemand die ons een groot dorp noemt.', 'offended, dry'],
    ['A', 'En mij "famke in het rood". Jij was jaloers.', 'teasing, sly'],
    ['T', 'Ik las het alleen.', 'flat, defensive'],
    ['A', 'Eenenzestig procent zegt van wel. Rikus heeft gepeild.', 'delighted'],
    ['T', 'Rikus moet slapen.', 'grumpy, dry']] },
  { id: 'h3-fail', trigger: 'after:H3:fail', lines: [
    ['A', 'Zelfs de duiven vonden het saai.', 'disappointed, teasing'],
    ['T', 'Duiven hebben hoge eisen. Ze wonen op de Grote Markt.', 'dry']] },
  { id: 'h3-fail-sprong', trigger: 'after:H3:fail', lines: [
    ['A', '"Chat vindt dat niet leuk." Je reed bijna een terrasgast omver.', 'scolding'],
    ['T', 'Bijna. Hij sprong.', 'defensive'],
    ['A', 'Hij sprong heel hoog.', 'dry'],
    ['T', 'Ook content.', 'deadpan']] },

  { id: 'h4-pass-kunst', trigger: 'after:H4:pass', lines: [
    ['A', 'Jouw duif poept op het museum en jij noemt het verkenning.', 'laughing, incredulous'],
    ['T', 'Kunst is wat je ervan maakt.', 'pompous, deadpan']] },
  { id: 'h4-pass-duivenkoning', trigger: 'after:H4:pass', lines: [
    ['A', 'Mijn vriend de duivenkoning.', 'teasing, delighted'],
    ['T', 'Het was één duif. Die had toevallig zin.', 'deadpan'],
    ['A', 'Hij luisterde naar jou, Tammo. Niemand luistert naar jou.', 'laughing'],
    ['T', 'Nou ja. Jij soms.', 'dry, fond']] },
  { id: 'h4-pass-ow', trigger: 'after:H4:pass', arc: true, lines: [
    ['A', 'Je zei "vriend" alsof het een vraag was.', 'curious, soft'],
    ['T', 'Het was geen vraag.', 'flat'],
    ['A', 'Wat was het dan?', 'probing'],
    ['T', 'Ow.', 'deadpan'],
    ['A', '"Ow" is geen antwoord, Tammo.', 'exasperated, amused'],
    ['T', 'In Grunn wel.', 'dry']] },
  { id: 'h4-pass-tegeltje', trigger: 'after:H4:pass', arc: true, lines: [
    ['T', 'We gaan het dus echt doen.', 'quiet, uneasy'],
    ['A', 'We gaan hem eerder halen dan die Fries. Daarna zien we wel.', 'determined, quick'],
    ['T', '"Daarna zien we wel" is geen plan.', 'dry'],
    ['A', "As 't nait gait zoas 't mot, mot 't mor zoas 't gait.", 'wise, sing-song'],
    ['T', 'Dat is ook geen plan. Dat is een tegeltje.', 'deadpan']] },
  { id: 'h4-fail', trigger: 'after:H4:fail', lines: [
    ['A', 'Je hebt een kwartier op een patatbakje gezeten.', 'mocking'],
    ['T', 'Het was een heel groot patatbakje.', 'defensive, dreamy']] },

  { id: 'h5-pass-snits', trigger: 'after:H5:pass', arc: true, lines: [
    ['T', 'Snits Snel. Wie noemt zijn team nou Snits Snel?', 'scornful'],
    ['A', 'Iemand die tweede wordt.', 'smug, laughing']] },
  { id: 'h5-pass-viltje', trigger: 'after:H5:pass', lines: [
    ['A', 'Op de achterkant van een bierviltje. Dit is onze roem.', 'amused, proud'],
    ['T', 'Ik lijst hem in. Naast mijn diploma.', 'proud'],
    ['A', 'Welk diploma?', 'teasing'],
    ['T', 'Precies. Er is plek zat.', 'deadpan']] },
  { id: 'h5-pass-groen', trigger: 'after:H5:pass', arc: true, lines: [
    ['A', 'Alles op groen. En jij remde.', 'teasing, soft'],
    ['T', 'Oogcontact. Dat zei Sjoerd.', 'defensive, dry'],
    ['A', 'Je keek wel heel lang.', 'sly'],
    ['T', 'Het was een lang kruispunt.', 'deadpan']] },
  { id: 'h5-fail', trigger: 'after:H5:fail', lines: [
    ['T', 'Die eerstejaars trapten alsof de mensa ging sluiten.', 'out of breath, bitter'],
    ['A', 'Die sluit ook. Om half acht.', 'dry']] },

  { id: 'h6-pass-lucht', trigger: 'after:H6:pass', lines: [
    ['T', 'Een lege vitrine. Hebben we nou iets gestolen of niet?', 'confused'],
    ['A', 'Lucht. We hebben lucht gestolen.', 'bitter, sarcastic'],
    ['T', 'Dure lucht. Museumlucht.', 'deadpan']] },
  { id: 'h6-pass-w', trigger: 'after:H6:pass', lines: [
    ['A', 'W. Wie tekent er nou met een W?', 'angry, puzzled'],
    ['T', 'Willem? Wietse? Wubbo?', 'quick, guessing'],
    ['A', 'Iemand die "tige tank" schrijft, Tammo. Dat is Fries.', 'fuming']] },
  { id: 'h6-pass-aaibal', trigger: 'after:H6:pass', lines: [
    ['T', 'Die man met die trekker was live. Jelle Terpstra.', 'stunned'],
    ['A', 'Operaasje Aaibal. Hij kan niet eens eierbal zeggen.', 'outraged, mocking'],
    ['T', 'Dat vind ik nog het ergste.', 'deeply offended']] },
  { id: 'h6-pass-hand', trigger: 'after:H6:pass', arc: true, lines: [
    ['T', 'Je hand.', 'quiet'],
    ['A', 'Wat is er met mijn hand?', 'innocent'],
    ['T', 'Die had je nog vast. Bij de uitgang.', 'careful, dry'],
    ['A', 'Voor de grip.', 'quick, light'],
    ['T', 'We stonden al buiten.', 'deadpan'],
    ['A', 'Rij nou maar.', 'embarrassed, brushing it off']] },
  { id: 'q-h6-luik', trigger: 'after:H6:pass', arc: true, lines: [
    ['A', 'Ik had hem al voor me gezien, weet je. De Fjord Frituur. Blauw, met een luik.', 'quiet, wistful'],
    ['T', 'In de Escapade?', 'soft, careful'],
    ['A', 'In de Escapade. En jij achter de frituur.', 'small laugh, tender'],
    ['T', 'Ik? Achter de frituur?', 'surprised, touched'],
    ['A', 'Laat maar. Rij nou maar.', 'embarrassed, brushing it off']] },
  { id: 'h6-fail', trigger: 'after:H6:fail', lines: [
    ['A', '"Zaklamp aan", zei hij.', 'sarcastic, annoyed'],
    ['T', 'Achteraf niet mijn beste idee.', 'sheepish']] },

  { id: 'h7-pass-wind', trigger: 'after:H7:pass', lines: [
    ['A', 'Een toneelstuk over wind. In Grunn. Wat gedurfd.', 'ironic, amused'],
    ['T', 'Volgend jaar doen ze regen. In twee aktes.', 'dry']] },
  { id: 'h7-pass-decor', trigger: 'after:H7:pass', lines: [
    ['T', 'Het decor heeft het overleefd.', 'relieved'],
    ['A', 'Het decor wel. Mijn rug niet.', 'groaning, laughing']] },
  { id: 'h7-pass-hardop', trigger: 'after:H7:pass', arc: true, lines: [
    ['T', 'Dat van daarnet. Over naast mij zitten.', 'careful, quiet'],
    ['A', 'Dat was de wind.', 'quick, light'],
    ['T', 'We stonden binnen.', 'dry'],
    ['A', 'Het was een stuk over wind, Tammo. Er was overal wind.', 'flustered, laughing']] },
  { id: 'h7-fail', trigger: 'after:H7:fail', lines: [
    ['A', 'Moderne dans dus.', 'resigned, amused'],
    ['T', 'Ik heb nog een stukje boom in mijn zak. Voor de première.', 'deadpan']] },

  { id: 'h8-pass-fierljepper', trigger: 'after:H8:pass', arc: true, lines: [
    ['T', 'Wie appt jou nou steeds?', 'suspicious'],
    ['A', 'Niks. Iemand uit Friesland.', 'evasive, quick'],
    ['T', 'Is hij lang?', 'deadpan, jealous'],
    ['A', 'Tammo.', 'warning'],
    ['T', 'Fierljepper zeker.', 'sulking, dry'],
    ['A', 'Rijden, niet praten.', 'bossy, amused']] },
  { id: 'h8-pass-klappen', trigger: 'after:H8:pass', lines: [
    ['T', 'Ze klapten. Voor mij.', 'quietly proud'],
    ['A', 'Voor het vet, Tammo.', 'teasing'],
    ['T', 'Ik zat erbij. Dat telt.', 'stubborn'],
    ['A', '"Valt mie nait of." Trede drie.', 'impressed, laughing'],
    ['T', 'Nog drie.', 'dry']] },
  { id: 'h8-fail', trigger: 'after:H8:fail', lines: [
    ['A', 'Een tankwagen stopt niet als je ernaast gaat rijden.', 'frustrated'],
    ['T', 'Hij had kunnen stoppen. Uit beleefdheid.', 'indignant'],
    ['A', 'Het is een Friese tankwagen.', 'dry']] },

  { id: 'h9-pass-traditie', trigger: 'after:H9:pass', lines: [
    ['T', 'Harm met pensioen. Nu is de ringweg echt klaar.', 'satisfied'],
    ['A', 'Zeg dat niet te hard. Dit is nu echt de laatste fase.', 'mock solemn'],
    ['T', 'Dat zeiden ze in de vorige laatste fase ook.', 'dry']] },
  { id: 'h9-pass-grip', trigger: 'after:H9:pass', arc: true, lines: [
    ['A', 'Je pakte weer mijn hand, in die bocht.', 'teasing, warm'],
    ['T', 'Grip, Anita. Dat heet grip.', 'embarrassed, dry']] },
  { id: 'h9-pass-kwalijk', trigger: 'after:H9:pass', arc: true, lines: [
    ['A', '"Dat neem ik je kwalijk." Dat was voor mij, hè.', 'soft, sly'],
    ['T', 'Dat was voor het verkeer.', 'flat'],
    ['A', 'Tammo.', 'fond, insisting'],
    ['T', 'Ow.', 'deadpan']] },
  { id: 'h9-fail', trigger: 'after:H9:fail', lines: [
    ['T', 'Die weg is sneller dan wij.', 'defeated'],
    ['A', 'Die weg heeft twintig jaar geoefend.', 'dry, laughing']] },

  { id: 'h10-pass-team', trigger: 'after:H10:pass', lines: [
    ['T', 'Heel Grunn klapte.', 'quietly proud'],
    ['A', 'Voor jou of voor de duif?', 'teasing'],
    ['T', 'Voor ons. Ik fluit, hij pikt.', 'dry'],
    ['A', 'Dus de duif deed het werk.', 'smug'],
    ['T', 'Dat bedoelde ik ook.', 'deadpan']] },
  { id: 'h10-pass-foarmem', trigger: 'after:H10:pass', arc: true, lines: [
    ['A', 'Een vlag van dertig meter. Voor zijn moeder.', 'thoughtful, soft'],
    ['T', 'Aan onze toren.', 'grumpy'],
    ['A', 'Wat zou jij aan een toren hangen? Voor iemand?', 'probing, light'],
    ['T', 'Niks. Ik zeg het gewoon.', 'dry'],
    ['A', 'Jij zegt nooit wat.', 'teasing, pointed'],
    ['T', 'Daarom hangt er ook niks.', 'deadpan']] },
  { id: 'h10-fail', trigger: 'after:H10:fail', lines: [
    ['T', 'Die duif pikte het verkeerde touw.', 'frustrated'],
    ['A', 'Het was jouw fluitje.', 'dry'],
    ['T', 'Dan floot ik per ongeluk Fries.', 'deadpan']] },

  { id: 'h11-pass-muur', trigger: 'after:H11:pass', lines: [
    ['A', 'Aan de muur bij Geert. We hebben het gemaakt.', 'tipsy, proud'],
    ['T', 'Naast de wc. Wel de schoonste muur van de kroeg.', 'dry']] },
  { id: 'h11-pass-petten', trigger: 'after:H11:pass', arc: true, lines: [
    ['A', 'Petten dus. Geen snorren.', 'flirty'],
    ['T', 'Genoteerd. In mijn hoofd. Met pen.', 'flustered, dry']] },
  { id: 'h11-pass-moi', trigger: 'after:H11:pass', arc: true, lines: [
    ['A', 'Zei jij nog wat? Buiten, bij het afscheid?', 'tipsy, soft'],
    ['T', 'Nee. Jij?', 'quick, careful'],
    ['A', 'Nee.', 'too quick'],
    ['T', 'Goed.', 'flat'],
    ['A', 'Goed.', 'flat, smiling']] },
  { id: 'h11-pass-vraagt', trigger: 'after:H11:pass', arc: true, lines: [
    ['A', 'Iets doen voor iemand die er niet om vraagt. Dat zei je.', 'thoughtful'],
    ['T', 'Over Jelle.', 'quick'],
    ['A', 'Natuurlijk.', 'knowing, amused'],
    ['T', 'Over Jelle, Anita.', 'insisting, dry']] },
  { id: 'h11-fail', trigger: 'after:H11:fail', lines: [
    ['T', 'Drie kroegen is ook een prestatie.', 'slurring slightly'],
    ['A', 'Voor een dinsdag, ja.', 'laughing']] },

  { id: 'h12-pass-bridge', trigger: 'after:H12:pass', lines: [
    ['A', 'Oma Trijntje stuurt dat filmpje naar haar bridgeclub.', 'amused'],
    ['T', 'Dan ben ik eindelijk bekend. Bij zestig mensen boven de tachtig.', 'proud, dry'],
    ['A', 'Die kennen iedereen, Tammo.', 'knowing']] },
  { id: 'h12-pass-niettegenhaar', trigger: 'after:H12:pass', arc: true, lines: [
    ['A', 'Wat bedoelde ze, "niet tegen haar"?', 'curious, soft'],
    ['T', "Oma's zeggen dingen.", 'evasive, dry'],
    ['A', 'Tammo.', 'insisting'],
    ['T', 'Rijden, niet praten. Dat zeg jij altijd.', 'deadpan']] },
  { id: 'q-h12-gerda', trigger: 'after:H12:pass', arc: true, lines: [
    ['T', 'Die handjes om de bal. Die zijn van oma.', 'quiet, thoughtful'],
    ['A', 'En de beste eierbal was van Gerda.', 'soft'],
    ['T', 'Zeventig jaar. En ze zei het nooit.', 'serious, gentle'],
    ['A', 'Klinkt bekend.', 'pointed, soft'],
    ['T', 'Wat?', 'caught'],
    ['A', 'Niks. Rij nou maar.', 'fond, brushing it off']] },
  { id: 'h12-fail', trigger: 'after:H12:fail', lines: [
    ['T', 'Zo\'n dikke band voelt zachter dan je denkt.', 'dazed'],
    ['A', 'Je lag drie minuten stil.', 'worried, teasing'],
    ['T', 'Ik rustte uit.', 'dignified']] },

  { id: 'h13-pass-skutsje', trigger: 'after:H13:pass', arc: true, lines: [
    ['A', 'Dus. Het skûtsje ligt in de Oosterhaven.', 'businesslike, a bit too fast'],
    ['T', 'Ja. Het skûtsje.', 'flat, careful'],
    ['A', 'Daar moeten we het over hebben. Over het skûtsje.', 'firm, flustered'],
    ['T', 'Alleen daarover.', 'deadpan, soft']] },
  { id: 'h13-pass-gids', trigger: 'after:H13:pass', lines: [
    ['A', 'Jij als gids. "Links Grunn, rechts ook Grunn."', 'mocking, laughing'],
    ['T', 'Het klopte wel.', 'defensive'],
    ['A', 'Het klopte helemaal. Dat was het ergste.', 'giggling']] },
  { id: 'q-h13-avondlicht', trigger: 'after:H13:pass', arc: true, lines: [
    ['A', 'Zeg eens iets.', 'shy, soft'],
    ['T', 'Iets. Hoor je? Ik zeg iets.', 'nervous, deadpan'],
    ['A', 'Tammo.', 'amused, fond'],
    ['T', 'Mooi avondlicht, vanavond.', 'quiet, evasive'],
    ['A', 'Dat is het weer.', 'dry, smiling'],
    ['T', 'Het weer is ook wat.', 'deadpan, soft']] },
  { id: 'h13-fail', trigger: 'after:H13:fail', lines: [
    ['T', 'Wiebe was sneller terug uit de kroeg dan gepland.', 'panting'],
    ['A', 'Voor het eerst in dertig jaar.', 'dry']] },

  { id: 'h14-pass-zwemmen', trigger: 'after:H14:pass', lines: [
    ['A', 'Durk en Douwe zwommen samen naar de kant. Precies tegelijk.', 'laughing'],
    ['T', 'Die doen alles samen. Zelfs natgaan.', 'deadpan']] },
  { id: 'h14-pass-chocola', trigger: 'after:H14:pass', arc: true, lines: [
    ['T', 'Heb jij nog chocola over van die nep-Eierbal?', 'hopeful'],
    ['A', 'Nee. Bewijsmateriaal.', 'innocent'],
    ['T', 'Je hebt hem opgegeten.', 'accusing, dry'],
    ['A', 'Bewijsmateriaal bederft, Tammo.', 'smug']] },
  { id: 'h14-pass-oefenen', trigger: 'after:H14:pass', arc: true, lines: [
    ['A', 'Een oefenbal. Hij oefent wat hij tegen zijn moeder zegt.', 'thoughtful, soft'],
    ['T', 'Met een kaartje erbij.', 'dry'],
    ['A', 'Moet jij ook eens doen. Oefenen.', 'pointed, light'],
    ['T', 'Ik oefen wel. In mijn hoofd.', 'quiet'],
    ['A', 'En hoe gaat dat daar?', 'curious, soft'],
    ['T', 'Kon minder.', 'deadpan']] },
  { id: 'q-h14-beleefd', trigger: 'after:H14:pass', arc: true, lines: [
    ['A', 'Weet je wat ik raar vind? Dat Jelle ons steeds bedankt.', 'thoughtful'],
    ['T', 'Hij denkt dat hij wint. Mensen die winnen zijn beleefd.', 'dry, wise'],
    ['A', 'Dan worden wij straks heel onbeleefd.', 'determined, playful']] },
  { id: 'h14-fail', trigger: 'after:H14:fail', lines: [
    ['A', 'Een zeilboot. Die gaat op wind. Wij gingen op een bel.', 'frustrated, laughing'],
    ['T', 'Volgende keer huren we de speedboot.', 'resigned']] },

  { id: 'h15-pass-touw', trigger: 'after:H15:pass', lines: [
    ['T', 'Ik hing aan een touw boven Grunn. Mijn moeder mag dit nooit weten.', 'shaken, dry'],
    ['A', 'Ze weet het al. Het staat op Sikkom.', 'giggling'],
    ['T', 'Met foto?', 'alarmed'],
    ['A', 'Met filmpje. Je gilde.', 'delighted']] },
  { id: 'h15-pass-schier', trigger: 'after:H15:pass', arc: true, lines: [
    ['A', '"Doe bist schier." Tegen een ballon. En tegen mensen?', 'teasing, soft'],
    ['T', 'Mensen zijn geen ballon.', 'dry'],
    ['A', 'En ik dan?', 'quiet, daring'],
    ['T', '…Jij bent geen ballon.', 'careful, deadpan'],
    ['A', 'Dat is geen antwoord.', 'fond, insisting'],
    ['T', 'Het is een begin.', 'soft, dry']] },
  { id: 'h15-fail', trigger: 'after:H15:fail', lines: [
    ['T', 'Die ballon ging harder dan wij.', 'defeated'],
    ['A', 'Die ballon had geen passagier die steeds "rustig aan" riep.', 'teasing']] },

  { id: 'h16-pass-trein', trigger: 'after:H16:pass', arc: true, lines: [
    ['A', 'Je fietste een trein achterna.', 'soft, amazed'],
    ['T', 'Wind tegen.', 'dry'],
    ['A', 'Voor een auto.', 'probing'],
    ['T', 'Niet voor de auto.', 'quiet'],
    ['A', '…Waarvoor dan?', 'hopeful, soft'],
    ['T', 'Rijden, niet praten.', 'deadpan, flustered'],
    ['A', 'Dat is mijn zin.', 'amused, fond'],
    ['T', 'Ik leen hem even.', 'dry']] },
  { id: 'h16-pass-ruzie', trigger: 'after:H16:pass', arc: true, lines: [
    ['A', 'Wat ik zei. Dat jij nooit iets zegt.', 'quiet, apologetic'],
    ['T', 'Klopte wel.', 'flat, honest'],
    ['A', 'Ik was boos.', 'soft'],
    ['T', 'Het klopte ook als je niet boos was.', 'dry, gentle'],
    ['A', 'En nu?', 'careful'],
    ['T', 'Nu oefen ik.', 'quiet, determined']] },
  { id: 'h16-pass-mem', trigger: 'after:H16:pass', arc: true, lines: [
    ['A', 'Ze wil dat hij ophoudt. Niet dat hij wint.', 'thoughtful'],
    ['T', 'En ik dacht dat het een fierljepper was.', 'sheepish, dry'],
    ['A', 'Ze is één meter zestig, Tammo.', 'laughing'],
    ['T', 'Dat valt mee.', 'relieved, deadpan']] },
  { id: 'h16-pass-escapade', trigger: 'after:H16:pass', lines: [
    ['T', 'Hij ruikt een beetje naar Friese kaas.', 'sniffing, dry'],
    ['A', 'Hij ruikt naar overwinning. Ramen open.', 'proud']] },
  { id: 'h16-fail-trein', trigger: 'after:H16:fail', lines: [
    ['A', 'Jouw Escapade staat op een trein. Zonder ons.', 'heartbroken, angry'],
    ['T', 'We halen hem terug. Desnoods in Leeuwarden.', 'determined']] },

  { id: 'h17-pass-eieren', trigger: 'after:H17:pass', lines: [
    ['T', 'Twaalf eieren, nul gebroken.', 'proud'],
    ['A', 'Elf. Eén rolde onder de achterbank.', 'guilty, amused'],
    ['T', 'Die vinden we in de winter wel terug.', 'resigned']] },
  { id: 'h17-pass-opa', trigger: 'after:H17:pass', arc: true, lines: [
    ['T', '"Woist ja wel." Zei opa.', 'quiet, thoughtful'],
    ['A', 'En oma wilde het één keer horen.', 'soft'],
    ['T', 'Eén keer is genoeg, zei ze.', 'careful'],
    ['A', 'Eén keer is meer dan nul, Tammo.', 'gentle, pointed'],
    ['T', 'Ik kan tellen.', 'dry, soft']] },
  { id: 'h17-pass-bod', trigger: 'after:H17:pass', arc: true, lines: [
    ['T', '"Het bod viel tegen."', 'admiring, dry'],
    ['A', 'Tien frietwagens. Ik heb ze allemaal gezien. In mijn hoofd.', 'wistful'],
    ['T', 'Spijt?', 'careful'],
    ['A', 'Eén frietwagen is genoeg. Als hij de goede is.', 'warm, certain'],
    ['T', 'De Escapade heeft al een gat voor het luik.', 'deadpan, fond']] },
  { id: 'h17-fail', trigger: 'after:H17:fail', lines: [
    ['A', 'Omelet achterin. Ruikt eigenlijk best lekker.', 'sniffing, laughing'],
    ['T', 'Niet tegen Jelle zeggen.', 'whispering']] },

  { id: 'h18-pass-museum', trigger: 'after:H18:pass', lines: [
    ['A', 'De Eierbal staat weer in het museum.', 'content'],
    ['T', 'Met een alarm dat het doet, dit keer.', 'dry'],
    ['A', 'Weet ik. We hebben het getest. Per ongeluk.', 'sheepish, giggling']] },
  { id: 'q-h18-beste', trigger: 'after:H18:pass', arc: true, lines: [
    ['A', 'Wij tweeën vóór Grunn. Klinkt beter dan tegen.', 'content, tired, happy'],
    ['T', 'Alles klinkt beter met een eierbal erbij.', 'dry, happy'],
    ['A', 'Die van ons is de beste. Jelle zei het zelf.', 'proud, laughing'],
    ['T', 'Net fertelle.', 'deadpan, fond']] },
  { id: 'h18-pass-vijf', trigger: 'after:H18:pass', arc: true, lines: [
    ['A', 'Vijf woorden.', 'soft, happy'],
    ['T', 'Ik heb ze achteraf nog eens geteld.', 'dry, shy'],
    ['A', 'Zeg ze nog eens.', 'tender, teasing'],
    ['T', 'Eén keer is genoeg. Zei oma.', 'deadpan'],
    ['A', 'Oma zei ook: dan is het waar.', 'warm'],
    ['T', 'Het is waar.', 'quiet, sincere'],
    ['A', 'Dat zijn er drie.', 'laughing softly'],
    ['T', 'Die tellen ook.', 'fond, dry']] },
  { id: 'h18-pass-kloet', trigger: 'after:H18:pass', arc: true, lines: [
    ['T', 'Berend zei niks meer.', 'amazed, quiet'],
    ['A', 'Een kloet in de strotte. Hoogste trede.', 'proud, soft'],
    ['T', 'Nog nooit gebeurd.', 'dry'],
    ['A', 'Jij zei ook niks meer. Na die vijf woorden.', 'teasing, tender'],
    ['T', 'Kloet.', 'deadpan, choked'],
    ['A', 'In de strotte?', 'fond'],
    ['T', 'Overal.', 'soft, dry']] },
  { id: 'h18-fail', trigger: 'after:H18:fail', lines: [
    ['T', 'Hij was weg voordat ik "Ontzet" kon zeggen.', 'frustrated'],
    ['A', 'Grunn geeft nooit op. Nog een keer.', 'determined']] },

  // --- after a bijbaantje ------------------------------------------------------
  { id: 'job-bezorger-pass', trigger: 'after:job:bezorger:pass', lines: [
    ['T', 'Ik ruik naar kapsalon.', 'disgusted'],
    ['A', 'Je ruikt altijd een beetje naar kapsalon.', 'teasing'],
    ['T', 'Maar nu word ik ervoor betaald.', 'proud']] },
  { id: 'job-bezorger-fail', trigger: 'after:job:bezorger:fail', lines: [
    ['A', 'Lauw eten is een klacht, zeiden ze.', 'mocking'],
    ['T', 'Het was geen lauw eten. Het was eten op kamertemperatuur.', 'indignant']] },
  { id: 'job-taxi-pass', trigger: 'after:job:taxi:pass', lines: [
    ['A', 'Die man achterin vertelde zijn hele scheiding.', 'amazed'],
    ['T', 'En toch gaf hij fooi.', 'satisfied'],
    ['A', 'Omdat je knikte. Je bent een goede knikker.', 'laughing']] },
  { id: 'job-taxi-fail', trigger: 'after:job:taxi:fail', lines: [
    ['T', 'De klant stapte uit bij rood.', 'confused'],
    ['A', 'De klant stapte uit bij jou.', 'dry']] },
  { id: 'job-bus-pass', trigger: 'after:job:bus:pass', lines: [
    ['T', 'Lijn drie. Op tijd. Ik heb iets betekend voor de maatschappij.', 'solemn, proud'],
    ['A', 'Twee minuten te vroeg. Dat is hier een misdaad.', 'teasing']] },
  { id: 'job-bus-fail', trigger: 'after:job:bus:fail', lines: [
    ['A', 'Een bus met passagiers is geen raceauto.', 'scolding'],
    ['T', 'Het is een raceauto met publiek.', 'unrepentant']] },
  { id: 'job-rondvaart-pass', trigger: 'after:job:rondvaart:pass', lines: [
    ['A', 'Die toeristen gaven fooi. Wat heb je ze verteld?', 'curious'],
    ['T', 'Dat de Martinitoren van chocola is.', 'proud, deadpan'],
    ['A', 'En dat geloofden ze?', 'incredulous'],
    ['T', 'Ze kwamen uit Friesland.', 'smug']] },
  { id: 'job-rondvaart-fail', trigger: 'after:job:rondvaart:fail', lines: [
    ['T', 'Die brug was lager dan gepland.', 'dazed'],
    ['A', 'Bruggen plannen niet, Tammo.', 'exasperated']] },
  { id: 'job-fietsdepot-pass', trigger: 'after:job:fietsdepot:pass', lines: [
    ['A', 'We hebben net fietsen weggehaald. In Grunn. Dit is hoogverraad.', 'guilty, giggling'],
    ['T', 'Ze hadden een oranje label.', 'defensive'],
    ['A', 'Leg dat maar uit op een verjaardag.', 'dry']] },
  { id: 'job-fietsdepot-fail', trigger: 'after:job:fietsdepot:fail', lines: [
    ['T', 'Die fiets kwam terug. Met zijn eigenaar.', 'shaken'],
    ['A', 'En die eigenaar had ook een fiets. Voor jou.', 'laughing']] },
  { id: 'job-verhuizing-pass', trigger: 'after:job:verhuizing:pass', lines: [
    ['T', 'Een piano naar driehoog. Zonder lift.', 'exhausted, proud'],
    ['A', 'Jij droeg het krukje.', 'dry'],
    ['T', 'Dat krukje was loodzwaar.', 'offended']] },
  { id: 'job-verhuizing-fail', trigger: 'after:job:verhuizing:fail', lines: [
    ['A', 'Die bank paste niet door de deur.', 'frustrated'],
    ['T', 'Die bank past nu overal door. Het is een halve bank.', 'deadpan']] },

  // --- story progress (vooruitblik) -------------------------------------------
  { id: 'st-h2-pinnen', trigger: 'story:H2', lines: [
    ['A', 'Ik moet nog even pinnen. In de Herestraat.', 'casual'],
    ['T', 'Ik ga mee. Ik heb niks te doen.', 'dry'],
    ['A', 'Je hebt nooit wat te doen.', 'teasing'],
    ['T', 'Daarom ga ik altijd mee.', 'deadpan, fond']] },
  { id: 'st-h3', trigger: 'story:H3', lines: [
    ['A', 'Jelmer wil content. Wat is content eigenlijk?', 'curious'],
    ['T', 'Iets met veel geschreeuw en een ringlamp.', 'grumpy']] },
  { id: 'st-h3-stunt', trigger: 'story:H3', lines: [
    ['A', 'Een stuntavond. Met de Escapade.', 'excited'],
    ['T', 'Die doet geen stunts. Die doet het nauwelijks.', 'dry'],
    ['A', 'Dan is elke meter een stunt.', 'cheerful']] },
  { id: 'st-duif', trigger: 'story:H4', lines: [
    ['T', 'Ik ga met duiven werken. Mijn vader zou trots zijn.', 'proud'],
    ['A', 'Je vader was bang voor duiven.', 'dry'],
    ['T', 'Precies. Ik doorbreek het patroon.', 'solemn']] },
  { id: 'st-h4-ogen', trigger: 'story:H4', lines: [
    ['A', 'Bert zegt dat een duif naar je luistert als je hem diep in de ogen kijkt.', 'skeptical'],
    ['T', 'Werkt dat bij mensen ook?', 'curious, dry'],
    ['A', 'Probeer maar.', 'daring, soft'],
    ['T', 'Ik kijk liever naar de weg.', 'quick, deadpan'],
    ['A', 'Laf.', 'teasing'],
    ['T', 'Veilig.', 'dry']] },
  { id: 'st-fiets', trigger: 'story:k-fiets', lines: [
    ['A', 'Een fiets kopen. Er liggen er duizenden in het Reitdiep.', 'scheming'],
    ['T', 'Die zijn nat.', 'dry'],
    ['A', 'Die zijn gratis.', 'pragmatic']] },
  { id: 'st-h5', trigger: 'story:H5', lines: [
    ['T', 'KEI-week. Ik voel me weer negentien.', 'nostalgic'],
    ['A', 'Je was drie weken student.', 'teasing'],
    ['T', 'Drie intense weken.', 'solemn']] },
  { id: 'st-kraakspullen', trigger: 'story:k-kraakspullen', lines: [
    ['A', 'Zwart incognito of een huurboot. Wat past bij jou?', 'curious'],
    ['T', 'Zwart. Dat maakt slank.', 'vain'],
    ['A', 'Het is een inbraak, geen date.', 'laughing'],
    ['T', 'Waarom niet allebei?', 'flirty, dry']] },
  { id: 'st-nacht', trigger: 'story:k-nacht', lines: [
    ['T', 'We wachten op het donker. Voelt heel filmisch.', 'dramatic whisper'],
    ['A', 'In november is het hier om vier uur donker.', 'dry'],
    ['T', 'Dan hadden we in november moeten kraken.', 'regretful']] },
  { id: 'st-h6', trigger: 'story:H6', lines: [
    ['A', 'Vannacht. Het museum. Geen zaklamp.', 'tense, serious'],
    ['T', 'Ook niet een klein beetje zaklamp?', 'pleading'],
    ['A', 'Nul zaklamp.', 'firm']] },
  { id: 'st-end-kop-laten', trigger: 'story:end:kop', lines: [
    ['T', 'Hij heeft hem. En hij bedankt ons nog ook.', 'bitter'],
    ['A', 'Dat laten we niet zo, Tammo.', 'determined'],
    ['T', 'Nee. Eerst een eierbal. En dan laten we het niet zo.', 'resolute']] },
  { id: 'st-end-kop-ontzet', trigger: 'story:end:kop', lines: [
    ['T', '"Oant sjen op it Ontset." Wat bedoelt hij daarmee?', 'puzzled'],
    ['A', 'Achtentwintig augustus. Dan vieren we dat de vijand wegging.', 'proud'],
    ['T', 'Handig. Dan weten we alvast de datum.', 'dry']] },
  { id: 'st-end-kop-fjord', trigger: 'story:end:kop', lines: [
    ['A', 'Zonder die Eierbal geen Fjord Frituur.', 'sad'],
    ['T', 'Dan halen we hem terug. Uit Friesland, als het moet.', 'determined'],
    ['A', 'Jij. In Friesland.', 'surprised, touched'],
    ['T', 'Met een paspoort. Voor de zekerheid.', 'dry']] },
  { id: 'st-trein', trigger: 'story:r-trein', lines: [
    ['T', 'Een treinkaartje naar maakt niet uit waar.', 'dry'],
    ['A', 'Assen. Daar zoekt niemand ons.', 'scheming'],
    ['T', 'Daar zoekt niemand iets.', 'deadpan']] },
  { id: 'st-h7', trigger: 'story:H7', lines: [
    ['A', 'Femke zegt dat we gisteravond decor hebben gebouwd. Bij haar. Tot laat.', 'sly'],
    ['T', 'Deden we dat?', 'puzzled'],
    ['A', 'Nu wel.', 'smug'],
    ['T', 'Ik weet er niks meer van.', 'deadpan'],
    ['A', 'Zo hoort een alibi.', 'approving']] },
  { id: 'st-h8', trigger: 'story:H8', lines: [
    ['T', 'Al het vet van Stad. Opgekocht.', 'grim'],
    ['A', 'Dat is geen snackprijs meer. Dat is een beleg.', 'outraged'],
    ['T', 'Wat deed Stad in 1672?', 'curious'],
    ['A', 'Volhouden. En dan de banden lek.', 'determined, dry'],
    ['T', 'Dat laatste staat niet in de boeken.', 'deadpan']] },
  { id: 'st-tuning', trigger: 'story:r-tuning', lines: [
    ['A', 'Jij gaat geld uitgeven. Aan de Escapade.', 'amazed'],
    ['T', 'Hij heeft het verdiend.', 'proud'],
    ['A', 'Hij rijdt nauwelijks.', 'dry'],
    ['T', 'Straks rijdt hij nauwelijks hard.', 'deadpan, proud']] },
  { id: 'st-h9', trigger: 'story:H9', lines: [
    ['A', 'Harm zegt: nu echt de laatste fase.', 'amused'],
    ['T', 'Ik geloof het als ik eroverheen rij.', 'skeptical'],
    ['A', 'Dat is vandaag.', 'cheerful'],
    ['T', 'Dan geloof ik het vandaag. Eventjes.', 'dry']] },
  { id: 'st-h10', trigger: 'story:H10', lines: [
    ['A', 'Rikus zegt dat de torenwachter weer gebeld heeft.', 'curious'],
    ['T', 'Wat meldde hij?', 'dry'],
    ['A', 'Weet ik niet. Hij meldt alleen.', 'laughing']] },
  { id: 'st-kermis', trigger: 'story:r-kermis', lines: [
    ['A', 'De kermis staat er al. Botsauto\'s.', 'excited'],
    ['T', 'Eindelijk.', 'pleased'],
    ['A', 'Jij rijdt al jaren zo.', 'teasing'],
    ['T', 'Nu met kaartje.', 'dry, proud']] },
  { id: 'st-h11', trigger: 'story:H11', lines: [
    ['T', 'Vier kroegen in de Poelestraat. Voor het werk.', 'solemn'],
    ['A', 'Voor het werk.', 'dry'],
    ['T', 'Ik heb nog nooit zo graag gewerkt.', 'content, deadpan']] },
  { id: 'st-h12', trigger: 'story:H12', lines: [
    ['A', 'Oma Trijntje heeft Rikus gebeld. Over de fatbikes.', 'amused'],
    ['T', 'Ze belt Rikus. Niet mij.', 'offended'],
    ['A', 'Ze vroeg naar "de twee die het niet zeggen".', 'sly'],
    ['T', 'Wat zeggen we niet?', 'innocent, dry'],
    ['A', 'Precies dat.', 'knowing, soft']] },
  { id: 'st-h13', trigger: 'story:H13', lines: [
    ['A', 'Klaas heeft een rondvaartboot. Die is even van niemand.', 'sly'],
    ['T', 'Zo begint hier elk goed verhaal.', 'dry']] },
  { id: 'st-sboot', trigger: 'story:s-boot', lines: [
    ['A', 'Een eigen boot. Wij worden net rijke mensen.', 'excited, teasing'],
    ['T', 'Gehuurd. Voor een middag.', 'dry'],
    ['A', 'Rijke mensen voor een middag dan.', 'cheerful']] },
  { id: 'st-h14', trigger: 'story:H14', lines: [
    ['T', 'Wat doe je eigenlijk als je op een skûtsje springt?', 'nervous, curious'],
    ['A', 'Je landt. Dat is de hele truc.', 'confident'],
    ['T', 'En wat doen we daarna?', 'worried'],
    ['A', 'Daarna improviseren we. Zoals altijd.', 'amused']] },
  { id: 'st-proefvlucht', trigger: 'story:s-proefvlucht', lines: [
    ['T', 'Rotor Roelf denkt dat we een heli kopen.', 'uneasy'],
    ['A', 'Laat hem maar denken.', 'sly'],
    ['T', 'Wij hebben net één fiets gekocht.', 'dry'],
    ['A', 'Met bonnetje. Dat maakt indruk.', 'confident, laughing']] },
  { id: 'st-h15', trigger: 'story:H15', lines: [
    ['A', 'Laat Dokter Dijkstra ons echt vliegen?', 'unbelieving'],
    ['T', 'Hij zei "Grunneger noodgeval". Dat is hier een officiële categorie.', 'dry, knowing']] },
  { id: 'st-carbid', trigger: 'story:s-carbid', lines: [
    ['A', 'De echte bal. Op jouw schoot.', 'nervous, excited'],
    ['T', 'Hij is zwaar.', 'dry'],
    ['A', 'Zwaarder dan chocola.', 'teasing'],
    ['T', 'Alles is zwaarder dan chocola.', 'deadpan']] },
  { id: 'st-padel', trigger: 'story:s-padel', lines: [
    ['A', 'Padel. Twee tegen twee, in een glazen doos.', 'teasing'],
    ['T', 'Net als ons leven.', 'dry, deadpan']] },
  { id: 'st-h16-sleutel', trigger: 'story:H16', lines: [
    ['A', 'Durk en Douwe met een autosleutel. Dat zit me niet lekker.', 'uneasy'],
    ['T', 'Misschien hebben ze een auto gekocht.', 'dry'],
    ['A', 'Van welk geld?', 'suspicious'],
    ['T', 'Uit een klomp.', 'deadpan'],
    ['A', 'Waar staat de Escapade eigenlijk?', 'sudden, worried'],
    ['T', 'Voor de deur. Waar hij altijd staat.', 'confident']] },
  { id: 'st-h17-dopjes', trigger: 'story:H17', lines: [
    ['A', 'Jelle wil bieden. Op de radio. Genoeg voor tien frietwagens.', 'tense'],
    ['T', 'Tien.', 'impressed'],
    ['A', 'Hoeveel ventieldopjes is dat?', 'dry, nervous laugh'],
    ['T', 'Heel veel.', 'deadpan']] },
  { id: 'q-h17-ons', trigger: 'story:H17', needs: 'H16', lines: [
    ['T', 'Als we winnen… verkopen we hem dan?', 'quiet, hesitant'],
    ['A', 'Vraag je dat aan mij of aan jezelf?', 'soft, probing'],
    ['T', 'Aan ons.', 'sincere'],
    ['A', 'Dan weten wij het antwoord al.', 'warm, smiling']] },
  { id: 'st-h18-berend', trigger: 'story:H18', lines: [
    ['A', 'Ontzet. Met Berend in de jury.', 'excited'],
    ['T', 'Hij valt ons elk jaar aan.', 'dry'],
    ['A', 'En elk jaar verliest hij.', 'laughing'],
    ['T', 'Dan weet hij hoe het voelt. Hij proeft eerlijk.', 'confident']] },
  { id: 'st-h18-peiling', trigger: 'story:H18', lines: [
    ['A', 'Rikus heeft die peiling nog steeds open staan.', 'teasing'],
    ['T', 'Welke peiling?', 'innocent'],
    ['A', 'Tammo.', 'fond, insisting'],
    ['T', 'Ik heb hem niet gehoord.', 'deadpan'],
    ['A', 'Heel Stad heeft hem gehoord.', 'laughing']] },
  { id: 'end-staart-bakken', trigger: 'story:end:staart', lines: [
    ['T', 'En nu?', 'curious'],
    ['A', 'Nu bakken we eierballen. Elke dag.', 'happy'],
    ['T', 'En ik mag ze proeven?', 'hopeful'],
    ['A', 'De mislukte.', 'teasing']] },
  { id: 'end-staart-revanche', trigger: 'story:end:staart', lines: [
    ['A', 'Jelle belde. Hij wil een revanche. Op het water, zegt hij.', 'amused'],
    ['T', 'Natuurlijk wil hij dat.', 'sighing'],
    ['A', 'Ik heb ja gezegd.', 'mischievous']] },
  { id: 'end-staart-konminder', trigger: 'story:end:staart', lines: [
    ['T', 'Wij tweeën vóór Grunn. Kon minder.', 'warm, shy, understated'],
    ['A', 'Kon veel minder, mien jong.', 'tender, smug']] },

  // --- places ------------------------------------------------------------------
  { id: 'pl-martinitoren', trigger: 'place:Martinitoren', lines: [
    ['T', "D'Olle Grieze. Zevenennegentig meter Grunn.", 'proud'],
    ['A', 'En vanuit Friesland zie je hem toch niet.', 'teasing'],
    ['T', 'Die kijken gewoon de verkeerde kant op.', 'dry']] },
  { id: 'pl-martinitoren-thuis', trigger: 'place:Martinitoren', lines: [
    ['A', "Daar is d'Olle Grieze.", 'warm'],
    ['T', 'Bijna thuis.', 'content'],
    ['A', 'We wonen er vier straten vandaan, Tammo.', 'amused'],
    ['T', 'Dus: bijna thuis.', 'stubborn, dry']] },
  { id: 'pl-martinitoren-steiger', trigger: 'place:Martinitoren', lines: [
    ['T', 'Waarom staat er altijd een steiger om die toren?', 'curious'],
    ['A', 'Anders waait hij om.', 'deadpan'],
    ['T', 'Dat verklaart veel.', 'convinced']] },
  { id: 'pl-martinitoren-wachter', trigger: 'place:Martinitoren', needs: 'H3', lines: [
    ['A', 'Zou de torenwachter ons nu zien?', 'curious'],
    ['T', 'Vast.', 'dry'],
    ['A', 'Gaat hij bellen?', 'amused'],
    ['T', 'Nee. Hij meldt alleen.', 'deadpan']] },
  { id: 'pl-grotemarkt', trigger: 'place:Grote Markt', until: 'H3', lines: [
    ['T', 'De Grote Markt. Mooiste plein van het noorden.', 'proud'],
    ['A', 'Er staat altijd een hijskraan.', 'dry'],
    ['T', 'Die hoort erbij. Dat is kunst.', 'defensive']] },
  { id: 'pl-grotemarkt-kliko', trigger: 'place:Grote Markt', needs: 'H3', until: 'H18', lines: [
    ['A', 'De Grote Markt. Hier moeten we eigenlijk niet meer komen.', 'nervous'],
    ['T', 'Waarom niet?', 'innocent'],
    ['A', 'Die kliko ligt nog in de fontein, Tammo.', 'whispering, laughing']] },
  { id: 'pl-grotemarkt-ontzet', trigger: 'place:Grote Markt', needs: 'H18', lines: [
    ['T', 'Hier stond onze kraam.', 'fond, quiet'],
    ['A', 'Hier zei jij vijf woorden.', 'soft, teasing'],
    ['T', 'Ik heb er een bordje voor aangevraagd.', 'deadpan'],
    ['A', 'Bij Berend?', 'laughing'],
    ['T', 'Hij schrijft de gemeente wel een brief.', 'dry']] },
  { id: 'pl-vismarkt', trigger: 'place:Vismarkt', lines: [
    ['T', 'Vismarkt. Mijn opa kocht hier elke vrijdag een haring.', 'nostalgic'],
    ['A', 'En jij?', 'curious'],
    ['T', 'Ik keek. Vis kijkt terug.', 'uneasy']] },
  { id: 'pl-vismarkt-terras', trigger: 'place:Vismarkt', until: 'H18', lines: [
    ['A', 'Alle terrassen op de Vismarkt vol.', 'happy'],
    ['T', 'Eén zonnetje en heel Stad zit buiten.', 'dry'],
    ['A', 'En jij zit in de auto.', 'teasing'],
    ['T', 'Met het raam open. Dat is mijn terras.', 'content, deadpan']] },
  { id: 'pl-aakerk', trigger: 'place:Der Aa-kerk', lines: [
    ['A', 'De Der Aa-kerk. Die toren is twee keer ingestort.', 'informative'],
    ['T', 'En ze zetten hem gewoon weer neer.', 'admiring'],
    ['A', 'Koppig, hè.', 'dry'],
    ['T', 'Dat heet hier gewoon Gronings.', 'proud']] },
  { id: 'pl-forum', trigger: 'place:Forum Groningen', lines: [
    ['T', 'De Kiekdeuse. Een bibliotheek met een roltrap naar het dak.', 'impressed'],
    ['A', 'Jij bent er alleen voor het uitzicht geweest.', 'teasing'],
    ['T', 'En voor de wc. Gratis. Kon minder.', 'satisfied, deadpan']] },
  { id: 'pl-museum-voor', trigger: 'place:Groninger Museum', until: 'H6', lines: [
    ['A', 'Het museum. Die gouden toren kijkt me aan.', 'tempted'],
    ['T', 'Dat is geen toren. Dat is een uitnodiging.', 'sly']] },
  { id: 'pl-museum-na', trigger: 'place:Groninger Museum', needs: 'H6', lines: [
    ['T', 'Het museum. Plaats delict.', 'whispering'],
    ['A', 'Rij gewoon door. Doe normaal.', 'tense'],
    ['T', 'Ik doe normaal. Ik zwaai alleen even naar de bewaker.', 'innocent']] },
  { id: 'pl-station', trigger: 'place:Hoofdstation Groningen', lines: [
    ['A', 'Het station. Binnen een uur ben je in Friesland.', 'musing'],
    ['T', 'Waarom zou je?', 'puzzled'],
    ['A', 'Om daarna heel blij terug te komen.', 'cheerful']] },
  { id: 'pl-station-peerd', trigger: 'place:Hoofdstation Groningen', lines: [
    ['T', 'Stond dat paard gisteren niet ergens anders?', 'suspicious'],
    ['A', 'Het Peerd van Ome Loeks staat altijd ergens anders.', 'knowing'],
    ['T', 'Een paard met een eigen agenda.', 'impressed, dry']] },
  { id: 'pl-station-perron', trigger: 'place:Hoofdstation Groningen', needs: 'H16', lines: [
    ['A', 'Perron drie.', 'soft, fond'],
    ['T', 'Daar stond hij. Op een wagon.', 'dry'],
    ['A', 'En jij ernaast. Bezweet.', 'teasing, warm'],
    ['T', 'Wind tegen.', 'deadpan']] },
  { id: 'pl-prinsentuin', trigger: 'place:Prinsentuin', lines: [
    ['T', 'De Prinsentuin. Hier heb ik je ooit bijna iets gevraagd.', 'shy'],
    ['A', 'O? Wat dan?', 'intrigued, soft'],
    ['T', 'Of je een krentenbol wilde. Ik durfde niet.', 'sheepish']] },
  { id: 'pl-academie', trigger: 'place:Academiegebouw', lines: [
    ['A', 'Het Academiegebouw. Jouw oude school.', 'teasing'],
    ['T', 'Drie weken. Ik heb er nog een kluisje.', 'nostalgic'],
    ['A', 'Met wat erin?', 'curious'],
    ['T', 'Een boterham. Oud inmiddels.', 'deadpan']] },
  { id: 'pl-goudkantoor', trigger: 'place:Goudkantoor', until: 'H6', lines: [
    ['T', 'Het Goudkantoor. Er ligt geen goud meer in.', 'disappointed'],
    ['A', 'Er wordt nu koffie gezet. Dat is het nieuwe goud.', 'cheerful']] },
  { id: 'pl-goudkantoor-na', trigger: 'place:Goudkantoor', needs: 'H6', lines: [
    ['T', 'Het Goudkantoor. Geen goud meer in.', 'bitter'],
    ['A', 'Net als in het museum.', 'sour']] },
  { id: 'pl-noorderplantsoen', trigger: 'place:Noorderplantsoen', lines: [
    ['A', 'Het Noorderplantsoen. Hier speelt Noorderzon.', 'happy'],
    ['T', 'Een festival in een park, en iedereen doet alsof dat normaal is.', 'grumpy'],
    ['A', 'Het is ook normaal. Jij bent gewoon chagrijnig.', 'laughing'],
    ['T', 'Dat is mijn festival.', 'deadpan']] },
  { id: 'pl-noorderplantsoen-zon', trigger: 'place:Noorderplantsoen', lines: [
    ['T', 'Eén straaltje zon en het hele Noorderplantsoen ligt vol kleedjes.', 'amazed'],
    ['A', 'En overal zo\'n klein barbecuetje.', 'laughing'],
    ['T', 'In februari. In je jas.', 'dry']] },
  { id: 'pl-paddepoel', trigger: 'place:Winkelcentrum Paddepoel', lines: [
    ['T', 'Paddepoel. Dit is buitenland.', 'alarmed'],
    ['A', 'Het is vier kilometer van de Grote Markt.', 'dry'],
    ['T', 'Precies. Buitenland.', 'firm']] },
  { id: 'pl-euroborg', trigger: 'place:Euroborg', lines: [
    ['A', 'Het stadion. De trots van het noorden.', 'proud'],
    ['T', 'Jij bent er nooit geweest.', 'teasing'],
    ['A', 'Ik hoor het thuis als ze scoren. De hele wijk trilt.', 'excited']] },
  { id: 'pl-eikea', trigger: 'place:EIKEA', lines: [
    ['T', 'EIKEA. Vier uur lopen tussen de bankstellen.', 'weary'],
    ['A', 'En dan buitenkomen met alleen waxinelichtjes.', 'laughing'],
    ['T', 'Honderd. Voor als het ooit donker wordt.', 'deadpan']] },

  // --- wijken ------------------------------------------------------------------
  { id: 'wk-binnenstad', trigger: 'wijk:Binnenstad', lines: [
    ['A', 'De binnenstad. Tweehonderd fietsen per vierkante meter.', 'wary'],
    ['T', 'En één auto. Wij.', 'dry'],
    ['A', 'Rustig aan. Hier heeft de fiets altijd gelijk.', 'warning']] },
  { id: 'wk-oosterpoort', trigger: 'wijk:Oosterpoort', lines: [
    ['A', 'De Oosterpoort. Hier woonde mijn oma.', 'nostalgic'],
    ['T', 'Die met de soep?', 'curious'],
    ['A', 'Die met de ruzie over de soep.', 'laughing']] },
  { id: 'wk-zuiderpark', trigger: 'wijk:Zuiderpark', lines: [
    ['T', 'Het Zuiderpark. Hier rijden de fatbikes.', 'nervous'],
    ['A', 'Die rijden overal. Je bent gewoon getraumatiseerd.', 'teasing']] },
  { id: 'wk-selwerd', trigger: 'wijk:Selwerd', lines: [
    ['A', 'Selwerd. Hier heb ik leren fietsen.', 'nostalgic'],
    ['T', 'Daarom rij je nu auto.', 'teasing'],
    ['A', 'Daarom leef jij nog.', 'dry']] },
  { id: 'wk-korreweg', trigger: 'wijk:Korrewegwijk', lines: [
    ['T', 'De Korrewegwijk. Hier woonde ik op een zolder van vier vierkante meter.', 'nostalgic'],
    ['A', 'Met drie huisgenoten.', 'dry'],
    ['T', 'Het was heel gezellig. Noodgedwongen.', 'deadpan']] },
  { id: 'wk-oosterpark', trigger: 'wijk:Oosterparkwijk', lines: [
    ['A', 'De Oosterparkwijk. Hier stond vroeger het oude stadion.', 'nostalgic'],
    ['T', 'Mijn opa zegt dat ze daar harder zongen.', 'proud'],
    ['A', 'Je opa zegt dat alles vroeger harder was.', 'teasing'],
    ['T', 'Behalve de wind. Die is hetzelfde gebleven.', 'dry']] },
  { id: 'wk-oosterpark-stoep', trigger: 'wijk:Oosterparkwijk', lines: [
    ['T', 'Onze stoep.', 'fond, quiet'],
    ['A', 'Jij, ik en Rikus met zijn mengtafel van karton.', 'nostalgic, laughing'],
    ['T', 'Hij had toen al luisteraars.', 'dry'],
    ['A', 'Twee.', 'teasing'],
    ['T', 'Een trouw publiek.', 'deadpan']] },
  { id: 'wk-schildersbuurt', trigger: 'wijk:Schildersbuurt', needs: 'H2', lines: [
    ['T', 'De Schildersbuurt. Elke straat heet naar een schilder.', 'informative'],
    ['A', 'Waarom heet er niks naar jou?', 'teasing'],
    ['T', 'Ik heb pas één ding geschilderd. Een pinautomaat.', 'proud, dry']] },
  { id: 'wk-schildersbuurt-berend', trigger: 'wijk:Schildersbuurt', needs: 'H1', lines: [
    ['A', 'Hier woont Berend. Met zijn brieven aan de gemeente.', 'amused'],
    ['T', 'Elke week één. Sinds 1977.', 'dry'],
    ['A', 'Wat staat erin?', 'curious'],
    ['T', 'Dat het vroeger beter was. Ook in 1977.', 'deadpan']] },
  { id: 'wk-hereweg', trigger: 'wijk:Herewegbuurt', lines: [
    ['A', 'De Herewegbuurt. Huizen met een naam op het hek.', 'impressed'],
    ['T', 'Ons huis heeft ook een naam.', 'proud'],
    ['A', '"Achterstallig onderhoud" is geen naam.', 'dry, laughing']] },
  { id: 'wk-europapark', trigger: 'wijk:Europapark', lines: [
    ['T', 'Europapark. Kantoren en een station waar nooit iemand uitstapt.', 'bored'],
    ['A', 'Behalve als de club speelt.', 'knowing'],
    ['T', 'Dan stapt iedereen uit. Zingend.', 'amused']] },
  { id: 'wk-blauwedorp', trigger: 'wijk:Het Blauwe Dorp', lines: [
    ['A', 'Het Blauwe Dorp.', 'musing'],
    ['T', 'Ik vind het eigenlijk nogal rood.', 'squinting, puzzled'],
    ['A', 'Tammo, jij bent kleurenblind.', 'patient'],
    ['T', 'Dat verklaart jouw jas.', 'dry']] },
  { id: 'wk-reitdiep', trigger: 'wijk:Reitdiepswaard', lines: [
    ['T', 'Het Reitdiep. Hier eindigt elke gestolen fiets.', 'solemn'],
    ['A', 'En bijna jij, ooit.', 'dry'],
    ['T', 'Ik was ook bijna een fiets.', 'deadpan']] },
  { id: 'wk-hoendiep', trigger: 'wijk:Hoendiep', lines: [
    ['T', 'Hoendiep. Klinkt als een kip die zwemt.', 'amused'],
    ['A', 'Het is een kanaal, Tammo.', 'patient'],
    ['T', 'Voor een zwemmende kip.', 'stubborn']] },
  { id: 'wk-damsterdiep', trigger: 'wijk:Damsterdiep', lines: [
    ['A', 'Het Damsterdiep. Van hier vaar je zo naar Delfzijl.', 'dreamy'],
    ['T', 'En dan?', 'skeptical'],
    ['A', 'Dan eet je een visje en vaar je terug.', 'content']] },
  { id: 'wk-grunobuurt', trigger: 'wijk:Grunobuurt', lines: [
    ['T', 'De Grunobuurt. Gruno heeft de stad gesticht. Zegt het verhaal.', 'informative'],
    ['A', 'Die heeft vast ook een Fries weggejaagd.', 'scheming'],
    ['T', 'Dat staat er niet bij. Maar ja.', 'conspiratorial']] },
  { id: 'wk-paddepoel', trigger: 'wijk:Paddepoel', lines: [
    ['T', 'Paddepoel. Dat winkelcentrum heeft een eigen klimaat.', 'dry'],
    ['A', 'Binnen is het altijd twintig graden en donderdag.', 'laughing'],
    ['T', 'Koopavond. Mijn favoriete seizoen.', 'content']] },
  { id: 'wk-hoogte', trigger: 'wijk:De Hoogte', lines: [
    ['T', 'De Hoogte. Het ligt geen centimeter hoger dan de rest.', 'indignant'],
    ['A', 'Het is een gevoel, Tammo. Een hoogtegevoel.', 'dreamy, laughing']] },

  // --- situations ---------------------------------------------------------------
  { id: 'si-storm', trigger: 'situation:storm', lines: [
    ['T', 'Code rood.', 'alarmed'],
    ['A', 'Voor Grunn is dit gewoon dinsdag.', 'unbothered']] },
  { id: 'si-onweer', trigger: 'situation:onweer', lines: [
    ['A', 'Als de bliksem in de Martinitoren slaat, krijgen we vrij.', 'hopeful'],
    ['T', 'Vrij van wat?', 'puzzled'],
    ['A', 'Van alles.', 'cheerful']] },
  { id: 'si-regen', trigger: 'situation:rain', lines: [
    ['T', 'Het regent.', 'gloomy'],
    ['A', 'Het regent hier niet. Het is gewoon een beetje nat, tussendoor.', 'cheerful']] },
  { id: 'si-regen-paraplu', trigger: 'situation:rain', lines: [
    ['A', 'Regen. Nu fietst iedereen met een paraplu.', 'amused'],
    ['T', 'Met één hand sturen. Hier is dat een olympische sport.', 'dry']] },
  { id: 'si-regen-zomer', trigger: 'situation:rain', until: 'H18', lines: [
    ['T', 'Regen. In augustus.', 'gloomy'],
    ['A', 'Het is zomer. En een beetje nat.', 'cheerful'],
    ['T', 'Zo is het altijd zomer.', 'dry']] },
  { id: 'si-nacht', trigger: 'situation:night', lines: [
    ['T', 'Grunn bij nacht. Alles is mooi als je niks ziet.', 'contemplative'],
    ['A', 'Zelfs jij.', 'teasing'],
    ['T', 'Dank je. Denk ik.', 'unsure']] },
  { id: 'si-nacht-rikus', trigger: 'situation:night', needs: 'H1', lines: [
    ['A', 'Het is na tienen. Nachtstreek begint.', 'cosy'],
    ['T', 'Bel Rikus.', 'dry'],
    ['A', 'Nee. Wij bellen Rikus niet. Rikus belt ons.', 'laughing']] },
  { id: 'si-dageraad', trigger: 'situation:dawn', lines: [
    ['A', 'Zonsopgang. We zijn de hele nacht op geweest.', 'tired, happy'],
    ['T', 'Net studenten.', 'yawning'],
    ['A', 'Die zijn nu pas op weg naar huis.', 'laughing']] },
  { id: 'si-snelheid', trigger: 'situation:speed', lines: [
    ['T', 'Honderd. Mijn maag staat nog bij het stoplicht.', 'queasy'],
    ['A', 'Die haalt ons wel weer in.', 'thrilled']] },
  { id: 'si-flitser', trigger: 'situation:flitser', lines: [
    ['A', 'Smile. Die foto hangt straks naast de wc bij Geert.', 'laughing'],
    ['T', 'Prima. Ik heb een goede kant.', 'vain']] },
  { id: 'si-flitser-album', trigger: 'situation:flitser', lines: [
    ['T', 'Geflitst. Weer een foto voor het album.', 'resigned'],
    ['A', 'Het duurste fotoalbum van Grunn.', 'dry']] },
  { id: 'si-heli-hemel', trigger: 'situation:heli', lines: [
    ['T', 'Geen stoplicht, geen flitspaal, geen fietser. Dit is de hemel.', 'blissful, dreamy'],
    ['A', 'Een beetje hoog voor iemand met hoogtevrees.', 'teasing, nervous'],
    ['T', 'Ik heb geen hoogtevrees. Ik heb landingsvrees.', 'deadpan']] },
  { id: 'si-heli-maquette', trigger: 'situation:heli', lines: [
    ['A', 'Van hierboven is Grunn net een maquette. Kijk, de Martinitoren!', 'amazed, excited'],
    ['T', 'En daar staat de Escapade. Van boven ziet hij er ook oud uit.', 'dry, fond']] },
  { id: 'si-heli-eierbal', trigger: 'situation:heli', lines: [
    ['T', 'Kun je eigenlijk een eierbal halen met een helikopter?', 'curious, hungry'],
    ['A', 'Alleen als de snackbar een plat dak heeft.', 'amused, practical']] },

  // --- idle chit-chat -----------------------------------------------------------
  { id: 'id-tegenwind', trigger: 'idle', lines: [
    ['T', 'Tegenwind. Alweer.', 'grim'],
    ['A', 'We zitten in een auto, Tammo.', 'patient'],
    ['T', 'Ik voel hem toch.', 'stubborn']] },
  { id: 'id-moi', trigger: 'idle', lines: [
    ['A', 'Waarom zeggen we "moi" als je binnenkomt én als je weggaat?', 'curious'],
    ['T', 'Efficiënt. Eén woord voor alles.', 'dry'],
    ['A', 'Net als jij met "nou".', 'teasing'],
    ['T', 'Nou. Precies.', 'deadpan']] },
  { id: 'id-miljoen', trigger: 'idle', lines: [
    ['A', 'Wat zou jij doen met een miljoen?', 'dreamy'],
    ['T', 'Een eierbal. En de rest sparen voor een tweede eierbal.', 'serious']] },
  { id: 'st-eierbal', trigger: 'idle', lines: [
    ['T', 'Ik heb dromen, Anita. Ze zijn rond en gepaneerd.', 'dreamy'],
    ['A', 'Het is een ei in een jasje, Tammo.', 'amused'],
    ['T', 'Zo zijn de beste mensen ook.', 'wise, deadpan']] },
  { id: 'id-taal', trigger: 'idle', lines: [
    ['T', 'Friezen hebben een eigen taal.', 'grudging'],
    ['A', 'Wij ook.', 'proud'],
    ['T', 'Wij noemen het geen taal. Wij noemen het gelijk hebben.', 'smug']] },
  { id: 'id-drachten', trigger: 'idle', lines: [
    ['A', 'Zou jij ooit in Friesland willen wonen?', 'curious'],
    ['T', 'Ik ben één keer in Drachten geweest.', 'thoughtful'],
    ['A', 'En?', 'expectant'],
    ['T', 'Het was heel rustig. Ik heb er goed geslapen.', 'polite, dry']] },
  { id: 'id-kniepertjes', trigger: 'idle', lines: [
    ['T', 'Weet je wat ik mis? Kniepertjes.', 'longing'],
    ['A', 'Het is geen oud en nieuw.', 'dry'],
    ['T', 'Het is altijd een beetje oud en nieuw, als je wilt.', 'philosophical']] },
  { id: 'id-fietsen', trigger: 'idle', lines: [
    ['A', 'Hoeveel fietsen zijn er eigenlijk in Grunn?', 'curious'],
    ['T', 'Meer dan mensen.', 'confident'],
    ['A', 'Hoe kan dat nou?', 'skeptical'],
    ['T', 'Iedereen heeft er één. En één die gestolen is.', 'matter-of-fact']] },
  { id: 'id-radio', trigger: 'idle', lines: [
    ['T', 'Mag de radio aan?', 'hopeful'],
    ['A', 'Nee.', 'firm'],
    ['T', 'Ook niet zachtjes?', 'pleading'],
    ['A', 'Zachtjes nee.', 'sweet, firm']] },
  { id: 'id-ommelanders', trigger: 'idle', lines: [
    ['T', 'Stadjers of Ommelanders, wie zijn er beter?', 'provocative'],
    ['A', 'Stadjers vinden Stadjers beter.', 'dry'],
    ['T', 'En Ommelanders?', 'curious'],
    ['A', 'Die zeggen niks. Die weten het gewoon.', 'knowing']] },
  { id: 'id-suikerfabriek', trigger: 'idle', lines: [
    ['A', 'Ruik je dat?', 'sniffing, suspicious'],
    ['T', 'De suikerfabriek kan het niet zijn. Die is al jaren dicht.', 'thoughtful'],
    ['A', 'Dan ben jij het.', 'dry']] },
  { id: 'id-steigers', trigger: 'idle', lines: [
    ['T', 'Is Grunn eigenlijk ooit af?', 'philosophical'],
    ['A', 'Natuurlijk is Grunn af.', 'confident'],
    ['T', 'Zeg dat maar tegen de steigers.', 'dry']] },
  { id: 'id-honger', trigger: 'idle', lines: [
    ['T', 'Ik heb honger.', 'whiny'],
    ['A', 'Je hebt net gegeten.', 'exasperated'],
    ['T', 'Dat was een snack. Ik bedoel eten.', 'serious'],
    ['A', 'Een eierbal is ook een snack.', 'teasing']] },
  { id: 'id-bussen', trigger: 'idle', lines: [
    ['A', 'Waarom rijden hier eigenlijk zoveel bussen?', 'curious'],
    ['T', 'Zodat iedereen kan zien dat hij niet in de bus zit.', 'smug']] },
  { id: 'id-elfsteden', trigger: 'idle', lines: [
    ['T', 'Heb jij ooit de Elfstedentocht willen rijden?', 'curious'],
    ['A', 'Die gaat nooit door.', 'dry'],
    ['T', 'Daarom juist. Een veilige droom.', 'content']] },
  { id: 'id-stad-kent-ons', trigger: 'idle', lines: [
    ['A', 'Soms denk ik dat de stad ons kent.', 'thoughtful'],
    ['T', 'De pliesie in elk geval wel.', 'dry']] },
  { id: 'id-nooit-zeggen', trigger: 'idle', until: 'H18', lines: [
    ['A', 'Tammo, waarom zeg jij eigenlijk nooit wat je denkt?', 'soft, probing'],
    ['T', 'Ik denk dat ik honger heb.', 'deadpan'],
    ['A', 'Zie je, het kan wel.', 'laughing']] },
  { id: 'id-niks-boven', trigger: 'idle', lines: [
    ['T', 'Er gaat niks boven Grunn.', 'proud'],
    ['A', 'Behalve de Martinitoren.', 'teasing'],
    ['T', 'Die staat in Grunn.', 'triumphant'],
    ['A', 'Dan klopt het.', 'conceding, amused']] },
  { id: 'id-mosterdsoep', trigger: 'idle', needs: 'H18', lines: [
    ['A', 'Mosterdsoep. Waarom is dat hier zo\'n ding?', 'curious'],
    ['T', 'Omdat het koud is en mosterd warm.', 'matter-of-fact'],
    ['A', 'Dat is geen reden.', 'skeptical'],
    ['T', 'Dat is dé reden.', 'firm']] },
  { id: 'id-kroket', trigger: 'idle', lines: [
    ['T', 'In Friesland eten ze suikerbrood bij alles.', 'scandalized'],
    ['A', 'En wij dan? Wij eten eierballen bij alles.', 'laughing'],
    ['T', 'Dat is anders. Eierballen zijn cultuur.', 'defensive']] },
  { id: 'id-wadden', trigger: 'idle', lines: [
    ['A', 'Wij moeten eens wadlopen.', 'excited'],
    ['T', 'Door de modder lopen naar een eiland waar ook een boot heen gaat?', 'incredulous'],
    ['A', 'Ja! Heerlijk toch?', 'bright'],
    ['T', 'Goed. Voor jou.', 'resigned, warm']] },
  { id: 'id-bijnamen', trigger: 'idle', lines: [
    ['A', 'Waarom heeft hier elk gebouw een bijnaam?', 'curious'],
    ['T', 'De Apenrots. Het Cruiseschip. De Kiekdeuse. Dan weet iedereen wat je bedoelt.', 'matter-of-fact'],
    ['A', 'En hoe noemen ze ons huis?', 'teasing'],
    ['T', '"Dat van die twee."', 'deadpan']] },
  { id: 'id-krolbrug', trigger: 'idle', lines: [
    ['T', 'Wat heeft de Krolbrug vandaag?', 'weary'],
    ['A', 'Hij gaat niet open.', 'dry'],
    ['T', 'Gisteren ging hij niet dicht.', 'resigned'],
    ['A', 'Afwisseling. Dat is ook wat waard.', 'cheerful']] },
  { id: 'id-ringzuid', trigger: 'idle', lines: [
    ['A', 'Omleiding. Weer.', 'annoyed'],
    ['T', '"Nu echt de laatste fase", staat op het bord.', 'reading aloud, dry'],
    ['A', 'Dat bord is ouder dan jij.', 'laughing']] },
  { id: 'id-bloemetjesmarkt', trigger: 'idle', lines: [
    ['A', 'Volgend voorjaar is het weer Bloemetjesmarkt. De hele binnenstad vol plantjes.', 'excited'],
    ['T', 'En vol touringcars uit Duitsland.', 'dry'],
    ['A', 'Die kopen alles. Zelfs die cactus waar jij bang voor bent.', 'teasing'],
    ['T', 'Die cactus keek raar.', 'defensive']] },
  { id: 'id-voorrang', trigger: 'idle', lines: [
    ['T', 'Die fietser keek niet eens.', 'indignant'],
    ['A', 'Hoeft ook niet. Hier heeft de fiets altijd voorrang.', 'matter-of-fact'],
    ['T', 'Ook op de stoep?', 'incredulous'],
    ['A', 'Vooral op de stoep.', 'dry']] },
  { id: 'id-route', trigger: 'idle', lines: [
    ['T', 'Hier rechtsaf. Dat is korter.', 'confident'],
    ['A', 'Dat is eenrichtingsverkeer, Tammo.', 'patient'],
    ['T', 'Voor hén.', 'stubborn'],
    ['A', 'Voor iedereen.', 'firm'],
    ['T', 'Dat bedoelde ik ook.', 'deadpan']] },
  { id: 'id-eierbal-denken', trigger: 'idle', lines: [
    ['T', 'Weet jij wat ik net dacht?', 'dreamy'],
    ['A', 'Eierbal.', 'dry'],
    ['T', 'Nee.', 'offended'],
    ['A', 'Twee eierballen.', 'knowing'],
    ['T', '…Nou ja. Ook.', 'caught, deadpan']] },
  { id: 'id-wikipedia', trigger: 'idle', needs: 'H1', lines: [
    ['T', 'De Martinitoren is honderd meter. Minstens.', 'confident'],
    ['A', 'Zevenennegentig. En een beetje. Klaar rond 1482.', 'matter-of-fact'],
    ['T', 'Daar gaat Anita, de wandelende Wikipedia van Stad.', 'teasing'],
    ['A', 'Iemand moet het weten.', 'smug'],
    ['T', 'Zevenennegentig bedoelde ik ook.', 'deadpan']] },

  // summer in Grunn (the story weeks, until Ontzet)
  { id: 'id-tropisch', trigger: 'idle', until: 'H18', lines: [
    ['T', 'Zesentwintig graden. Hittegolf.', 'sweating, grim'],
    ['A', 'In Grunn heet dat tropisch.', 'cheerful'],
    ['T', 'Mijn ijsje is al op. Ik heb er niks van gemerkt.', 'mournful, dry']] },
  { id: 'id-hoornseplas', trigger: 'idle', until: 'H18', lines: [
    ['A', 'Heel Stad ligt aan de Hoornseplas.', 'happy'],
    ['T', 'Negatief zwemadvies.', 'dry'],
    ['A', 'Iedereen zwemt toch.', 'cheerful'],
    ['T', 'Dat is ook Gronings. Wel horen, niet luisteren.', 'proud, deadpan']] },
  { id: 'id-kei', trigger: 'idle', until: 'H6', lines: [
    ['T', 'Overal polsbandjes.', 'grumpy'],
    ['A', 'KEI-week. Ze zijn nieuw hier.', 'warm'],
    ['T', 'Er vroeg er eentje de weg.', 'dry'],
    ['A', 'En?', 'curious'],
    ['T', 'Ik heb hem naar Paddepoel gestuurd.', 'deadpan'],
    ['A', 'Buitenland.', 'laughing'],
    ['T', 'Moet hij ook eens zien.', 'satisfied']] },
  { id: 'id-goidag', trigger: 'idle', until: 'H13', lines: [
    ['A', 'Jij zegt "goidag" tegen elke vreemde.', 'teasing'],
    ['T', 'Dat hoort zo.', 'dry'],
    ['A', 'En tegen mij?', 'soft, probing'],
    ['T', 'Jij bent geen vreemde.', 'flat'],
    ['A', 'Dus tegen mij zeg je niks.', 'amused'],
    ['T', 'Precies.', 'deadpan']] },
  { id: 'id-fjord-luik', trigger: 'idle', needs: 'H1', until: 'H18', lines: [
    ['A', 'Mag er echt een luik in? In de Escapade?', 'careful, hopeful'],
    ['T', 'Hij heeft al gaten. Eén meer.', 'dry'],
    ['A', 'Een luik is geen gat.', 'laughing'],
    ['T', 'Voor hem wel.', 'deadpan, fond']] },

  // Nachtstreek and its regulars
  { id: 'id-rikus-studio', trigger: 'idle', needs: 'H2', lines: [
    ['A', 'Rikus heeft nu een echte studio, hè.', 'amused'],
    ['T', 'Met een deur.', 'deadpan'],
    ['A', 'Vooruitgang.', 'laughing']] },
  { id: 'id-fietstunnel', trigger: 'idle', needs: 'H6', lines: [
    ['A', 'Rikus zegt dat de fietstunnel bijna klaar is.', 'hopeful'],
    ['T', 'Welk jaar nu?', 'weary'],
    ['A', 'Een jaar later dan vorige week.', 'dry'],
    ['T', 'Dan is hij nog steeds bijna.', 'resigned, deadpan']] },
  { id: 'id-torenwachter', trigger: 'idle', needs: 'H3', lines: [
    ['T', 'De torenwachter belde weer.', 'weary'],
    ['A', 'Wat meldde hij?', 'curious'],
    ['T', 'Dat ik in een auto zit.', 'dry'],
    ['A', 'Klopt.', 'amused'],
    ['T', 'Hij meldt alleen.', 'deadpan']] },
  { id: 'id-peiling', trigger: 'idle', needs: 'H5', until: 'H18', lines: [
    ['A', 'Rikus heeft weer een peiling. Over ons.', 'teasing'],
    ['T', 'Ik luister niet naar peilingen.', 'grumpy'],
    ['A', 'Vierenzeventig procent.', 'delighted'],
    ['T', 'Vierenzeventig procent wat?', 'suspicious'],
    ['A', 'Woist ja wel.', 'sly, soft'],
    ['T', 'Ken ik ja nait roeken.', 'deadpan, flustered']] },
  { id: 'id-sikkom', trigger: 'idle', needs: 'H6', lines: [
    ['A', 'Sikkom schrijft dat de dieven in het zwart waren.', 'reading, amused'],
    ['T', 'Dat waren we ook.', 'dry'],
    ['A', 'Sikkom schrijft nooit iets wat klopt.', 'puzzled'],
    ['T', 'Nu wel. Dat is pas eng.', 'deadpan']] },
  { id: 'id-storing', trigger: 'idle', needs: 'H13', lines: [
    ['T', 'Rikus zegt: achttien bruggen in storing.', 'weary'],
    ['A', 'Tegelijk?', 'incredulous'],
    ['T', 'Ze hebben overlegd.', 'dry'],
    ['A', 'Eindelijk samenwerking in Stad.', 'laughing']] },
  { id: 'id-ladder', trigger: 'idle', needs: 'H8', until: 'H18', lines: [
    ['A', 'Hoeveel treden heeft die ladder van jullie eigenlijk?', 'curious'],
    ['T', 'Ow. Goud. Valt mie nait of. Braid noar de zin. Kon minder.', 'counting, dry'],
    ['A', 'Dat zijn er vijf.', 'dry'],
    ['T', 'De zesde zeg je niet.', 'quiet'],
    ['A', 'Wat doe je dan?', 'soft, curious'],
    ['T', 'Dan slik je.', 'deadpan, soft']] },

  // the Fjord Frituur (Anita's dream) and the Eierbal
  { id: 'id-komtgoud', trigger: 'idle', needs: 'H6', lines: [
    ['T', 'Denk jij dat we die Eierbal ooit terugzien?', 'worried, quiet'],
    ['A', 'Komt goud, mien jong.', 'warm, reassuring'],
    ['T', 'Zeg je dat omdat het waar is?', 'hopeful'],
    ['A', 'Ik zeg het omdat jij het nodig hebt.', 'soft']] },
  { id: 'id-pet', trigger: 'idle', needs: 'H3', lines: [
    ['T', 'Mijn pet heeft meer volgers dan ik.', 'grumpy'],
    ['A', 'Je pet is ook leuker.', 'teasing'],
    ['T', 'Dat accepteer ik.', 'resigned']] },
  { id: 'id-foodtruck', trigger: 'idle', needs: 'H2', lines: [
    ['T', 'Waarom eigenlijk een foodtruck?', 'curious'],
    ['A', 'Met een foodtruck kun je overal naartoe.', 'dreamy'],
    ['T', 'Behalve Friesland.', 'dry'],
    ['A', 'Juist Friesland. Daar weten ze niet wat lekker is.', 'mischievous']] },
  { id: 'id-fjord-meeuw', trigger: 'idle', needs: 'H2', lines: [
    ['A', 'De Fjord Frituur. Blauw, met een meeuw erop.', 'dreamy'],
    ['T', 'En een bel die "moi" zegt.', 'suggesting, dry'],
    ['A', 'Tammo. Dat is eigenlijk heel goed.', 'surprised, touched']] },
  { id: 'id-fjord-naam', trigger: 'idle', needs: 'H2', lines: [
    ['T', 'Waarom heet het eigenlijk de Fjord Frituur?', 'curious'],
    ['A', 'Omdat het lekker klinkt.', 'defensive'],
    ['T', 'Er zijn hier geen fjorden.', 'dry'],
    ['A', 'Er is hier ook geen frituur zoals de mijne.', 'proud']] },
  { id: 'id-trekker', trigger: 'idle', needs: 'H4', until: 'H6', lines: [
    ['T', 'Die trekker-limo. Wie rijdt er nou met een trekker door de stad?', 'baffled'],
    ['A', 'Iemand die gezien wil worden.', 'suspicious'],
    ['T', 'Of iemand die geen parkeerplek kan vinden.', 'dry']] },
  { id: 'id-omsmelten', trigger: 'idle', needs: 'H6', until: 'H11', lines: [
    ['T', 'Wat doet een Fries met een gouden eierbal?', 'worried'],
    ['A', 'Omsmelten tot een gouden klompje.', 'dark, dramatic'],
    ['T', 'Dat is barbaars.', 'horrified'],
    ['A', 'Dat is praktisch. Zo zijn ze daar.', 'dry']] },
  { id: 'id-fierljeppen', trigger: 'idle', needs: 'H6', until: 'H18', lines: [
    ['A', 'Jelle Terpstra. Zelfs zijn naam klinkt als een fierljepper.', 'mocking'],
    ['T', 'Die springt vast ook over grachten.', 'dry'],
    ['A', 'Laten we hopen dat hij een keer mist.', 'mischievous']] },
  { id: 'id-kind', trigger: 'idle', needs: 'H6', lines: [
    ['A', 'Als wij ooit een kind krijgen, noemen we het niet Jelle.', 'casual, firm'],
    ['T', 'Kind? Wie had het over een kind?', 'panicking'],
    ['A', 'Niemand. Rijden.', 'innocent, amused']] },
  { id: 'id-tigetank', trigger: 'idle', needs: 'H6', lines: [
    ['T', 'Ik blijf aan dat kaartje denken. "Tige tank."', 'brooding'],
    ['A', 'Hij had tenminste een mooi handschrift.', 'grudging'],
    ['T', 'Anita! Echt?', 'shocked']] },

  // the romance, in steps (Tammo never says it before H18)
  { id: 'id-moi-zacht', trigger: 'idle', needs: 'H11', until: 'H13', lines: [
    ['A', 'Gisteren, bij de deur. Zei jij moi?', 'soft, curious'],
    ['T', 'Misschien.', 'evasive'],
    ['A', 'Ik hoorde niks.', 'teasing'],
    ['T', 'Dan was het zacht.', 'dry'],
    ['A', 'Hoe zacht?', 'fond'],
    ['T', 'Voor de buren.', 'deadpan']] },
  { id: 'id-na-kus', trigger: 'idle', needs: 'H13', until: 'H16', lines: [
    ['A', 'We hebben het er niet over, hè.', 'careful, soft'],
    ['T', 'Waarover?', 'innocent, too quick'],
    ['A', 'Precies.', 'dry, smiling'],
    ['T', 'Mooi weer trouwens.', 'evasive'],
    ['A', 'Het regent, Tammo.', 'laughing'],
    ['T', 'Zomer. Een beetje nat.', 'deadpan']] },
  { id: 'id-meeuwen', trigger: 'idle', needs: 'H10', lines: [
    ['A', 'Kun jij ook meeuwen?', 'curious'],
    ['T', 'Meeuwen luisteren naar niemand.', 'firm'],
    ['A', 'Net als jij.', 'teasing'],
    ['T', 'Ik luister altijd naar jou.', 'sweet, deadpan'],
    ['A', '…Nou ja. Meestal.', 'warm, amused']] },
  { id: 'id-rikus-duif', trigger: 'idle', needs: 'H10', lines: [
    ['A', 'Rikus had het op de radio over je. De duivenfluisteraar van het Oosterpark.', 'giggling'],
    ['T', 'Ik zeg niks.', 'deadpan'],
    ['A', 'Hij heeft er een jingle bij.', 'delighted'],
    ['T', 'Dan zeg ik wél wat. Tegen Rikus.', 'grumpy']] },
  { id: 'id-suikerbrood', trigger: 'idle', needs: 'H9', until: 'H16', lines: [
    ['A', 'Suikerbrood moet je roosteren. Met roomboter. Niet te dun.', 'knowing'],
    ['T', 'Hoe weet jij dat nou weer?', 'suspicious'],
    ['A', 'Gewoon. Dat weet je.', 'evasive'],
    ['T', 'Dat weet niemand. Behalve Friezen.', 'jealous, dry']] },
  { id: 'id-mem', trigger: 'idle', needs: 'H16', lines: [
    ['T', 'Mem Terpstra. Ik was jaloers op een moeder.', 'deadpan'],
    ['A', 'Een beetje, hè.', 'teasing'],
    ['T', 'Een heel klein beetje.', 'sheepish'],
    ['A', 'Ze vond je schattig. Met je pet.', 'giggling'],
    ['T', '…Kon minder.', 'flustered, secretly proud']] },
  { id: 'id-rikus-friet', trigger: 'idle', needs: 'H17', until: 'H18', lines: [
    ['A', 'Rikus wil de eerste friet uit de Fjord Frituur.', 'amused'],
    ['T', 'De eerste is voor mij.', 'stubborn'],
    ['A', 'Weet ik. Hij krijgt de tweede. Als hij betaalt.', 'firm, warm']] },
  { id: 'id-ontzet-feiten', trigger: 'idle', needs: 'H17', lines: [
    ['T', 'In 1672 won Bommen Berend, toch?', 'confident'],
    ['A', 'Nee. Grunn hield hem buiten. Daarom vieren we het.', 'patient, knowing'],
    ['T', 'Dat bedoelde ik ook.', 'deadpan'],
    ['A', 'Je bedoelde het precies andersom.', 'laughing']] },

  // after the story: September, the Fjord Frituur
  { id: 'id-fjordfrituur', trigger: 'idle', needs: 'H18', lines: [
    ['A', 'De rij bij de Fjord Frituur staat tot aan de Korenbeurs.', 'proud'],
    ['T', 'Omdat jij er staat.', 'sweet'],
    ['A', 'Omdat de eierballen goed zijn.', 'flattered, firm'],
    ['T', 'Dat ook, ja.', 'deadpan, loving']] },
  { id: 'id-fierljep-mis', trigger: 'idle', needs: 'H18', lines: [
    ['T', 'Weet je nog dat je zei: laten we hopen dat hij een keer mist?', 'amused'],
    ['A', 'Ik heb het nooit zo mooi zien missen.', 'laughing']] },
  { id: 'id-september', trigger: 'idle', needs: 'H18', lines: [
    ['A', 'Het ruikt naar suiker.', 'sniffing, wistful'],
    ['T', 'Hoogkerk.', 'dry'],
    ['A', 'De zomer is op.', 'soft'],
    ['T', 'Wij niet.', 'quiet, warm']] },
  { id: 'id-nog-eens', trigger: 'idle', needs: 'H18', lines: [
    ['A', 'Zeg het nog eens.', 'teasing, tender'],
    ['T', 'Eén keer is genoeg.', 'deadpan'],
    ['A', 'Oma zegt dat.', 'fond'],
    ['T', 'Oma heeft gelijk. Woist ja wel.', 'warm, dry']] },

  // --- after the story: Jelle's challenges and the Fjord Frituur (postgame.js) ---
  { id: 'pg-bruggen-pass-hek', trigger: 'after:post-bruggen:pass', lines: [
    ['A', 'Elf bruggen, en Jelle zag alleen ons hek.', 'proud, laughing'],
    ['T', 'Onder de Herebrug keek hij heel verdrietig.', 'dry'],
    ['A', 'Zo kijkt hij altijd, Tammo.', 'teasing']] },
  { id: 'pg-bruggen-pass-motor', trigger: 'after:post-bruggen:pass', lines: [
    ['T', 'Hij zei dat zijn motor nog koud was.', 'amused, dry'],
    ['A', 'Na elf bruggen? Dan heeft hij een Friese motor.', 'mocking, cheerful'],
    ['T', 'Die wordt pas warm in Leeuwarden.', 'deadpan']] },
  { id: 'pg-bruggen-fail', trigger: 'after:post-bruggen:fail', lines: [
    ['A', 'Hij kende elke brug. Hij heeft ze vast geteld.', 'annoyed, grudging'],
    ['T', 'Elf. Dat kan ik ook tellen.', 'defensive'],
    ['A', 'Tellen wel. Varen nog niet.', 'teasing']] },
  { id: 'pg-fierljep-pass', trigger: 'after:post-fierljep:pass', lines: [
    ['T', 'Jelle stond daar met zijn mond open.', 'delighted, dry'],
    ['A', 'Een Fries zonder woorden. Dat zie je maar één keer.', 'laughing'],
    ['T', 'Ik heb een foto. In mijn hoofd.', 'satisfied']] },
  { id: 'pg-fierljep-fail', trigger: 'after:post-fierljep:fail', lines: [
    ['A', 'Het water was kouder dan het eruitzag.', 'shivering, rueful'],
    ['T', 'Het water was precies zo koud als het eruitzag.', 'dry'],
    ['A', 'Volgende keer spring jij eerst.', 'bossy']] },
  { id: 'pg-skutsje-pass', trigger: 'after:post-skutsje:pass', lines: [
    ['A', 'Zeilen zonder motor. Dat ik dat nog meemaak.', 'amazed, happy'],
    ['T', 'De wind was Gronings vandaag.', 'proud, dry'],
    ['A', 'De wind is van niemand, Tammo.', 'amused'],
    ['T', 'Vandaag wel.', 'stubborn']] },
  { id: 'pg-skutsje-fail', trigger: 'after:post-skutsje:fail', lines: [
    ['T', 'Hij zei steeds "fakmanskip". Is dat erg?', 'confused'],
    ['A', 'Voor ons wel, vandaag.', 'sighing, laughing']] },
  { id: 'pg-fjord-pass-kassa', trigger: 'after:fjord:pass', lines: [
    ['A', 'Hoorde je die kassa? Dat is muziek.', 'thrilled'],
    ['T', 'Mooier dan G-Music.', 'dry'],
    ['A', 'Zeg dat maar niet te hard.', 'whispering, laughing']] },
  { id: 'pg-fjord-pass-hond', trigger: 'after:fjord:pass', lines: [
    ['T', 'Die man bestelde drie eierballen. Voor zijn hond, zei hij.', 'baffled'],
    ['A', 'Gelukkige hond.', 'warm'],
    ['T', 'Ik wil die hond zijn.', 'wistful, deadpan']] },
  { id: 'pg-fjord-fail', trigger: 'after:fjord:fail', lines: [
    ['A', 'Een kroket is geen frikandel.', 'patient, teasing'],
    ['T', 'Ze zijn allebei lang en bruin.', 'defensive'],
    ['A', 'Daarom heb ik een menukaart gemaakt.', 'dry']] },
  { id: 'id-pg-revanche', trigger: 'idle', needs: 'H18', lines: [
    ['T', 'Jelle belt elke dag. Nog één potje, zegt hij.', 'resigned, amused'],
    ['A', 'Hij kan gewoon niet tegen zijn verlies.', 'teasing'],
    ['T', 'Dat is heel menselijk.', 'generous, dry'],
    ['A', 'Dat is heel Fries.', 'laughing']] },
  { id: 'id-pg-fjord-plek', trigger: 'idle', needs: 'H18', lines: [
    ['A', 'Bij een wedstrijd staat de rij bij de Euroborg tot aan de parkeerplaats.', 'dreamy, businesslike'],
    ['T', 'En op de Vismarkt koopt iedereen alleen maar vis.', 'dry'],
    ['A', 'Tot ze onze eierballen ruiken.', 'confident']] },

  // --- padel (padel.js) -----------------------------------------------------------
  { id: 'padel-pass', trigger: 'after:padel:pass', lines: [
    ['A', 'Jij kunt padellen. Wie had dat gedacht.', 'surprised, amused'],
    ['T', 'Ik. Al jaren.', 'smug, dry']] },
  { id: 'padel-fail', trigger: 'after:padel:fail', lines: [
    ['T', 'Dat glas stond verkeerd.', 'grumpy'],
    ['A', 'Dat glas staat er al sinds de bouw, Tammo.', 'teasing']] },
];

// Short cut-offs when a crash or new stars interrupt a conversation (one line).
export const REACTIONS = {
  crash: [
    ['T', 'Au. Mijn hoofd.', 'pained'],
    ['A', 'Mijn nek!', 'shocked'],
    ['T', 'Die paal stond er gisteren niet.', 'dazed'],
    ['A', 'Rijden. Niet botsen. Rijden!', 'shouting'],
    ['T', 'Dat was een stoeprand met ambities.', 'groaning'],
  ],
  stars: [
    ['A', 'Nou komt de pliesie.', 'alarmed'],
    ['T', 'Daar gaan we weer.', 'resigned'],
    ['A', 'Zwaailichten. Gezellig.', 'sarcastic'],
    ['T', 'Sirenes. Ons liedje.', 'dry'],
  ],
};
