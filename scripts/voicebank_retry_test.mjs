// Spelbot/stemmenbank (#733): de voice-manifesten worden met retry geladen. Een vroege of
// mislukte fetch maakte scènes de hele sessie stil; nu zijn er drie pogingen met oplopende
// wachttijd, één promise om op te wachten, één melding als het definitief mislukt en een
// retry()-haak. Geen netwerk: fetch is nagespeeld.
//   node scripts/voicebank_retry_test.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// Een fetch die per aanroep antwoordt volgens een script: 'ok' (met manifest), 'fout' of 'http500'.
function nepFetch(script) {
  const calls = [];
  const fetch = async (url) => {
    const stap = script[Math.min(calls.length, script.length - 1)];
    calls.push(url);
    if (stap === 'fout') throw new Error('netwerk');
    if (stap === 'http500') return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ 'A|Hallo': { src: 'a-hallo.opus', dur: 1.4 }, 'A|…Wacht': { src: 'a-wacht.opus', dur: 0.9 } }) };
  };
  return { fetch, calls };
}

globalThis.window = globalThis.window || {};
if (!globalThis.window.document) globalThis.window.document = {}; // een echte browser heeft een DOM; Node-tests niet
if (!globalThis.window.location) globalThis.window.location = { href: 'http://test.invalid/' }; // en een location
const bankModule = await import(pathToFileURL(path.join(ROOT, 'game/js/voicebank.js')).href);
const VOICE_ROOT = pathToFileURL(path.join(ROOT, 'game/audio/voicelines') + path.sep).href;
const warn = console.warn;
const waarschuwingen = [];
console.warn = (...a) => waarschuwingen.push(a.join(' '));

// 1. de eerste fetch valt om, de tweede lukt: de bank laadt na de retry
{
  const nep = nepFetch(['fout', 'ok']);
  globalThis.fetch = nep.fetch;
  const bank = bankModule.openBank('test-retry-a');
  const gelukt = await bank.whenReady();
  ok(gelukt === true && bank.ready && !bank.failed, 'tweede poging laadt de bank', JSON.stringify({ gelukt, ready: bank.ready, failed: bank.failed }));
  ok(bank.attempts === 2 && nep.calls.length === 2, 'precies twee fetches', `${bank.attempts}/${nep.calls.length}`);
  ok(bank.size() >= 2 && bank.lookup('A', 'Hallo') && bank.lookup('A', 'Hallo').dur === 1.4, 'de manifestregels staan erin', String(bank.size()));
  ok(bank.lookup('A', 'Hallo').src === bank.dir + 'a-hallo.opus', 'de src is absoluut', bank.lookup('A', 'Hallo').src);
  ok(bank.lookup('A', 'Wacht'), 'de ellipsis-alias werkt (#326)', String(!!bank.lookup('A', 'Wacht')));
  ok(waarschuwingen.length === 0, 'een geslaagde bank meldt niets');
}

// 2. alles mislukt: drie pogingen, één melding, whenReady resolvet met false; retry() lukt daarna
{
  const nep = nepFetch(['http500']);
  globalThis.fetch = nep.fetch;
  waarschuwingen.length = 0;
  const bank = bankModule.openBank('test-retry-b');
  const gelukt = await bank.whenReady();
  ok(gelukt === false && bank.failed && !bank.ready, 'definitief mislukt: whenReady false, failed true', JSON.stringify({ gelukt, failed: bank.failed }));
  ok(bank.attempts === 3 && nep.calls.length === 3, 'drie pogingen met backoff', `${bank.attempts}/${nep.calls.length}`);
  ok(/HTTP 500/.test(bank.fout), 'de laatste fout wordt bewaard', bank.fout);
  ok(waarschuwingen.length === 1 && /stemmenbank/.test(waarschuwingen[0]), 'één melding, niet één per scène', String(waarschuwingen.length));
  ok(bank.size() === 0 && bank.lookup('A', 'Hallo') === null, 'zonder manifest blijft de bank leeg');
  // een nieuwe scène mag het nog één keer proberen: nu lukt de fetch
  nep.calls.length = 0;
  globalThis.fetch = async (url) => { nep.calls.push(url); return { ok: true, status: 200, json: async () => ({ 'A|Hallo': { src: 'a-hallo.opus', dur: 1.4 } }) }; };
  const weer = await bank.retry();
  ok(weer === true && bank.ready && !bank.failed && bank.lookup('A', 'Hallo'), 'retry() laadt de bank alsnog', JSON.stringify({ weer, ready: bank.ready }));
  ok(waarschuwingen.length === 1, 'de melding blijft bij één');
}

// 3. geen browser (Node, tests): niets laden, niets melden, geen hang
{
  const bewaard = globalThis.fetch;
  delete globalThis.fetch;
  const bank = bankModule.openBank('test-retry-c');
  const gelukt = await bank.whenReady();
  ok(gelukt === false && bank.geenBrowser && !bank.failed && !bank.ready, 'zonder fetch: leeg, geen fout', JSON.stringify({ gelukt, geen: bank.geenBrowser, failed: bank.failed }));
  ok(bank.size() === 0 && waarschuwingen.length === 1, 'en geen extra melding');
  globalThis.fetch = bewaard;
}

// 4. dezelfde map twee keer openen geeft dezelfde bank (één lader, geen tweede fetch)
{
  const nep = nepFetch(['ok']);
  globalThis.fetch = nep.fetch;
  const a = bankModule.openBank('test-retry-d');
  const b = bankModule.openBank('test-retry-d');
  await a.whenReady();
  ok(a === b && nep.calls.length === 1 && a.ready, 'één bank en één fetch per map', `${nep.calls.length}`);
  ok(a.dir.startsWith(VOICE_ROOT), 'de bank wijst naar audio/voicelines', a.dir);
}

// 5. de haak in de engine: de bank waarschuwt en cinematics leest de mislukte bank
{
  const fs = await import('node:fs');
  const lv = fs.readFileSync(path.join(ROOT, 'game/js/linevoice.js'), 'utf8');
  ok(/export const lineVoicesReady = \(\) => bank\.ready/.test(lv) && /lineVoicesFailed = \(\) => bank\.failed/.test(lv), 'linevoice geeft de laadtoestand door');
  ok(/export const lineVoicesRetry = \(\) => bank\.retry\(\)/.test(lv), 'linevoice kan de bank opnieuw laten proberen');
  const ci = fs.readFileSync(path.join(ROOT, 'game/js/cinematics.js'), 'utf8');
  ok(/lineVoicesFailed/.test(ci) && /stemmenStilGemeld/.test(ci) && /console\.warn\('scène zonder stem/.test(ci), 'cinematics meldt één keer een scène zonder stem (#733)');
}

console.warn = warn;
console.log(fails ? `voicebank_retry_test: ${fails} van ${n} mislukt` : `voicebank_retry_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
