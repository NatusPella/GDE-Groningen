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
  'height_audit': { soort: 'verouderd', tekst: 'de audit telde ook gemeten (3D BAG) en door een mapper opgegeven hoogtes als uitschieter (650 gebouwen, 0,17%), terwijl buildingcap.js die bewust laat staan (0c73cf55); hij zoekt nu alleen geraden hoogtes en kent dezelfde slanke typen (kerk, kapel, ...) als de begrenzing. Gevolg: de audit is minder streng voor gemeten hoogtes.' },
  'placement_audit-provincie': { soort: 'bug', tekst: 'groenvlakken die op de tegelrand worden afgeknipt konden geheel in het water van de tegel vallen (21 groene stroken over open water, #185); tileBlob laat ze nu weg (vereist een nieuwe stage).' },
  'drive_audit': { soort: 'bug', tekst: 'Rijstebrijgang (stad, 6,5 m breed in de kaart) heeft huizen op 1,48 m van het midden: een auto schampt het huis (botst). Voorlopig apart vermeld als smalle steeg in de audit; de kaart moet de echte breedte krijgen (issue).' },
  'electron:coop': { soort: 'omgeving', tekst: 'de testbank heeft meerdere Electron-sloten nodig; met 15+ sessies kreeg hij er 110 min geen (TIMEOUT van 20 min, daarna 110 min). Geen testfout: na sneller pollen (en de takeSlots van main) slaagt hij (ALLES OK). Onder volle belasting kan hij nog wachten; de limiet is 110 min.' },
  'seat_audit': { soort: 'verouderd', tekst: 'de sierdoppen op de wielen (cilinder met drie materiaalgroepen) telden als voorruit-glas (groep 1), waardoor de sport-stoelcheck de wielen als voorruit zag; de audit slaat meshes op de wielen nu over.' },
  'vaarnet_province_test': { soort: 'verouderd', tekst: 'game/vaarnet_fixes.json week op drie gatenclusters af van de audit op de huidige wereld; opnieuw gegenereerd met vaarnet.mjs --fixes.' },
  'terrain_audit': { soort: 'omgeving', tekst: 'er zijn geen AHN-rasters op deze machine (python scripts/world/fetch_ahn.py --province --fetch haalt open data op); de audit meldt SKIP, geen fout.' },
  'test:import_cycles_test.mjs': { soort: 'bug', tekst: 'coopscene.js importeerde cinematics.js en storytalk.js (beide in de grote cyclus) en trok zichzelf en samenpanel.js de cyclus in (125 tegen limiet 123). Die twee worden nu lui geladen via import(); de limiet bleef 123.' },
  'test:edgescene_test.mjs': { soort: 'verouderd', tekst: 'overlayhold.js riep document.querySelector aan op de nepdocument van de tests; op de nieuwste main opgelost door andere commits (niet nader onderzocht).' },
  'test:activiteitenspots_test.mjs': { soort: 'verouderd', tekst: 'op de nieuwste main groen; de eerdere fout (19 activiteiten) was al verholpen door andere commits (niet nader onderzocht).' },
  'test:vehicledoors3d_test.mjs': { soort: 'verouderd', tekst: 'op de nieuwste main groen (andere commits; niet nader onderzocht).' },
};
