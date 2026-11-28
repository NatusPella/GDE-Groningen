// Live treinen (#1085), de bedrading (model: buslive.js): de stand van de live vertragingen bijhouden, de uitzetter uit
// Instellingen (liveTreinen) respecteren en de opvraag doen (in Electron via het main-proces, anders direct).
// De regels zelf (protobuf lezen, de opvraag, de sleutel) staan in livetrains.js; dit bestand voegt alleen het ritme, de stand
// en de keuze van de fetch toe. Geen THREE en geen DOM, zodat de tests met een nep-fetch en een nep-omgeving kunnen draaien
// (scripts/livetrains_test.mjs).
//
// Alles faalt zacht: bij een fout, time-out, te groot of ongeldig bestand, een lege feed, een bron die weg is of de instelling
// uit, toont het bord het rooster zonder vertraging (stand() geeft dan geen vertragingen).

import { LIVE_TRAINS, fetchLiveTrains, buildDelayMap, bridgeAsFetch } from './livetrains.js';

// De opvraag: in Electron doet het main-proces hem (een renderer op gde:// mag zonder CORS-koppen niet lezen); in de
// webversie direct. Zonder brug en zonder fetch is er geen bron. Alleen de vaste url uit livetrains.js gaat mee.
export function kiesFetch(omgeving = globalThis) {
  const bridge = omgeving && omgeving.gdeDesktop && omgeving.gdeDesktop.liveTreinen;
  if (typeof bridge === 'function') return bridgeAsFetch(bridge);
  // de webbuild (web/web.js zet __gteWeb): dezelfde host stuurt geen CORS-koppen; het bord toont het rooster
  if (omgeving && omgeving.__gteWeb) return null;
  const fetchFn = omgeving && omgeving.fetch;
  if (typeof fetchFn === 'function') return (url, opties) => fetchFn.call(omgeving, url, opties);
  return null;
}

export function createLiveTrains({ fetchFn, nu = () => Date.now(), opts = {} } = {}) {
  const cfg = { ...LIVE_TRAINS, ...opts };
  const jit = typeof cfg.jitter === 'function' ? cfg.jitter : () => 1 + (Math.random() * 2 - 1) * (cfg.spreiding || 0);
  const st = { aan: false, bezig: false, volgendeOp: 0, fouten: 0, reden: null, laatsteOk: 0, opgevraagd: 0 };
  let delayByKey = new Map();    // sleutel (treinnummer|code|minuut) -> { vertraging, vervallen }

  function wis() { delayByKey = new Map(); }

  function handleResult(res, t) {
    if (!res.ok) {
      st.reden = res.reden;
      if (res.reden === 'leeg') { st.fouten = 0; st.volgendeOp = t + cfg.interval * jit(); wis(); return; }   // een lege feed is geen fout; het bord toont het rooster
      st.fouten++;
      // 429 ("te druk") en 503 ("even niet") geven meteen de lange rust; andere fouten verdubbelen het wachten tot het maximum
      st.volgendeOp = t + ([429, 503].includes(res.status) ? cfg.maxInterval : Math.min(cfg.maxInterval, cfg.interval * 2 ** Math.min(st.fouten, 6) * jit()));
      return;
    }
    st.fouten = 0; st.reden = null; st.laatsteOk = t; st.volgendeOp = t + cfg.interval * jit();
    delayByKey = buildDelayMap(res.meldingen, t / 1000, cfg.maxMeldingen);
  }

  // Aanroepen per beeld (of vaker): vraagt zo nodig op. codes: Set stationscodes uit het rooster. Geeft de belofte terug (voor tests), anders null.
  function tick(aan, codes, t = nu()) {
    if (!aan) { if (st.aan) { st.aan = false; wis(); } return null; }
    // ver van elk station (geen codes): niet opvragen, maar de stand laten staan tot hij veroudert (review 22-11)
    if (!codes || !codes.size) return null;
    st.aan = true;
    if (st.bezig || t < st.volgendeOp) return null;
    st.bezig = true; st.opgevraagd++;
    st.volgendeOp = t + cfg.interval;
    return fetchLiveTrains({ fetchFn, codes, url: cfg.url, timeout: cfg.timeout, maxBytes: cfg.maxBytes, maxMeldingen: cfg.maxMeldingen }).then((res) => {
      try { if (st.aan) handleResult(res, nu()); } catch (e) { st.fouten = (st.fouten || 0) + 1; } finally { st.bezig = false; }
      return res;
    }, () => { st.fouten = (st.fouten || 0) + 1; st.bezig = false; return null; });
  }

  // De vertragingen nu: de kaart, of null als de stand te oud is of de bron uit staat (dan toont het bord het rooster).
  function vertragingen(t = nu()) {
    if (!st.aan || !st.laatsteOk || t - st.laatsteOk > cfg.verouderd) return null;
    return delayByKey;
  }

  return { tick, vertragingen, stand: () => ({ ...st, aantal: delayByKey.size }), _wis: wis };
}

// De bron zoals main.js hem gebruikt: de stand hierboven plus de uitzetter (Instellingen) en de grens voor test- en devruns.
// tick() bepaalt zelf of er opgevraagd mag worden. zetBron krijgt de bron (of null bij stop), zodat stationlife hem kan lezen.
export function createTrainLive({ fetchFn = kiesFetch(), instellingen = () => ({}), toegestaan = () => true, zetBron = () => {}, nu, opts } = {}) {
  const bron = createLiveTrains({ fetchFn, nu, opts });
  zetBron(bron);
  return {
    bron,
    // Per beeld aanroepen met de stationscodes van het rooster; true = de speler heeft de optie aan.
    tick(codes, t) {
      const enabled = !!fetchFn && !!toegestaan() && instellingen().liveTreinen !== false;
      return bron.tick(enabled, codes, t);
    },
    stand: () => bron.stand(),
    stop() { zetBron(null); },
  };
}
