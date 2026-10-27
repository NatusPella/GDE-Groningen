// Tammo and Tessa's car banter as data (banter.js plays it). Pure data: no
// imports, so scripts/tts_banter_lines.mjs can read it in Node.
// The beats follow docs/verhaal/nieuw/00-OVERZICHT.md: one summer in August, the
// Escapade is Tammo's, the Fjord Frituur is Tessa's dream, and Tammo never
// says it out loud before H18.
//
// Exchange fields
//   id       unique and stable: the heard-list and the voice file names use it
//   trigger  when it may play, see TRIGGERS
//   needs    story step id(s) from storyarc.js STEPS that must be done ('H6', 'k-fiets', ...)
//   until    story step id(s) that must NOT be done yet (lines that go stale)
//   arc      (after:*) only when the mission was played in story order: every story
//            mission before it is done, like the full dialogue in missionstory.js
//   lines    [speaker, text, tag]: speaker 'T' (Tammo) or 'A' (Tessa); tag is the
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
  // The lines after the missions of the first version of the story (after:H1..H18, story:H*) were removed in #187:
  // they could not fire for the current story. New ones use the step ids (after:M01:pass) and `needs` on those ids.

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
    ['A', 'We wonen in Paddepoel, Tammo.', 'amused'],
    ['T', 'Ik zie hem vanaf de elfde. Dus: bijna thuis.', 'stubborn, dry']] },
  { id: 'pl-martinitoren-steiger', trigger: 'place:Martinitoren', lines: [
    ['T', 'Waarom staat er altijd een steiger om die toren?', 'curious'],
    ['A', 'Anders waait hij om.', 'deadpan'],
    ['T', 'Dat verklaart veel.', 'convinced']] },
  { id: 'pl-grotemarkt', trigger: 'place:Grote Markt', until: 'H3', lines: [
    ['T', 'De Grote Markt. Mooiste plein van het noorden.', 'proud'],
    ['A', 'Er staat altijd een hijskraan.', 'dry'],
    ['T', 'Die hoort erbij. Dat is kunst.', 'defensive']] },
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
  { id: 'pl-station', trigger: 'place:Hoofdstation Groningen', lines: [
    ['A', 'Het station. Binnen een uur ben je in Friesland.', 'musing'],
    ['T', 'Waarom zou je?', 'puzzled'],
    ['A', 'Om daarna heel blij terug te komen.', 'cheerful']] },
  { id: 'pl-station-peerd', trigger: 'place:Hoofdstation Groningen', lines: [
    ['T', 'Stond dat paard gisteren niet ergens anders?', 'suspicious'],
    ['A', 'Het Peerd van Ome Loeks staat op de rotonde bij het Mesdagplein. Nee, echt.', 'knowing'],
    ['T', 'Een paard met een eigen agenda.', 'impressed, dry']] },
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
  { id: 'pl-paddepoel', trigger: 'place:Winkelcentrum Paddepoel', lines: [
    ['T', 'Paddepoel. Dit is buitenland.', 'alarmed'],
    ['A', 'Je woont hier, Tammo.', 'dry'],
    ['T', 'Precies. Ik ben expat.', 'firm, deadpan']] },
  { id: 'pl-euroborg', trigger: 'place:Euroborg', lines: [
    ['A', 'Het stadion. De trots van het noorden.', 'proud'],
    ['T', 'Jij bent er nooit geweest.', 'teasing'],
    ['A', 'Vroeger hoorde ik het thuis als ze scoorden. De hele wijk trilde.', 'excited']] },
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
    ['T', 'Dat zie je nog steeds.', 'teasing'],
    ['A', 'Pas op, jij.', 'dry']] },
  { id: 'wk-korreweg', trigger: 'wijk:Korrewegwijk', lines: [
    ['T', 'De Korrewegwijk. Hier woonde ik op een zolder van vier vierkante meter.', 'nostalgic'],
    ['A', 'Met drie huisgenoten.', 'dry'],
    ['T', 'Het was heel gezellig. Noodgedwongen.', 'deadpan']] },
  { id: 'wk-oosterpark', trigger: 'wijk:Oosterparkwijk', lines: [
    ['A', 'De Oosterparkwijk. Hier stond vroeger het oude stadion.', 'nostalgic'],
    ['T', 'Mijn opa zei altijd dat ze daar harder zongen.', 'proud'],
    ['A', 'Je opa zei dat alles vroeger harder was.', 'teasing'],
    ['T', 'Behalve de wind. Die is hetzelfde gebleven.', 'dry']] },
  { id: 'wk-oosterpark-zolder', trigger: 'wijk:Oosterparkwijk', lines: [
    ['A', 'De Korenbloemstraat. Mijn oude zolder.', 'nostalgic'],
    ['T', 'Waar je niet rechtop kon staan.', 'dry'],
    ['A', 'Jij stond altijd scheef. Met twee bakken koffie.', 'teasing, warm'],
    ['T', 'Nu sta ik recht. Elf hoog.', 'proud, deadpan']] },
  { id: 'wk-oosterpark-stoep', trigger: 'wijk:Oosterparkwijk', lines: [
    ['T', 'Onze stoep.', 'fond, quiet'],
    ['A', 'Jij, ik en Rikus met zijn mengtafel van karton.', 'nostalgic, laughing'],
    ['T', 'Hij had toen al luisteraars.', 'dry'],
    ['A', 'Twee.', 'teasing'],
    ['T', 'Een trouw publiek.', 'deadpan']] },
  { id: 'wk-hereweg', trigger: 'wijk:Herewegbuurt', lines: [
    ['A', 'De Herewegbuurt. Huizen met een naam op het hek.', 'impressed'],
    ['T', 'Onze flat heeft ook een naam.', 'proud'],
    ['A', '"House of Groningen" is geen naam. Dat is een folder.', 'dry, laughing']] },
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
  { id: 'wk-ebbinge', trigger: 'wijk:Ebbingekwartier', lines: [
    ['A', 'Het Ebbingekwartier. Hier wilde ik vroeger wonen.', 'wistful'],
    ['T', 'En nu?', 'curious'],
    ['A', 'Nu kan ik de koffie hier niet eens betalen.', 'dry, laughing']] },
  { id: 'wk-akwartier', trigger: 'wijk:A-kwartier', lines: [
    ['T', 'Het A-kwartier. Hier fiets je alleen als je weet waar je heen moet.', 'dry'],
    ['A', 'En als je het niet weet?', 'teasing'],
    ['T', 'Dan kom je bij een kroeg uit.', 'deadpan']] },
  { id: 'wk-station', trigger: 'wijk:Stationsgebied', lines: [
    ['A', 'Moet je die fietsers zien. Die gaan harder dan wij.', 'amused'],
    ['T', 'Ze moeten een trein halen.', 'dry'],
    ['A', 'Ze moeten altijd een trein halen.', 'laughing']] },
  { id: 'wk-zeehelden', trigger: 'wijk:Zeeheldenbuurt', lines: [
    ['T', 'De Zeeheldenbuurt. Hier heeft iedereen een bakfiets.', 'dry'],
    ['A', 'En een mening over de bakfiets van de buren.', 'teasing']] },
  { id: 'wk-noorderplantsoen', trigger: 'wijk:Noorderplantsoenbuurt', lines: [
    ['A', 'Hier woonde Rikus. Op een kamer zonder ramen.', 'nostalgic, amused'],
    ['T', 'Voor de akoestiek, zei hij.', 'dry'],
    ['A', 'Voor de huur.', 'deadpan']] },
  { id: 'wk-professoren', trigger: 'wijk:Professorenbuurt', lines: [
    ['T', 'Hier heb ik ooit kranten bezorgd.', 'nostalgic, dry'],
    ['A', 'En?', 'curious'],
    ['T', 'Ze hadden er al drie. Allemaal gelezen.', 'deadpan']] },
  { id: 'wk-westerhaven', trigger: 'wijk:Westerhaven', lines: [
    ['A', 'De Westerhaven. Hier parkeer ik nooit meer.', 'firm'],
    ['T', 'Waarom niet?', 'curious'],
    ['A', 'Ik ben mijn fiets hier eens drie uur kwijt geweest.', 'indignant, laughing'],
    ['T', 'Hij stond er gewoon.', 'dry'],
    ['A', 'Op een andere verdieping, Tammo.', 'exasperated']] },

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
  // just moved in (the opening): the flat in Paddepoel is new
  { id: 'id-verhuisd', trigger: 'idle', until: 'H2', lines: [
    ['A', 'Ons eigen huis. Nou ja, van de verhuurder.', 'happy, a bit shy'],
    ['T', 'Met een lift.', 'proud'],
    ['A', 'Dat is de vierde keer dat je die lift noemt.', 'teasing'],
    ['T', 'Ik heb nog nooit een lift gehad.', 'deadpan, sincere']] },
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
    ['T', 'Ik heb dromen, Tessa. Ze zijn rond en gepaneerd.', 'dreamy'],
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
    ['T', 'Kijk maar in de Diepenring. Daar liggen de reserves.', 'matter-of-fact']] },
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
    ['T', 'Suiker uit Hoogkerk kan het niet zijn. Dat is pas in september.', 'thoughtful'],
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
    ['A', 'Volgende zomer is het weer Bloemetjesmarkt. De hele binnenstad vol plantjes.', 'excited'],
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
    ['A', 'Kiezelweek. Ze zijn nieuw hier.', 'warm'],
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

  // Nachtstreek and its regulars

  // the Fjord Frituur (Tessa's dream) and the Eierbal

  // the romance, in steps (Tammo never says it before H18)

  // after the story: September, the Fjord Frituur

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
