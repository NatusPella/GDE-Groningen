// Samen spelen (#95): het uitnodigscherm als toestandsmachine, in de stijl van
// Watch Dogs 2: je kunt op elk moment iemand uitnodigen (host) of aansluiten met
// een code (gast), vanuit het pauzemenu. Er is geen keuze per save of bij het
// starten; iedereen houdt zijn eigen voortgang. De host speelt Tammo, de gast Tessa.
// Pure logica (geen DOM): toestand en Nederlandse teksten; lobbyui.js tekent.
//
// Twee routes, naast elkaar:
//  - 'kamer'  : kamercode, WebRTC met openbare STUN-servers en versleutelde signalering
//               via openbare brokers (net/rtcroom.js, net/brokers.js). Werkt ook in de browser.
//  - 'direct' : adres:poort van de host met UPnP, rechtstreeks, zonder servers van anderen
//               (desktop/coopcore.cjs). Alleen in de desktop-app.
// Nooit stilzwijgend verbinden: elke route begint met een toestemmingsscherm.

import { REASON_TEXT } from './net/protocol.js';
import { parseRoom } from './net/sigcrypto.js';
import { parseCode } from './net/pairing.js';

export const ROLES = { HOST: 'host', GAST: 'gast' };
export const ROUTES = { KAMER: 'kamer', DIRECT: 'direct' };

export const CONSENT_TEXT = {
  kamer: 'Voor samen spelen wordt je IP-adres gedeeld met je medespeler en worden openbare servers gebruikt om elkaar te vinden.',
  direct: 'Voor samen spelen wordt je IP-adres gedeeld met je medespeler. Er worden geen servers van anderen gebruikt; je router opent een poort die sluit zodra je stopt.',
};
export const CONSENT_DETAIL = {
  kamer: 'Je kamercode versleutelt wat er via die servers gaat: zij zien alleen onleesbare berichten. Er wordt verder niets verstuurd.',
  direct: 'Iedereen met de code kan zolang de poort open staat proberen te verbinden. Geef de code alleen aan je medespeler.',
};

// Wat voor invoer is dit? Een kamercode of een adres/code voor de directe route.
export function classifyInput(text) {
  const t = String(text || '').trim();
  if (!t) return { ok: false, reason: 'Er is niets ingevoerd.' };
  if (/^GDE2/i.test(t.replace(/\s+/g, ''))) {
    const c = parseCode(t);
    return c.ok ? { ok: true, route: ROUTES.DIRECT, code: t.replace(/\s+/g, '') } : c;
  }
  const r = parseRoom(t);
  return r.ok ? { ok: true, route: ROUTES.KAMER, room: r.room } : { ok: false, reason: 'Dit is geen kamercode en geen koppelcode van dit spel.' };
}

// caps: { direct (desktop-app), rtc (WebRTC beschikbaar), laatsteCode, start?: 'verbroken', rol? }
export function createLobby(caps = {}) {
  return {
    step: caps.start || 'start', rol: caps.rol || null, route: null, invoer: null,
    code: '', lanCode: '', note: '', error: '', reason: null, status: null, partner: null,
    caps: { direct: !!caps.direct, rtc: caps.rtc !== false, laatsteCode: caps.laatsteCode || '' },
  };
}
const fresh = (s) => createLobby(s.caps);

// Gebeurtenissen:
//  kies{rol}  route{route}  invoer{text}  akkoord  code{code, lanCode?, note?}  fout{msg}
//  status{status, reason, partner?}  terug  verbreek  hervat
export function reduce(s, ev) {
  const n = { ...s, error: '' };
  switch (ev.t) {
    case 'kies':
      n.rol = ev.rol;
      n.step = ev.rol === ROLES.HOST ? 'methode' : 'gast-typt';
      return n;
    case 'route': // alleen host: kies kamercode of IP-adres
      if (ev.route === ROUTES.DIRECT && !s.caps.direct) return { ...n, error: 'Een IP-adres gebruiken kan alleen in de desktop-app.' };
      if (ev.route === ROUTES.KAMER && !s.caps.rtc) return { ...n, error: 'Een kamercode werkt hier niet: dit apparaat kan geen directe verbinding maken.' };
      n.route = ev.route; n.step = 'toestemming'; return n;
    case 'invoer': { // alleen gast
      const c = classifyInput(ev.text);
      if (!c.ok) return { ...n, error: c.reason };
      if (c.route === ROUTES.DIRECT && !s.caps.direct) return { ...n, error: 'Een adres of koppelcode van de directe route werkt alleen in de desktop-app. Vraag de host om een kamercode.' };
      if (c.route === ROUTES.KAMER && !s.caps.rtc) return { ...n, error: 'Een kamercode werkt hier niet.' };
      n.route = c.route; n.invoer = c; n.step = 'toestemming'; return n;
    }
    case 'akkoord':
      if (s.step !== 'toestemming') return s;
      n.step = s.rol === ROLES.HOST ? 'host-maakt-code' : 'verbinden'; return n;
    case 'code': // de host heeft een code (kamercode, of adres met UPnP; zonder router de lokale code)
      n.code = ev.code; n.lanCode = ev.lanCode || ''; n.note = ev.note || ''; n.step = 'host-wacht'; return n;
    case 'fout': n.error = ev.msg || 'Er ging iets mis.'; return n;
    case 'verbinden': n.step = 'verbinden'; return n;
    case 'status': {
      n.status = ev.status; n.reason = ev.reason || null; if (ev.partner) n.partner = ev.partner;
      if (ev.status === 'ok' || ev.status === 'lag') n.step = 'verbonden';
      else if (ev.status === 'lost') n.step = 'verbroken';
      else if (ev.status === 'geweigerd') n.step = 'geweigerd';
      else if (ev.status === 'verbroken' || ev.status === 'weg') return fresh(s);
      return n;
    }
    case 'hervat': // de host wacht weer op dezelfde gast; de gast voert de code opnieuw in
      if (s.step !== 'verbroken') return s;
      n.step = s.rol === ROLES.HOST ? 'host-maakt-code' : 'gast-typt'; return n;
    case 'verbreek': return fresh(s);
    case 'terug': return s.step === 'verbonden' ? s : fresh(s);
    default: return s;
  }
}

const PARTNER_NAME = { host: 'Tessa', gast: 'Tammo' }; // de ander van deze rol

// Wat de UI toont. buttons: [{ act, label, primary? }]; input: een tekstvak; code: de code met kopieerknop.
export function view(s) {
  const V = (o) => ({ title: 'Samen spelen', lines: [], buttons: [], input: null, code: null, error: s.error, ...o });
  switch (s.step) {
    case 'start':
      return V({
        lines: ['Speel samen met een vriend in de open wereld: opdrachten, minigames en het verhaal. Iedereen houdt zijn eigen voortgang. De host speelt Tammo, de gast Tessa.'],
        buttons: [{ act: 'kies-host', label: 'Iemand uitnodigen', primary: true }, { act: 'kies-gast', label: 'Code of adres invoeren' }],
      });
    case 'methode': {
      const buttons = [{ act: 'route-kamer', label: 'Kamercode', primary: true }];
      if (s.caps.direct) buttons.push({ act: 'route-direct', label: 'IP-adres (direct)' });
      buttons.push({ act: 'terug', label: 'Terug' });
      return V({
        title: 'Iemand uitnodigen',
        lines: ['Kamercode: werkt overal, ook in de browser, via openbare servers.',
          s.caps.direct ? 'IP-adres: rechtstreeks naar jou, zonder servers van anderen. Je router moet UPnP hebben.' : 'Het IP-adres (direct) kan alleen in de desktop-app.'],
        buttons,
      });
    }
    case 'toestemming':
      return V({
        title: 'Eerst even toestemming',
        lines: [CONSENT_TEXT[s.route], CONSENT_DETAIL[s.route]],
        buttons: [{ act: 'akkoord', label: 'Akkoord en verbinden', primary: true }, { act: 'terug', label: 'Annuleren' }],
      });
    case 'host-maakt-code':
      return V({ title: 'Iemand uitnodigen', lines: [s.route === ROUTES.DIRECT ? 'Je router wordt gevraagd een poort te openen…' : 'Je kamercode wordt gemaakt…'], buttons: [{ act: 'terug', label: 'Annuleren' }] });
    case 'host-wacht': {
      const lines = [s.route === ROUTES.DIRECT ? 'Geef dit adres of deze code aan je medespeler. Zodra die verbindt, komt Tessa naast je staan.' : 'Geef deze kamercode aan je medespeler. Zodra die hem invoert, komt Tessa naast je staan.'];
      if (s.note) lines.push(s.note);
      if (s.lanCode && s.lanCode !== s.code) lines.push('Op hetzelfde netwerk werkt ook de lokale code: ' + s.lanCode);
      return V({ title: 'Iemand uitnodigen', lines, code: s.code, buttons: [{ act: 'kopieer', label: 'Kopieer', primary: true }, { act: 'terug', label: 'Stoppen' }] });
    }
    case 'gast-typt':
      return V({
        title: 'Aansluiten', lines: ['Voer de kamercode of de koppelcode van de host in. Jij speelt Tessa; jouw voortgang blijft van jou.'],
        input: { placeholder: 'Kamercode of GDE2-…', value: s.caps.laatsteCode || '' },
        buttons: [{ act: 'koppel', label: 'Verder', primary: true }, { act: 'terug', label: 'Terug' }],
      });
    case 'verbinden':
      return V({ title: 'Verbinden…', lines: ['Even geduld. Dit duurt een paar seconden.'], buttons: [{ act: 'terug', label: 'Annuleren' }] });
    case 'verbonden': {
      const naam = PARTNER_NAME[s.rol] || 'je medespeler';
      const lag = s.status === 'lag';
      const host = s.rol === ROLES.HOST;
      return V({
        title: 'Je speelt samen',
        lines: [`Je speelt met ${naam}.` + (lag ? ' De verbinding haperde even; we wachten op de ander.' : ''),
          host ? 'Je gast kan er elk moment uit. Je kunt hem ook zelf verwijderen.' : 'Je kunt er elk moment uit; je komt terug waar je was, met jouw voortgang.'],
        buttons: [{ act: 'verbreek', label: host ? 'Gast verwijderen' : 'Spel verlaten' }],
      });
    }
    case 'verbroken': {
      const host = s.rol === ROLES.HOST;
      return V({
        title: 'Verbinding weg',
        lines: [
          'De ander is niet meer bereikbaar. Het spel staat stil tot jullie weer verbonden zijn.',
          host ? 'Wil je niet wachten? Dan speel je alleen verder en loopt Tessa als metgezel mee.' : 'Voer de code van de host opnieuw in, of stop met samen spelen; je komt terug waar je was.',
        ],
        buttons: [{ act: 'hervat', label: 'Opnieuw verbinden', primary: true }, { act: 'verbreek', label: host ? 'Alleen verder' : 'Stoppen' }],
      });
    }
    case 'geweigerd':
      return V({ title: 'Koppelen mislukt', lines: [REASON_TEXT[s.reason] || 'Koppelen is niet gelukt.'], buttons: [{ act: 'terug', label: 'Terug', primary: true }] });
    default:
      return V({});
  }
}

// Verbindingsstatus voor het partnerlabel: kleur-onafhankelijk (tekst erbij).
export function statusBadge(status, rttSec = 0) {
  if (status === 'ok') return rttSec > 0.25 ? { level: 'traag', text: 'Traag' } : { level: 'goed', text: 'Verbonden' };
  if (status === 'lag') return { level: 'traag', text: 'Haperend' };
  if (status === 'lost') return { level: 'weg', text: 'Verbinding weg' };
  if (status === 'verbinden') return { level: 'bezig', text: 'Verbinden' };
  return { level: 'uit', text: '' };
}

// Gedrag bij lag: < 0,6 s normaal; 0,6-5 s de ander blijft staan en een badge verschijnt;
// > 5 s verbroken: het spel pauzeert en wacht (scherm 'Verbinding weg').
export function lagPolicy(quietSec) {
  if (quietSec < 0.6) return { freezeRemote: false, badge: false, hold: false };
  if (quietSec < 5) return { freezeRemote: true, badge: true, hold: false };
  return { freezeRemote: true, badge: true, hold: true };
}
