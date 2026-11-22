// De radio in een voertuig (22-11, #988, ADR 0046): bij het instappen hoor je de zender die bij het voertuig past, en bij het
// uitstappen komt de wereldradio terug. Puur en node-veilig (geen DOM, geen opslag, geen audio): radio.js (de glue) wisselt de zender,
// settings.js bewaart wat de speler per voertuigsoort koos (`radioVehicle`, in gde-settings en niet in de save) en
// scripts/radiovehicle_test.mjs loopt alles in node.
//
// De regel: elke voertuigsoort heeft een geordende lijst voorkeurszenders; de eerste die nu te kiezen is (open: genoeg nummers, en een
// geheime zender alleen als hij gevonden is) wint. Een soort zonder eigen zender (gewone auto, fiets, politie, ambulance) laat de
// wereldradio zoals hij is. Heeft de speler in dat soort voertuig zelf een zender gekozen, dan wint die keuze. Wat de speler buiten
// het voertuig draait is een aparte stand (de laatste keuze in de wereld) en komt terug bij het uitstappen. Alle namen zijn verzonnen.
import { DEFAULT_CHANNEL } from './radiochannels.js';

// De voertuigsoorten voor de radio (grover dan de modellen): `prefs` is de volgorde van voorkeur, `follow` zegt dat de soort de
// wereldradio laat staan (geen eigen zender), `label` is de naam voor de docs en de melding.
export const RADIO_KINDS = Object.freeze({
  boer: { label: 'Trekker en landbouwmachine', prefs: ['wierde', 'ruis'] },
  luxe: { label: 'Sportwagen, suv en taxi', prefs: ['nachtjazz', 'nachtstreek'] },
  tokkie: { label: 'Fatbike, step, brommer, motor en opgevoerde auto', prefs: ['tokkie'] },
  // `soft`: zolang geen voorkeur open is blijft de wereldradio staan (geen G-Music als terugval): Veenvuur FM is nog Binnenkort
  zwaar: { label: 'Vrachtwagen, bestelbus en kluiswagen', prefs: ['veenvuur'], soft: true },
  ov: { label: 'Bus en trein', prefs: ['gmusic'] },
  boot: { label: 'Boot en zeilboot', prefs: ['noordkust', 'nachtstreek'] },
  lucht: { label: 'Helikopter en vliegtuig', prefs: ['gmusic'] },
  dienst: { label: 'Politie en ambulance', prefs: [], follow: true },
  auto: { label: 'Gewone auto, bestelbus en vrachtwagen', prefs: [], follow: true },
  fiets: { label: 'Gewone fiets', prefs: [], follow: true },
});
export const RADIO_KIND_IDS = Object.keys(RADIO_KINDS);

// De modelnamen (vehicle.js, vehiclenames.js) per soort. Een vlag op het voertuig (isBoat, isBike, ...) telt ook; een onbekend
// model valt terug op 'auto' (de wereldradio blijft staan).
const BY_NAME = {
  tractor: 'boer', quad: 'boer', maaidorser: 'boer', laadmachine: 'boer', trekkerlimo: 'boer',
  truck: 'zwaar', van: 'zwaar', cashvan: 'zwaar',
  sport: 'luxe', suv: 'luxe', taxi: 'luxe',
  scooter: 'tokkie', motor: 'tokkie', gokart: 'tokkie',
  bus: 'ov', midibus: 'ov', tram: 'ov', trein: 'ov',
  boat: 'boot',
  heli: 'lucht', plane: 'lucht',
  police: 'dienst', ambulance: 'dienst',
  bike: 'fiets',
};

// Welke soort is dit voertuig? `v` is een voertuig uit de wereld (of een nagebootst object met model.name en vlaggen).
export function radioKindOf(v) {
  if (!v) return null;
  const m = v.model || {};
  const name = String(m.name || '');
  if (v.isHeli || v.isPlane) return 'lucht';
  if (v.isBoat) return 'boot';
  if (v.isPolice || v.isAmbulance || v._mount === 'horse') return 'dienst';
  if (v.isBus) return 'ov';
  if (v.isBike || name === 'bike') return m.fat ? 'tokkie' : 'fiets';
  if (v.isScooter) return 'tokkie';
  if (m.tokkie) return 'tokkie';
  return BY_NAME[name] || 'auto';
}

// Het besluit voor een soort. `open`: de zenders die nu te kiezen zijn (radiochannels.js openChannels); een geheime of 'binnenkort'-zender
// staat daar niet in en wordt dus nooit gekozen. `remembered`: wat de speler per soort zelf koos. Geeft { channel, source }:
// source 'onthouden' (eigen keuze), 'voorkeur' (de tabel), 'terugval' (G-Music), of 'wereld' (de soort laat de wereldradio staan: channel is null).
export function vehicleChannel(kind, open, remembered = {}) {
  const k = RADIO_KINDS[kind];
  if (!k) return { channel: null, source: 'wereld' };
  const mine = remembered && remembered[kind];
  if (typeof mine === 'string' && open.includes(mine)) return { channel: mine, source: 'onthouden' };
  if (k.follow) return { channel: null, source: 'wereld' };
  const pref = k.prefs.find((id) => open.includes(id));
  if (pref) return { channel: pref, source: 'voorkeur' };
  if (k.soft) return { channel: null, source: 'wereld' };
  return { channel: open.includes(DEFAULT_CHANNEL) ? DEFAULT_CHANNEL : (open[0] || DEFAULT_CHANNEL), source: 'terugval' };
}

// --- de stand: buiten (wereldradio) en in een voertuig --------------------------------------------------------------------------
// state: { kind: null | soort, vehicle: id | null }. De wereldradio staat niet in deze stand: radio.js houdt hem apart (de laatste keuze
// in de wereld), zodat een zender die het voertuig koos nooit als wereldkeuze wordt bewaard.
export const outsideState = () => ({ kind: null, vehicle: null });

// Instappen: geeft { state, channel, source }; channel is de zender om naartoe te schakelen, of null (niets doen).
export function enterVehicle(state, vehicle, open, remembered = {}) {
  const kind = radioKindOf(vehicle);
  const d = vehicleChannel(kind, open, remembered);
  return { state: { kind, vehicle: (vehicle && vehicle.id) || null }, channel: d.channel, source: d.source };
}

// Uitstappen: de wereldradio komt terug. `world`: de laatste keuze in de wereld; is die niet (meer) te kiezen, dan G-Music.
export function exitVehicle(state, world, open) {
  const channel = typeof world === 'string' && open.includes(world) ? world : (open.includes(DEFAULT_CHANNEL) ? DEFAULT_CHANNEL : (open[0] || DEFAULT_CHANNEL));
  return { state: outsideState(), channel };
}

// De speler kiest in het voertuig zelf een zender: die keuze geldt voortaan voor deze soort. Buiten een voertuig verandert er niets.
export function rememberChoice(remembered, state, channel, open) {
  if (!state || !state.kind || !open.includes(channel)) return remembered;
  if (remembered && remembered[state.kind] === channel) return remembered;
  return { ...(remembered || {}), [state.kind]: channel };
}

// Een instelling uit gde-settings (of een kapot bestand): alleen bekende soorten met een tekst als zender. Nooit een fout.
export function cleanRemembered(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const k of RADIO_KIND_IDS) if (typeof raw[k] === 'string' && raw[k].length <= 24) out[k] = raw[k];
  return out;
}

// --- de melding bij het instappen en bij een wissel ---------------------------------------------------------------------------------
// Bovenaan 'zendernaam · DJ-naam', eronder de lopende titel en artiest als die bekend zijn (anders de ondertitel van de zender).
// Elke regel blijft kort (de kaart in de HUD kapt af, en de tekst moet ook zonder afkappen te lezen zijn).
export const NOTICE_MAX = { header: 34, title: 38, artist: 34 };
export const clip = (s, n) => {
  const t = String(s == null ? '' : s).trim();
  return t.length <= n ? t : t.slice(0, Math.max(1, n - 1)).trimEnd() + '…';
};
export function radioNotice(chan, track = null) {
  if (!chan) return null;
  const header = clip(`${chan.name} · ${chan.dj}`, NOTICE_MAX.header);
  const has = track && track.title;
  return {
    station: header,
    title: clip(has ? track.title : chan.sub, NOTICE_MAX.title),
    artist: has ? clip(track.artist || '', NOTICE_MAX.artist) : '',
    kind: 'zender',
  };
}

// De korte naam in de voertuig-HUD (een chip bij de snelheidsmeter).
export const hudName = (chan) => (chan ? clip(chan.name, 18) : '');

// --- Samen spelen --------------------------------------------------------------------------------------------------------------------
// In een gedeeld voertuig geldt de zender van de bestuurder voor het voertuig: de bestuurder stapt in en krijgt zijn voertuigzender
// (`enterVehicle` hierboven, met zijn eigen onthouden keuze); een passagier volgt hem (radiochannels.js channelForPlayer, met die
// voertuigzender als `start` zolang de bestuurder nog niets anders draait). De zender zelf is lokaal per speler: er gaat niets over het net.
