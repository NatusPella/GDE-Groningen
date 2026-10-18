// Coöp (#95): lobby als toestandsmachine. Pure logica (geen DOM): de toestand
// en de Nederlandse teksten; lobbyui.js tekent het in de menustijl.
// Eén save, één verhaalvoortgang: bij Nieuw spel en bij Doorgaan kies je per
// sessie Alleen of Samen (op één scherm, of online als host of gast).
// Online: de host opent via UPnP een poort op de eigen router en deelt één
// korte code met adres en poort; de gast typt die in. Geen server van een
// derde, geen account. Online werkt alleen in de desktop-app. De host speelt
// Tammo en bewaart het spel; de gast speelt Tessa.

import { REASON_TEXT } from './net/protocol.js';

export const MODES = { ALLEEN: 'alleen', LOKAAL: 'lokaal', HOST: 'host', GAST: 'gast' };

// caps: { online (desktop-app), actie: 'nieuw' | 'doorgaan', laatsteCode, start?: 'verbroken', mode? }
export function createLobby(caps = {}) {
  return {
    step: caps.start || 'modus', mode: caps.mode || null, actie: caps.actie === 'nieuw' ? 'nieuw' : 'doorgaan',
    code: '', lanCode: '', note: '', error: '', reason: null, status: null,
    caps: { online: !!caps.online, laatsteCode: caps.laatsteCode || '' },
  };
}
const fresh = (s) => createLobby({ ...s.caps, actie: s.actie });

// Gebeurtenissen:
//  kies{mode}  code{code, lanCode?, note?}  fout{msg}  verbinden
//  status{status, reason}  terug  verbreek  hervat
export function reduce(s, ev) {
  const n = { ...s, error: '' };
  switch (ev.t) {
    case 'kies':
      if ((ev.mode === MODES.HOST || ev.mode === MODES.GAST) && !s.caps.online) return { ...n, error: 'Online spelen kan alleen in de desktop-app.' };
      n.mode = ev.mode; n.code = ''; n.lanCode = ''; n.note = '';
      n.step = ev.mode === MODES.ALLEEN ? 'alleen' : ev.mode === MODES.LOKAAL ? 'lokaal' : ev.mode === MODES.HOST ? 'host-maakt-code' : 'gast-typt';
      return n;
    case 'code': // de host heeft een code (met of zonder router)
      n.code = ev.code; n.lanCode = ev.lanCode || ''; n.note = ev.note || ''; n.step = 'host-wacht';
      return n;
    case 'fout': n.error = ev.msg || 'Er ging iets mis.'; return n;
    case 'verbinden': n.step = 'verbinden'; return n;
    case 'status': {
      n.status = ev.status; n.reason = ev.reason || null;
      if (ev.status === 'ok' || ev.status === 'lag') n.step = 'verbonden';
      else if (ev.status === 'lost') n.step = 'verbroken';
      else if (ev.status === 'geweigerd') n.step = 'geweigerd';
      else if (ev.status === 'verbroken') return fresh(s);
      return n;
    }
    case 'hervat': // de host wacht weer op dezelfde gast; de gast voert de code opnieuw in
      if (s.step !== 'verbroken') return s;
      n.step = s.mode === MODES.HOST ? 'host-maakt-code' : 'gast-typt'; return n;
    case 'verbreek': return fresh(s);
    case 'terug': return s.step === 'verbonden' ? s : fresh(s);
    default: return s;
  }
}

// Wat de UI toont. buttons: [{ act, label, primary? }]; input: een tekstvak voor een code.
export function view(s) {
  const V = (o) => ({ title: 'Samen spelen', lines: [], buttons: [], input: null, code: null, error: s.error, ...o });
  const wat = s.actie === 'nieuw' ? 'Nieuw spel' : 'Doorgaan';
  switch (s.step) {
    case 'modus': {
      const buttons = [{ act: 'kies-alleen', label: 'Alleen', primary: true }, { act: 'kies-lokaal', label: 'Samen op één scherm' }];
      if (s.caps.online) buttons.push({ act: 'kies-host', label: 'Samen online: ik ben de host' }, { act: 'kies-gast', label: 'Samen online: ik sluit aan' });
      buttons.push({ act: 'terug', label: 'Terug' });
      return V({
        title: wat,
        lines: [
          s.actie === 'nieuw' ? 'Hoe wil je dit spel spelen?' : 'Hoe wil je deze keer spelen? Je voortgang is één en dezelfde, alleen of samen.',
          s.caps.online ? 'Online loopt rechtstreeks tussen jullie twee, zonder server van een ander. De host speelt Tammo en bewaart het spel, de gast speelt Tessa.' : 'Online spelen kan alleen in de desktop-app.',
        ],
        buttons,
      });
    }
    case 'alleen':
      return V({ title: wat, lines: ['Je speelt alleen; Tessa loopt als metgezel mee.'], buttons: [{ act: 'start-alleen', label: 'Spelen', primary: true }, { act: 'terug', label: 'Terug' }] });
    case 'lokaal':
      return V({
        title: 'Samen op één scherm',
        lines: ['Tammo speelt met WASD of de pijltjes. Tessa speelt met IJKL en U om te rennen, of met een tweede gamepad. Wat jullie samen halen, telt voor je spel.'],
        buttons: [{ act: 'start-lokaal', label: 'Spelen', primary: true }, { act: 'terug', label: 'Terug' }],
      });
    case 'host-maakt-code':
      return V({ title: 'Online: host', lines: ['Je code wordt gemaakt. Er wordt gekeken of je router een poort wil openen…'], buttons: [{ act: 'terug', label: 'Annuleren' }] });
    case 'host-wacht': {
      const lines = ['Geef deze code aan je medespeler. Zodra die hem invoert, begint het spel.'];
      if (s.note) lines.push(s.note);
      if (s.lanCode && s.lanCode !== s.code) lines.push('Op hetzelfde netwerk werkt ook de lokale code: ' + s.lanCode);
      return V({ title: 'Online: host', lines, code: s.code, buttons: [{ act: 'kopieer', label: 'Kopieer mijn code' }, { act: 'terug', label: 'Stoppen' }] });
    }
    case 'gast-typt':
      return V({
        title: 'Online: aansluiten', lines: ['Voer de code van de host in. Jij speelt Tessa; de host bewaart het spel.'],
        input: { placeholder: 'GDE2-…', value: s.caps.laatsteCode || '' },
        buttons: [{ act: 'koppel', label: 'Verbinden', primary: true }, { act: 'terug', label: 'Terug' }],
      });
    case 'verbinden':
      return V({ title: 'Verbinden…', lines: ['Even geduld. Dit duurt een paar seconden.'], buttons: [{ act: 'terug', label: 'Annuleren' }] });
    case 'verbonden':
      return V({
        title: 'Verbonden',
        lines: [s.status === 'lag' ? 'De verbinding haperde even. We wachten op de ander.' : 'Jullie spelen samen.'],
        buttons: [{ act: 'verbreek', label: 'Verbinding verbreken' }],
      });
    case 'verbroken': {
      const host = s.mode === MODES.HOST;
      return V({
        title: 'Verbinding weg',
        lines: [
          'De ander is niet meer bereikbaar. Het spel staat stil tot jullie weer verbonden zijn.',
          host ? 'Wil je niet wachten? Dan speel je alleen verder en loopt Tessa als metgezel mee.' : 'Voer de code van de host opnieuw in, of stop met samen spelen.',
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

// Verbindingsstatus voor een klein bolletje in de HUD: kleur-onafhankelijk (tekst erbij).
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
