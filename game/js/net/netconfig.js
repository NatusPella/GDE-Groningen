// Samen spelen (#95): alle openbare servers die de kamercode-route kan gebruiken,
// in één bestand. De eigenaar heeft dit goedgekeurd (comment op #95): het IP-adres
// gaat naar een openbare STUN-server en versleutelde signalering naar openbare
// brokers, alleen na een bevestiging van de speler (toestemmingsscherm in lobby.js). Er is geen
// telemetrie en geen account. Pas de lijsten hier aan; tests gebruiken ze nooit.
// Controleer de adressen vóór een release: openbare diensten komen en gaan.

// WebRTC: openbare STUN-servers (gratis, zonder account), meerdere vaste opties.
export const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
  'stun:global.stun.twilio.com:3478',
];

// Signalering via openbare brokers (in de stijl van Trystero). Alles wat erover gaat
// is versleuteld met de kamercode (net/sigcrypto.js); een broker ziet alleen blobs.
export const TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.files.fm:7073/announce',
];
export const MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081',
];

// Alleen als terugval wanneer geen enkele broker bereikbaar is.
export const PEERJS = { host: '0.peerjs.com', port: 443, path: '/', key: 'peerjs', secure: true };

export const TIMEOUTS = {
  broker: 6000,       // ms tot een broker als onbereikbaar telt
  fallbackAfter: 8000, // ms zonder een werkende broker: PeerJS-terugval proberen
  gather: 5000,       // ms wachten op ICE-kandidaten
  connect: 30000,     // ms tot het koppelen mislukt (de gast vanaf het zoeken van de host; de host vanaf het antwoord van de gast)
  wait: 900000,       // ms dat een uitnodiging openstaat zolang er niemand de code gebruikt (tijd om de code door te geven)
};
export const ICE_SERVERS = STUN_SERVERS.map((urls) => ({ urls }));
