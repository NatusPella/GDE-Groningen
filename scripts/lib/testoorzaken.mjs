// Oorzaken van tests die instabiel waren of onterecht faalden, bij elkaar zodat het testrapport per item kan zeggen
// waarom (en wat eraan gedaan is). Sleutel = item-id van test_all.mjs. soort:
//   bug       echte fout in de spelcode, met de test als bewijs
//   verouderd de test of een gegenereerd bestand paste niet meer bij de code of de wereld (geen codefout)
//   instabiel de uitkomst hangt van timing of belasting af
//   omgeving  de machine of de data ontbreekt (geen fout in de code)
// Voeg een regel toe bij elke test die je repareert of als instabiel herkent; haal hem weg als de oorzaak vervalt.
export const OORZAKEN = {
  'voice_coverage': { soort: 'bug', tekst: 'dead_code.mjs haalde `export` weg bij JOB_LINES; voicelines_collect zocht op die tekst en crashte (marker not found). Zoekt nu ook zonder export.' },
  'test:steam_test.mjs': { soort: 'verouderd', tekst: 'steam/achievements.json was niet opnieuw gegenereerd na nieuwe prestaties en STEAM-KLAAR telde 186 in plaats van 187.' },
  'test:water_patch_dry_test.mjs': { soort: 'verouderd', tekst: 'markDryRoad vraagt het water sinds 4d0b0e43 met waterGrid.query op; de nepkaart van de test had die methode niet.' },
  'test:bus_route_test.mjs': { soort: 'bug', tekst: 'overlayhold.js startte bij het importeren een setInterval van 150 ms die Node open hield: de test was klaar maar het proces sloot niet af (TIMEOUT). Timer is nu unref\'d.' },
  'test:flat_tire_test.mjs': { soort: 'bug', tekst: 'zelfde als bus_route_test: de overlayhold-timer hield het proces open.' },
  'test:motorbike_test.mjs': { soort: 'bug', tekst: 'zelfde als bus_route_test: de overlayhold-timer hield het proces open.' },
  'test:paint_test.mjs': { soort: 'bug', tekst: 'zelfde als bus_route_test: de overlayhold-timer hield het proces open.' },
  'test:placement_audit_test.mjs': { soort: 'bug', tekst: 'zelfde als bus_route_test: de overlayhold-timer hield het proces open.' },
  'test:water_layers_test.mjs': { soort: 'bug', tekst: 'zelfde als bus_route_test: de overlayhold-timer hield het proces open.' },
  'test:country_vehicles_test.mjs': { soort: 'verouderd', tekst: 'Eelde ligt in Drenthe, buiten de provincietegels (nu Haren); het procedurele platteland bestaat alleen buiten de data (#124), dus de boerderijtrekkers komen van de schuren van de tegels; de grasremtest gebruikte de stadskaart als groundMap en een te kort stuk gras/te korte rit.' },
  'test:facilities_test.mjs': { soort: 'verouderd', tekst: 'de test laadde de tegels rond de respawnplekken niet in zoals het spel doet; 39/50 auto\'s was ontbrekende residentie, nu 48/50.' },
  'test:ommelandplace_test.mjs': { soort: 'instabiel', tekst: 'steekproef van 12 echte horecaplekken viel met 7/12 net onder de 60% (een café zonder autoweg binnen 80 m krijgt terecht geen deur); steekproef is nu 40.' },
  'test:net_brokers_test.mjs': { soort: 'instabiel', tekst: 'de PeerJS-terugval sprong na 60 ms in als de broker onder belasting nog niet "ok" was; nu 300 ms.' },
  'test:sunrules_test.mjs': { soort: 'verouderd', tekst: 'muggingrules.isNight is in 43ffdf95 weggehaald (ongebruikt); de test riep hem nog aan. De regel is weg, nightFactor blijft getest.' },
  'test:import_cycles_test.mjs': { soort: 'verouderd', tekst: 'groter dan de limiet door nieuwe imports; op de nieuwste main weer binnen de limiet (door andere commits, niet nader onderzocht).' },
  'test:edgescene_test.mjs': { soort: 'verouderd', tekst: 'overlayhold.js riep document.querySelector aan op de nepdocument van de tests; op de nieuwste main opgelost door andere commits (niet nader onderzocht).' },
  'test:activiteitenspots_test.mjs': { soort: 'verouderd', tekst: 'op de nieuwste main groen; de eerdere fout (19 activiteiten) was al verholpen door andere commits (niet nader onderzocht).' },
  'test:vehicledoors3d_test.mjs': { soort: 'verouderd', tekst: 'op de nieuwste main groen (andere commits; niet nader onderzocht).' },
};
