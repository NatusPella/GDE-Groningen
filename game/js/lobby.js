// Coöp (#95): lobby als toestandsmachine. Pure logica (geen DOM): de toestand
// en de Nederlandse teksten; lobbyui.js tekent het in de menustijl.
// Online: de host opent via UPnP een poort op de eigen router en deelt één
// korte code met adres en poort; de gast typt die in. Geen server van een
// derde, geen account. Online werkt alleen in de desktop-app; de webversie
// houdt "Op één scherm". De host speelt Tammo, de gast Tessa.

import { REASON_TEXT } from './net/protocol.js';

export const MODES = { LOKAAL: 'lokaal', HOST: 'host', GAST: 'gast' };
export const SAVES = { NIEUW: 'nieuw', VERDER: 'verder', SOLO: 'solo' };

// caps: { online (desktop-app), hasCoopSave, hasSoloSave }
export function createLobby(caps = {}) {
  return { step: 'start', mode: null, save: null, code: '', lanCode: '', note: '', error: '', reason: null, status: null,
    caps: { online: !!caps.online, hasCoopSave: !!caps.hasCoopSave, hasSoloSave: !!caps.hasSoloSave } };
}
const fresh = (s) => createLobby(s.caps);

// Gebeurtenissen:
//  kies{mode}  bewaar{src}  code{code, lanCode?, note?}  fout{msg}  verbinden
//  status{status, reason}  terug  verbreek  hervat
export function reduce(s, ev) {
  const n = { ...s, error: '' };
  switch (ev.t) {
    case 'kies':
      if (ev.mode !== MODES.LOKAAL && !s.caps.online) return { ...n, error: 'Online spelen kan alleen in de desktop-app.' };
      n.mode = ev.mode; n.code = ''; n.lanCode = ''; n.note = '';
      n.step = ev.mode === MODES.GAST ? 'gast-typt' : 'save-kiezen';
      return n;
    case 'bewaar': // kiest met welke voortgang gestart wordt (host en lokaal)
      if (s.step !== 'save-kiezen') return s;
      n.save = ev.src; n.step = s.mode === MODES.LOKAAL ? 'lokaal' : 'host-maakt-code';
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
      n.step = s.mode === MODES.HOST ? 'host-wacht' : 'gast-typt'; return n;
    case 'verbreek': return fresh(s);
    case 'terug': return s.step === 'verbonden' ? s : fresh(s);
    default: return s;
  }
}

// Wat de UI toont. buttons: [{ act, label, primary? }]; input: een tekstvak voor een code.
export function view(s) {
  const V = (o) => ({ title: 'Coöp', lines: [], buttons: [], input: null, code: null, error: s.error, ...o });
  switch (s.step) {
    case 'start': {
      const buttons = [{ act: 'kies-lokaal', label: 'Op één scherm', primary: true }];
      if (s.caps.online) buttons.push({ act: 'kies-host', label: 'Online: ik ben de host' }, { act: 'kies-gast', label: 'Online: ik sluit aan' });
      return V({
        lines: ['Speel samen: de host is Tammo, de gast is Tessa.',
          s.caps.online ? 'Online loopt rechtstreeks tussen jullie twee, zonder server van een ander. De host deelt een korte code.' : 'Online spelen kan alleen in de desktop-app.'],
        buttons,
      });
    }
    case 'save-kiezen': {
      const buttons = [{ act: 'bewaar-nieuw', label: 'Nieuw coöp-spel', primary: !s.caps.hasCoopSave }];
      if (s.caps.hasCoopSave) buttons.unshift({ act: 'bewaar-verder', label: 'Verder met mijn coöp-spel', primary: true });
      if (s.caps.hasSoloSave) buttons.push({ act: 'bewaar-solo', label: 'Coöp vanaf mijn verhaal' });
      buttons.push({ act: 'terug', label: 'Terug' });
      return V({ title: 'Welk spel?', lines: ['Je solo-spel blijft ongemoeid; coöp heeft zijn eigen opslag.'], buttons });
    }
    case 'lokaal':
      return V({
        title: 'Op één scherm',
        lines: ['Tammo speelt met WASD of de pijltjes. Tessa speelt met IJKL en U om te rennen, of met een tweede gamepad.'],
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
        title: 'Online: aansluiten', lines: ['Voer de code van de host in.'], input: { placeholder: 'GDE2-…' },
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
    case 'verbroken':
      return V({
        title: 'Verbinding weg',
        lines: ['De ander is niet meer bereikbaar. Het spel gaat door; een metgezel neemt de plek over.', 'Wil je weer verbinden? Dan ga je verder waar je was.'],
        buttons: [{ act: 'hervat', label: 'Opnieuw verbinden', primary: true }, { act: 'verbreek', label: 'Alleen verder' }],
      });
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
// > 5 s verbroken, de NPC-metgezel neemt over en het spel pauzeert niet.
export function lagPolicy(quietSec) {
  if (quietSec < 0.6) return { freezeRemote: false, badge: false, takeover: false };
  if (quietSec < 5) return { freezeRemote: true, badge: true, takeover: false };
  return { freezeRemote: true, badge: true, takeover: true };
}
