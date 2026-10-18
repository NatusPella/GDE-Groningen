// Coöp fase 5 (#95): lobby als toestandsmachine. Pure logica (geen DOM): de
// toestand en de Nederlandse teksten; lobbyui.js tekent het in de menustijl.
// Online is alleen lokaal netwerk met handmatige codes (net/signal.js);
// er is geen server en geen account. Namen of adressen worden niet getoond.

import { REASON_TEXT } from './net/protocol.js';

export const MODES = { LOKAAL: 'lokaal', HOST: 'host', GAST: 'gast' };

export function createLobby() {
  return { step: 'start', mode: null, code: '', error: '', reason: null, status: null, lag: 0 };
}

// Gebeurtenissen:
//  kies{mode}  code{code} (eigen code klaar)  gast-code-nodig  fout{msg}
//  status{status, reason}  terug  verbreek  hervat
export function reduce(s, ev) {
  const n = { ...s, error: '' };
  switch (ev.t) {
    case 'kies':
      n.mode = ev.mode; n.code = '';
      n.step = ev.mode === MODES.LOKAAL ? 'lokaal' : ev.mode === MODES.HOST ? 'host-maakt-code' : 'gast-plakt';
      return n;
    case 'code': // eigen code is klaar: host toont aanbod, gast toont antwoord
      n.code = ev.code; n.step = s.mode === MODES.HOST ? 'host-wacht-antwoord' : 'gast-wacht-host';
      return n;
    case 'fout': n.error = ev.msg || 'Er ging iets mis.'; return n;
    case 'verbinden': n.step = 'verbinden'; return n;
    case 'status': {
      n.status = ev.status; n.reason = ev.reason || null;
      if (ev.status === 'ok') { n.step = 'verbonden'; n.lag = 0; }
      else if (ev.status === 'lag') n.step = 'verbonden';
      else if (ev.status === 'lost') n.step = 'verbroken';
      else if (ev.status === 'geweigerd') n.step = 'geweigerd';
      else if (ev.status === 'verbroken') n.step = 'start';
      return n;
    }
    case 'hervat': // nieuwe code uitwisselen met hetzelfde token
      if (s.step !== 'verbroken') return s;
      n.step = s.mode === MODES.HOST ? 'host-maakt-code' : 'gast-plakt'; n.code = '';
      return n;
    case 'verbreek': return { ...createLobby() };
    case 'terug': {
      if (s.step === 'verbonden') return s; // uit een lopende sessie ga je alleen met verbreken
      return { ...createLobby() };
    }
    default: return s;
  }
}

// Wat de UI toont. buttons: [{ act, label, primary? }]; input: een tekstvak voor een code.
export function view(s) {
  const V = (o) => ({ title: 'Coöp', lines: [], buttons: [], input: null, code: null, error: s.error, ...o });
  switch (s.step) {
    case 'start':
      return V({
        lines: ['Speel samen met Tammo en Tessa.', 'Er wordt niets via internet gestuurd: online spelen kan alleen op hetzelfde netwerk, met een code die jullie zelf delen.'],
        buttons: [
          { act: 'kies-lokaal', label: 'Op één scherm', primary: true },
          { act: 'kies-host', label: 'Online: ik ben de host' },
          { act: 'kies-gast', label: 'Online: ik sluit aan' },
        ],
      });
    case 'lokaal':
      return V({
        title: 'Op één scherm',
        lines: ['Speler 1 speelt met WASD of de pijltjes. Speler 2 speelt met IJKL en U om te rennen, of met een tweede gamepad.'],
        buttons: [{ act: 'start-lokaal', label: 'Spelen', primary: true }, { act: 'terug', label: 'Terug' }],
      });
    case 'host-maakt-code':
      return V({ title: 'Online: host', lines: ['Je code wordt gemaakt…'], buttons: [{ act: 'terug', label: 'Terug' }] });
    case 'host-wacht-antwoord':
      return V({
        title: 'Online: host',
        lines: ['1. Stuur deze code naar je medespeler (bijvoorbeeld in een bericht).', '2. Plak hieronder de code die je terugkrijgt.'],
        code: s.code, input: { placeholder: 'Plak hier de code van je medespeler' },
        buttons: [{ act: 'kopieer', label: 'Kopieer mijn code' }, { act: 'koppel', label: 'Koppelen', primary: true }, { act: 'terug', label: 'Terug' }],
      });
    case 'gast-plakt':
      return V({
        title: 'Online: aansluiten',
        lines: ['Plak hieronder de code van de host.'],
        input: { placeholder: 'Plak hier de code van de host' },
        buttons: [{ act: 'koppel', label: 'Verder', primary: true }, { act: 'terug', label: 'Terug' }],
      });
    case 'gast-wacht-host':
      return V({
        title: 'Online: aansluiten',
        lines: ['Stuur deze code terug naar de host. Daarna verbindt het spel vanzelf.'],
        code: s.code, buttons: [{ act: 'kopieer', label: 'Kopieer mijn code' }, { act: 'terug', label: 'Annuleren' }],
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
        lines: ['De ander is niet meer bereikbaar. Het spel gaat door; een metgezel neemt de plek over.', 'Wil je weer verbinden? Wissel opnieuw een code uit, dan ga je verder waar je was.'],
        buttons: [{ act: 'hervat', label: 'Opnieuw verbinden', primary: true }, { act: 'verbreek', label: 'Alleen verder' }],
      });
    case 'geweigerd':
      return V({
        title: 'Koppelen mislukt',
        lines: [REASON_TEXT[s.reason] || 'Koppelen is niet gelukt.'],
        buttons: [{ act: 'terug', label: 'Terug', primary: true }],
      });
    default:
      return V({});
  }
}

// Verbindingsstatus voor een klein bolletje in de HUD: kleur-onafhankelijk (tekst erbij).
export function statusBadge(status, rttSec = 0) {
  if (status === 'ok') {
    if (rttSec > 0.25) return { level: 'traag', text: 'Traag' };
    return { level: 'goed', text: 'Verbonden' };
  }
  if (status === 'lag') return { level: 'traag', text: 'Haperend' };
  if (status === 'lost') return { level: 'weg', text: 'Verbinding weg' };
  if (status === 'verbinden') return { level: 'bezig', text: 'Verbinden' };
  return { level: 'uit', text: '' };
}

// Gedrag bij lag, voor de speelomgeving: wat doet het spel met hoeveel stilte?
//   < 0,6 s  normaal; 0,6-5 s  bevries de ander (hij blijft staan), toon badge, de eigen speler speelt door;
//   > 5 s    verbroken: de NPC-metgezel neemt over, de host pauzeert niet.
export function lagPolicy(quietSec) {
  if (quietSec < 0.6) return { freezeRemote: false, badge: false, takeover: false };
  if (quietSec < 5) return { freezeRemote: true, badge: true, takeover: false };
  return { freezeRemote: true, badge: true, takeover: true };
}
