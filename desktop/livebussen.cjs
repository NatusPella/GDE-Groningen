// Live bussen (#395): de ene leesopvraag naar de open buslocaties, gedaan door het main-proces (een renderer op
// gde:// mag zonder CORS-koppen niet lezen). Alleen de vaste url hieronder, alleen GET, zonder cookies, account of
// gegevens van de speler; een time-out en een maximum aan bytes. De renderer kan geen andere url meegeven.
// De url en de grenzen staan ook in game/js/livebussen.js (scripts/livebussen_test.mjs controleert dat ze gelijk zijn).
const LIVE_URL = 'https://gtfs.ovapi.nl/nl/vehiclePositions.pb';
const TIMEOUT = 8000;
const MAX_BYTES = 3 * 1024 * 1024;

// fetchImpl is in tests een nep; geeft { ok, status, bytes } en gooit nooit
async function haalLiveBussen(fetchImpl = globalThis.fetch) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT);
  try {
    const res = await fetchImpl(LIVE_URL, {
      method: 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'follow', signal: ac.signal,
      headers: { Accept: 'application/x-protobuf', 'User-Agent': 'OpenDataLezer/1' },
    });
    if (!res.ok) return { ok: false, status: res.status, bytes: new Uint8Array(0) };
    const delen = []; let n = 0;
    const rd = res.body.getReader();
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      n += value.length;
      if (n > MAX_BYTES) { ac.abort(); return { ok: false, status: 0, bytes: new Uint8Array(0) }; }
      delen.push(value);
    }
    return { ok: true, status: res.status, bytes: new Uint8Array(Buffer.concat(delen.map((d) => Buffer.from(d)))) };
  } catch {
    return { ok: false, status: 0, bytes: new Uint8Array(0) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { haalLiveBussen, LIVE_URL, TIMEOUT, MAX_BYTES };
