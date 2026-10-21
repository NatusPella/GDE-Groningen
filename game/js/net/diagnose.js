// Samen spelen (#95): "Verbinding testen". Meet in gewone taal wat er tussen jou en je medespeler kan misgaan:
// internet, openbare STUN-servers, signaleringsbrokers, UPnP op je router, een vrije poort en (indicatief) het NAT-type.
// Pure logica met inspuitbare metingen (env), zodat alles zonder netwerk getest wordt; de echte metingen staan in
// net/diagnoseenv.js (browser) en desktop/coopcore.cjs (UPnP, poort). Het foutrapport maskeert IP-adressen en codes.

export const STATUS = { OK: 'ok', LETOP: 'let-op', MIS: 'mis', SLA_OVER: 'overgeslagen' };

const metTijdslimiet = (p, ms) => new Promise((res) => {
  let klaar = false;
  const t = setTimeout(() => { if (!klaar) { klaar = true; res({ fout: 'time-out' }); } }, ms);
  Promise.resolve().then(p).then((v) => { if (!klaar) { klaar = true; clearTimeout(t); res(v || {}); } }, (e) => { if (!klaar) { klaar = true; clearTimeout(t); res({ fout: String((e && e.message) || e) }); } });
});

// env: { online(): bool, brokers(): {bereikt, totaal}, stun(): {bereikt, totaal, poorten: [..]}, upnp(): {ok, reason} | null, poort(): {ok, poort} | null }
// Een ontbrekende meting (bijvoorbeeld UPnP in de browser) wordt overgeslagen.
export async function meet(env, { limiet = 9000 } = {}) {
  const m = { online: true, brokers: null, stun: null, upnp: null, poort: null, gemeten: Date.now() };
  try { m.online = env.online ? env.online() !== false : true; } catch (e) { m.online = true; }
  const doe = async (naam) => { if (typeof env[naam] === 'function') m[naam] = await metTijdslimiet(env[naam], limiet); };
  await Promise.all(['brokers', 'stun', 'upnp', 'poort'].map(doe));
  return m;
}

const item = (id, titel, status, tekst, tip = '') => ({ id, titel, status, tekst, tip });

// De uitslag in gewone taal: per punt een status, een zin en bij een probleem een tip.
export function beoordeel(m) {
  const items = [];
  const brokersOk = !!(m.brokers && m.brokers.bereikt > 0);
  const stunOk = !!(m.stun && m.stun.bereikt > 0);
  const internetOk = m.online && (brokersOk || stunOk);
  if (!m.online) items.push(item('internet', 'Internet', STATUS.MIS, 'Dit apparaat meldt dat er geen internet is.', 'Controleer je wifi of netwerkkabel. Zonder internet kun je alleen samen spelen met het adres (IP) op hetzelfde thuisnetwerk.'));
  else if (!internetOk) items.push(item('internet', 'Internet', STATUS.MIS, 'Er kwam geen enkel antwoord van de testservers.', 'Je internet doet het misschien niet, of een firewall, VPN of werknetwerk blokkeert het spel. Zet een VPN uit of probeer een ander netwerk, bijvoorbeeld de hotspot van je telefoon.'));
  else items.push(item('internet', 'Internet', STATUS.OK, 'Je internet werkt.'));

  if (!m.stun) items.push(item('stun', 'Openbare servers om elkaar te vinden (STUN)', STATUS.SLA_OVER, 'Niet getest.'));
  else if (m.stun.fout || !stunOk) items.push(item('stun', 'Openbare servers om elkaar te vinden (STUN)', STATUS.MIS, 'Geen enkele STUN-server antwoordde.', 'Zonder deze servers kan een kamercode vaak geen rechtstreekse verbinding maken. Zet een VPN uit, probeer een ander netwerk, of gebruik het IP-adres als jullie op hetzelfde netwerk zitten.'));
  else if (m.stun.bereikt < m.stun.totaal) items.push(item('stun', 'Openbare servers om elkaar te vinden (STUN)', STATUS.OK, `${m.stun.bereikt} van de ${m.stun.totaal} servers antwoordden. Dat is genoeg.`));
  else items.push(item('stun', 'Openbare servers om elkaar te vinden (STUN)', STATUS.OK, `Alle ${m.stun.totaal} servers antwoordden.`));

  if (!m.brokers) items.push(item('brokers', 'Servers voor de kamercode', STATUS.SLA_OVER, 'Niet getest.'));
  else if (m.brokers.fout || !brokersOk) items.push(item('brokers', 'Servers voor de kamercode', STATUS.MIS, 'Geen enkele server voor de kamercode antwoordde.', 'Zonder deze servers werkt de kamercode niet. Probeer later opnieuw, zet een VPN uit of gebruik het IP-adres.'));
  else items.push(item('brokers', 'Servers voor de kamercode', STATUS.OK, `${m.brokers.bereikt} van de ${m.brokers.totaal} servers bereikbaar.`));

  if (m.upnp === null) items.push(item('upnp', 'Automatisch een poort openen (UPnP)', STATUS.SLA_OVER, 'Alleen te testen in de app voor Windows en macOS.'));
  else if (m.upnp.ok) items.push(item('upnp', 'Automatisch een poort openen (UPnP)', STATUS.OK, 'Je router opende een poort. Een medespeler buiten je netwerk kan je met het IP-adres bereiken.'));
  else if (m.upnp.reason === 'cgnat') items.push(item('upnp', 'Automatisch een poort openen (UPnP)', STATUS.LETOP, 'Je internetaanbieder deelt één adres met meerdere huizen.', 'Het IP-adres werkt dan alleen op hetzelfde netwerk. Gebruik de kamercode.'));
  else items.push(item('upnp', 'Automatisch een poort openen (UPnP)', STATUS.LETOP, 'Je router opent geen poort automatisch.', 'Zet UPnP aan in je router, of gebruik de kamercode. Op hetzelfde netwerk werkt het IP-adres altijd.'));

  if (m.poort === null) items.push(item('poort', 'Een vrije poort in dit apparaat', STATUS.SLA_OVER, 'Alleen te testen in de app voor Windows en macOS.'));
  else if (m.poort.ok) items.push(item('poort', 'Een vrije poort in dit apparaat', STATUS.OK, 'Het spel kan een poort openen. Windows kan daarbij vragen of "GDE Groningen" het netwerk mag gebruiken: kies Toestaan (privé).'));
  else items.push(item('poort', 'Een vrije poort in dit apparaat', STATUS.MIS, 'Het spel kon geen poort openen.', 'Sluit andere programma\'s die veel netwerk gebruiken, of controleer je firewall of beveiligingsprogramma.'));

  const poorten = (m.stun && m.stun.poorten) || [];
  const verschillend = new Set(poorten).size;
  if (!stunOk) items.push(item('nat', 'Soort thuisnetwerk (indicatief)', STATUS.SLA_OVER, 'Kon niet bepaald worden.'));
  else if (verschillend > 1) items.push(item('nat', 'Soort thuisnetwerk (indicatief)', STATUS.LETOP, 'Je router geeft elke verbinding een ander adres (streng NAT). Een rechtstreekse verbinding met de kamercode lukt dan vaak niet.', 'Gebruik het IP-adres, of probeer de hotspot van je telefoon. Is de ander op hetzelfde netwerk, dan werkt het IP-adres altijd.'));
  else items.push(item('nat', 'Soort thuisnetwerk (indicatief)', STATUS.OK, 'Je router lijkt rechtstreekse verbindingen toe te laten.'));

  const kamer = internetOk && brokersOk && stunOk;
  const direct = !!(m.upnp && m.upnp.ok) && !!(m.poort && m.poort.ok);
  const mis = items.filter((i) => i.status === STATUS.MIS).length;
  const letop = items.filter((i) => i.status === STATUS.LETOP).length;
  const samenvatting = !internetOk ? 'Er is geen werkende verbinding gevonden. Lees de tips hieronder.'
    : kamer && !letop ? 'Alles ziet er goed uit: een kamercode zou moeten werken.'
      : kamer ? 'De kamercode zou moeten werken, met een paar aandachtspunten.'
        : direct ? 'De kamercode werkt waarschijnlijk niet, het IP-adres wel.'
          : mis ? 'Er is iets mis. Lees de tips hieronder.' : 'Let op de tips hieronder.';
  return { items, samenvatting, kamer, direct };
}

// ---------------------------------------------------------------- privacy: IP-adressen en codes weg uit het rapport
export function maskeer(tekst) {
  return String(tekst ?? '')
    .replace(/\bGDE2-\S+/gi, '[koppelcode]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g, '[ip-adres]')
    .replace(/\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{1,4}\b/gi, '[ip-adres]')
    .replace(/\b[A-Z0-9]{4,6}-[A-Z0-9]{4,12}\b/g, '[kamercode]');
}

// Het verbindingslog: korte regels zonder adressen of codes; blijft in het geheugen.
export class VerbindingsLog {
  constructor(max = 300, klok = () => Date.now()) { this.max = max; this.klok = klok; this.regels = []; this.t0 = klok(); }
  add(soort, tekst = '') {
    const t = Math.round((this.klok() - this.t0) / 100) / 10;
    this.regels.push({ t, soort: String(soort), tekst: maskeer(tekst).slice(0, 200) });
    if (this.regels.length > this.max) this.regels.shift();
  }
  tekst() { return this.regels.map((r) => `${r.t.toFixed(1)} s  ${r.soort}${r.tekst ? ': ' + r.tekst : ''}`).join('\n'); }
  leeg() { this.regels = []; this.t0 = this.klok(); }
}

// Het foutrapport dat een speler kan plakken in een bericht. Geen IP-adressen, geen codes.
export function foutrapport({ beoordeling = null, log = null, versie = '', platform = '', stand = '' } = {}) {
  const r = ['GDE Groningen: verbindingsrapport (samen spelen)', `Spelversie: ${versie || 'onbekend'}`, `Apparaat: ${platform || 'onbekend'}`];
  if (stand) r.push(`Stand: ${stand}`);
  if (beoordeling) {
    r.push('', `Uitslag: ${beoordeling.samenvatting}`);
    for (const i of beoordeling.items) r.push(`- ${i.titel}: ${i.status}. ${i.tekst}${i.tip ? ' Tip: ' + i.tip : ''}`);
  }
  r.push('', 'Verbindingslog:', log && log.regels.length ? log.tekst() : '(leeg)');
  return maskeer(r.join('\n')) + '\n';
}

// Het enige gedeelde logboek van deze sessie (lobbyui.js en coopnet.js schrijven erin)
export const verbindingslog = new VerbindingsLog();
