// De betekenisnamen van het spel naar Phosphor-namen (ADR 0041). Schermen vragen om een
// betekenis (icoon('geld')), nooit om een bestand. Alleen data, zodat scripts/ui/phosphor_kies.mjs
// en scripts/icons_test.mjs dit bestand kunnen lezen zonder DOM. Nieuw icoon nodig? Zet hier
// een regel bij en draai `node scripts/ui/phosphor_kies.mjs <pakketmap>`; dat bundelt de SVG's
// in phosphordata.js.
export const ICON_MAP = {
  // Pauzemenu en hoofdmenu
  hervat: 'play', opslaan: 'floppy-disk', laden: 'folder-open', herstart: 'arrow-counter-clockwise',
  hulp: 'question', thuis: 'house-simple', stop: 'x-circle', duif: 'bird', menu: 'list',
  uitgang: 'sign-out', terug: 'caret-left', volgende: 'caret-right', zoek: 'magnifying-glass',
  kaart: 'map-trifold', overzicht: 'house-line', todo: 'flag', verhaal: 'book-open', garage: 'garage',
  fotos: 'camera', prestaties: 'trophy', loopbaan: 'chart-line-up', visboek: 'fish-simple',
  boerderij: 'barn', streken: 'dice-five', spel: 'game-controller', instellingen: 'sliders-horizontal',
  besturing: 'keyboard', geluid_uit: 'speaker-x', geluid: 'speaker-high', spullen: 'backpack',
  telefoon: 'device-mobile', solo: 'user', nieuw: 'plus', nieuws: 'newspaper', over: 'info',
  spelers: 'users-three', veroverd: 'flag-pennant', samen: 'users',
  // Waarden en toestand
  hoogte: 'mountains', geld: 'coins', tijd: 'clock', datum: 'calendar-blank', waarschuwing: 'warning',
  vinkje: 'check', kruis: 'x', info: 'info', vraag: 'question', sleutel: 'key', slot: 'lock-simple',
  slot_open: 'lock-simple-open', plek: 'map-pin', doel: 'crosshair', ster: 'star', hart: 'heart',
  ehbo: 'first-aid-kit', energie: 'lightning', brandstof: 'gas-pump', dorst: 'beer-stein',
  zon: 'sun', maan: 'moon', wolk: 'cloud', regen: 'cloud-rain', wind: 'wind', temperatuur: 'thermometer',
  pijl_omhoog: 'arrow-up', pijl_omlaag: 'arrow-down', pijl_links: 'arrow-left', pijl_rechts: 'arrow-right',
  kompas: 'compass', navigatie: 'navigation-arrow', route: 'path', bord: 'signpost',
  // Voertuigen
  auto: 'car', bus: 'bus', trein: 'train', tram: 'tram', boot: 'boat', zeilboot: 'sailboat',
  vliegtuig: 'airplane', fiets: 'bicycle', scooter: 'moped', motor: 'motorcycle', tractor: 'tractor',
  vrachtwagen: 'truck', taxi: 'taxi', politieauto: 'police-car', brandweer: 'fire-truck',
  helikopter: 'drone', afslag_rechts: 'arrow-bend-up-right', afslag_links: 'arrow-bend-up-left',
  ambulance: 'ambulance', parachute: 'parachute', stuur: 'steering-wheel', toerental: 'gauge',
  // Wereld en werk
  oogst: 'grains', gewas: 'plant', boom: 'tree', blad: 'leaf', koe: 'cow', paard: 'horse', vis: 'fish',
  ei: 'egg', wortel: 'carrot', water: 'drop', windmolen: 'windmill', winkel: 'storefront', mand: 'basket',
  tas: 'shopping-bag', kar: 'shopping-cart', pakket: 'package', gereedschap: 'wrench', hamer: 'hammer',
  schep: 'shovel', gebouw: 'buildings', bank: 'bank', kerk: 'church', fabriek: 'factory',
  ziekenhuis: 'hospital', camera: 'camera', verrekijker: 'binoculars', tent: 'tent', eten: 'fork-knife',
  koffie: 'coffee', pizza: 'pizza', bier: 'beer-stein', sigaret: 'cigarette', pil: 'pill',
  // Spelers, praten, regels
  speler: 'user', bericht: 'chat-circle-dots', tekst: 'chat-text', mail: 'envelope-simple', bel: 'bell',
  belletje_uit: 'bell-slash', politie: 'siren', schild: 'shield', mes: 'knife', zwaard: 'sword',
  doodshoofd: 'skull', handdruk: 'handshake', geldhand: 'hand-coins', bon: 'receipt', rol: 'scroll',
  notitie: 'note-pencil', klembord: 'clipboard-text', lijst: 'list-checks', puntjes: 'dots-three',
  rooster: 'squares-four', pen: 'pencil-simple', prullenbak: 'trash', oog: 'eye', oog_uit: 'eye-slash',
  kroon: 'crown-simple', medaille: 'medal', cadeau: 'gift', vlag: 'flag-checkered',
  // Muziek en media
  muziek: 'music-notes', koptelefoon: 'headphones', afspelen: 'play', pauze: 'pause', vooruit: 'fast-forward',
  // Netwerk en systeem
  wifi: 'wifi-high', wifi_uit: 'wifi-slash', stekker: 'plug', aan_uit: 'power', wereldbol: 'globe-hemisphere-east',
  download: 'download-simple', upload: 'upload-simple', plus: 'plus', min: 'minus',
  zandloper: 'hourglass', dobbelsteen: 'dice-five', raket: 'rocket',
  schilderij: 'palette', kleding: 't-shirt', bril: 'sunglasses', laars: 'boot', zwemmen: 'waves',
  // Gevulde varianten (Phosphor 'fill') voor een aangezette toestand, zoals een favoriet.
  ster_vol: 'star-fill', hart_vol: 'heart-fill',
  // Light sims (#985): de strook vraagt om deze betekenissen
  ronde: 'arrow-clockwise', plaats: 'trophy', tempo: 'speedometer', worp: 'baseball', par: 'golf', stand: 'chart-bar', punt: 'check-circle', rally: 'arrows-left-right',
  golf: 'golf', kart: 'car-profile', zwembad: 'swimming-pool', klimmen: 'hand-grabbing', skate: 'sneaker', padel: 'racquet', wandeling: 'person-simple-hike',
  reuzenrad: 'circle-notch', krant: 'newspaper', bezorger: 'moped', bak: 'chef-hat', stempel: 'stamp',
  taart: 'cake', tandwiel: 'gear-six', anker: 'anchor-simple', idee: 'lightbulb', kookpot: 'cooking-pot',
  lopen: 'person-simple-walk', rennen: 'person-simple-run', bagage: 'backpack', hand: 'hand',
  // Boerderij (#985): de zeven veldstanden (farmstatus.js), dezelfde taal als de gebiedstoestanden op de kaart
  veld_braak: 'minus', veld_stoppel: 'hourglass', veld_geploegd: 'waves', veld_zaailing: 'plant', veld_groeiend: 'leaf', veld_bijna: 'grains', veld_rijp: 'flag-checkered',
  // Kaart en minikaart (20-11): de markers tekenen hun betekenis uit Phosphor (mapglyphs.js)
  schaar: 'scissors', burger: 'hamburger', stoel: 'armchair', spuit: 'spray-bottle', oplegger: 'truck-trailer', rechter: 'gavel',
  lagen: 'stack', podium: 'microphone-stage', studie: 'graduation-cap', promotie: 'megaphone', kaartje: 'ticket',
};
// Maten (px) voor de ds-tokens en het gewicht per maat: regular, bold bij 16 px en kleiner.
export const ICON_SIZES = { s: 16, m: 20, l: 24, xl: 32 };
export const ICON_BOLD_BELOW = 17;
