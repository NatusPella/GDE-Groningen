// Meldingen: de DOM-kant van het gedeelde aflopende balkje (DESIGN_SYSTEM.md, "Meldingen: duur en aflopend balkje"; puur deel:
// noticetiming.js; opmaak: ds-melding.css). Een bestaande melding verandert niet van logica: ze vraagt hier alleen om
//   noticeBar(el, { duur, soort })        het balkje in de melding zetten (voor een melding die zijn eigen klok heeft, zoals
//                                           hudcards.js en phonefeed.js, die per frame aftellen)
//   runNoticeTimer(el, { duur, onKlaar }) balkje plus een eigen timer die stilstaat bij pauze, menu, film en hover
// De timer telt hier in stappen van 100 ms (geen per-frame werk); het balkje zelf is een CSS-animatie op transform: scaleX.
import { makeTimer, timerHeld } from './noticetiming.js';

const TICK_MS = 100;

// De staat van het scherm: pauzemenu open, HUD verborgen door een film. Het spel zelf gepauzeerd (world.paused) geeft de aanroeper mee als staat().
export function screenState(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc) return {};
  const b = doc.body && doc.body.classList;
  return {
    menu: !!(doc.querySelector && doc.querySelector('#pause-menu.visible')),
    film: !!(b && b.contains('cine-hide-hud')),
  };
}

// Zet het balkje in `el` (een eerdere wordt vervangen) en geeft het element terug. soort: 'bord' (standaard, bordgroen),
// 'waarschuwing' (rood), 'donker' (voor een donkere kaart: licht balkje). kritiek: geen balkje (sluit met knop of toets).
export function noticeBar(el, { duur = 6, soort = 'bord', kritiek = false } = {}) {
  if (!el) return null;
  const oud = el.querySelector(':scope > .ds-melding__tijd');
  if (oud) oud.remove();
  el.classList.add('ds-melding');
  for (const k of ['bord', 'waarschuwing', 'donker']) el.classList.toggle('ds-melding--' + k, k === soort && soort !== 'bord');
  if (kritiek || duur === Infinity) { el.classList.add('ds-melding--kritiek'); return null; }
  el.classList.remove('ds-melding--kritiek');
  const balk = el.ownerDocument.createElement('i');
  balk.className = 'ds-melding__tijd';
  balk.setAttribute('aria-hidden', 'true'); // de schermlezer krijgt de tekst, niet de tijd
  el.style.setProperty('--ds-melding-duur', `${duur}s`);
  el.appendChild(balk);
  // opnieuw starten: de animatie loopt vanaf het begin, ook als dezelfde melding ververst wordt
  el.classList.remove('ds-melding--loopt');
  void el.offsetWidth;
  el.classList.add('ds-melding--loopt');
  return balk;
}

// Balkje plus timer. opties: duur (s), onKlaar(), soort, hover (houdt vast zolang de muis erboven staat; de melding moet dan
// pointer-events hebben), kritiek (geen timer: blijft tot stop()), staat() (extra stilstand, bijvoorbeeld world.paused),
// film: false (de melding hoort bij een film en loopt dus tijdens de film door).
// Geeft { stop, ververs(duur), timer }.
export function runNoticeTimer(el, { duur = 6, onKlaar = null, soort = 'bord', hover = false, kritiek = false, staat = null, film = true, tikMs = TICK_MS } = {}) {
  const timer = makeTimer(duur, { kritiek });
  noticeBar(el, { duur, soort, kritiek: timer.kritiek });
  let boven = false;
  const enter = () => { boven = true; };
  const leave = () => { boven = false; };
  if (hover) el.classList.add('ds-melding--hover');
  if (hover && el.addEventListener) { el.addEventListener('mouseenter', enter); el.addEventListener('mouseleave', leave); }
  let t0 = Date.now();
  let id = null;
  let klaarGemeld = false;
  const tik = () => {
    const nu = Date.now();
    const dt = (nu - t0) / 1000;
    t0 = nu;
    const s = { ...screenState(el.ownerDocument), hover: boven };
    if (!film) s.film = false; // een kaart die bij een film hoort (de naamkaart) loopt ook tijdens de film
    if (staat && staat()) s.pauze = true;
    el.classList.toggle('ds-melding--pauze', timerHeld(s));
    timer.tik(dt, s);
    if (timer.klaar && !klaarGemeld) { klaarGemeld = true; stop(); if (onKlaar) onKlaar(); }
  };
  function stop() {
    if (id != null) clearInterval(id);
    id = null;
    if (hover && el.removeEventListener) { el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave); }
    el.classList.remove('ds-melding--pauze');
  }
  if (!timer.kritiek) id = setInterval(tik, tikMs);
  return {
    timer,
    stop,
    tik,
    ververs(nieuweDuur) { timer.ververs(nieuweDuur); noticeBar(el, { duur: nieuweDuur, soort }); },
  };
}

// De resterende tijd van een melding verandert (een wachtende melding kort hem in, een stem rekt hem op): het balkje loopt mee,
// zodat het niet vroeg of laat verdwijnt. Geeft false als er geen lopende animatie is (dan klopt de duur van het begin nog).
export function adjustRemaining(el, secs) {
  const b = el && el.querySelector && el.querySelector(':scope > .ds-melding__tijd');
  const a = b && b.getAnimations ? b.getAnimations()[0] : null;
  if (!a || !(secs > 0) || !a.effect) return false;
  const duurMs = a.effect.getComputedTiming().duration;
  const restMs = duurMs - (a.currentTime || 0);
  if (!(restMs > 0)) return false;
  a.updatePlaybackRate(restMs / 1000 / secs);
  return true;
}
