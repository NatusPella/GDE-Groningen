// Test van de verfijnronde Voetbal (22-11, docs/VERFIJNING-22-11-VOETBAL.md): scripts/voetbal_verfijn_test.mjs. Pure en mock: geen Electron, geen echte opslag.
// Dekt: grijze knoppen, meldingen, de bevestiging, de selectielijsten, de tab-terugval, de ondergrens van de selectie (met een lange fuzz over seizoenen),
// de radar voor team 1, de leestijd voor overslaan, de stopmelding van de training en de HUD van een derby.
import PARKDATA from '../game/js/voetbalparkendata.js';
import assert from 'node:assert/strict';
import { wgsToWorld } from '../game/js/rdnew.js';
import { makeParkIndex, HOME_WGS } from '../game/js/voetbalparken.js';
import * as C from '../game/js/voetbalcarriere.js';
import * as T from '../game/js/voetbaltransfers.js';
import { viewHtml as vh, uitReden, actieBericht, ui, vraagtBevestiging } from '../game/js/voetbalcarriereui.js';
// Club-UI 24-11: de tabs Vandaag, Trainer en Manager zijn Overzicht, Tactiek en het deel Transfers van Selectie; deze test blijft de oude namen gebruiken
const viewHtml = (c, tab, env) => { ui.deel = 'selectie'; if (tab === 'manager') { ui.deel = 'transfers'; tab = 'selectie'; } if (tab === 'trainer') tab = 'tactiek'; if (tab === 'vandaag') tab = 'overzicht'; return vh(c, tab, env); };

import { radarModel, radarHtml, magOverslaan, MIN_LEEST, carriereBannerRijen } from '../game/js/voetbalpresentatie.js';
import { stopBericht } from '../game/js/voetbaltraining.js';
import { voetbalHudModel, watNu, naarMijn } from '../game/js/voetbalstatus.js';
import { makeMatch, tikWedstrijd } from '../game/js/voetbalmatch.js';
import { coachMelding, coachSetup, makeCoachMatch, coachTactic, COACH_MAX_CHANGES } from '../game/js/voetbalcoach.js';
import { makeCommentaar, commentaarVoor, tikCommentaar } from '../game/js/voetbalcommentaar.js';
import { makeRng } from '../game/js/minigamekit.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const index = makeParkIndex(PARKDATA);
const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
const getClub = C.clubResolver(index);
const start = () => C.createCareer({ char: 'anita', index, home: { x: hx, y: hy } });
const env = { getClub, unlocked: true, hint: null, char: 'anita' };
const manager = (c) => ({ ...c, roles: { ...c.roles, manager: true }, evDone: c.cal.length, market: { ...T.emptyMarket(), pool: T.freeAgents(7, 1) } });

t('een grijze knop (aria-disabled) is geen actie en geeft zijn reden als melding', () => {
  const el = (a) => ({ getAttribute: (k) => (a[k] === undefined ? null : a[k]) });
  assert.equal(uitReden(el({ 'aria-disabled': 'true', title: 'Nog niet aan de beurt' })), 'Nog niet aan de beurt');
  assert.equal(uitReden(el({ 'aria-disabled': 'true' })), 'Dat kan nu niet');
  assert.equal(uitReden(el({})), null);
  assert.equal(uitReden(null), null);
  const h = viewHtml(start(), 'vandaag', env);
  assert.match(h, /data-vb="sim"[^>]*aria-disabled="true"[^>]*title="Nog niet aan de beurt"/, 'het scherm zet de reden in title');
});

t('meldingen na een actie: weigering met reden, koop en verkoop met bedrag, training met Nederlandse reden', () => {
  assert.equal(actieBericht('buy:x', { ok: false, reason: 'De clubkas is te klein' }), 'De clubkas is te klein');
  assert.match(actieBericht('buy:x', { ok: true, price: 1500 }), /^Gekocht voor €/);
  assert.match(actieBericht('sell:x', { ok: true, price: 900 }), /^Verkocht voor/);
  assert.equal(actieBericht('renew:x', { ok: true, contract: 1 }), 'Contract verlengd tot 1 seizoen');
  assert.equal(actieBericht('renew:x', { ok: true, contract: 3 }), 'Contract verlengd tot 3 seizoenen');
  assert.equal(actieBericht('train', { ok: false, reason: 'blessure' }), 'Je bent geblesseerd');
  assert.equal(actieBericht('train:snel', { ok: false, reason: 'vandaag al bezig' }), 'Vandaag al getraind of gespeeld');
  assert.equal(actieBericht('sim', { summary: null }), 'Er is geen wedstrijd om uit te rekenen');
  assert.equal(actieBericht('sim', { summary: { played: false } }), null, 'een gelukte uitrekening meldt de live-laag zelf');
  assert.equal(actieBericht('tab:stand', null), null);
});

t('manager: een speler verkopen kan niet onder de ondergrens van de selectie of de rol, ook niet in een dubbelklik', () => {
  let c = manager(start());
  const sq0 = C.squadOf(c, c.club, getClub);
  assert.ok(sq0.length >= C.MIN_SQUAD);
  let verkocht = 0, geweigerd = 0;
  for (const p of sq0) {
    const r = C.managerSell(c, p.id, getClub);
    if (r.ok) { c = r.career; verkocht++; } else geweigerd++;
    if (r.ok) assert.equal(C.managerSell(c, p.id, getClub).ok, false, 'dezelfde speler twee keer verkopen');
  }
  const sq = C.squadOf(c, c.club, getClub);
  assert.ok(sq.length >= C.MIN_SQUAD, `selectie ${sq.length}`);
  for (const [rol, min] of Object.entries(C.MIN_ROLE)) assert.ok(sq.filter((p) => p.role === rol).length >= min, `${rol} minstens ${min}`);
  assert.ok(verkocht >= 1 && geweigerd >= 1, 'er is wel iets te verkopen, maar niet alles');
});

t('de selectielijst toont iedereen (tot 22) met het echte aantal, ook als je spelers koopt', () => {
  let c = manager(start());
  c = { ...c, market: { ...c.market, cash: { [c.club]: 5e6 } } };
  let gekocht = 0;
  for (const p of (c.market.pool || []).slice()) { const r = C.managerBuy(c, p.id, getClub); if (r.ok) { c = r.career; gekocht++; } }
  assert.ok(gekocht >= 2, `gekocht ${gekocht}`);
  const sq = C.squadOf(c, c.club, getClub);
  const sel = viewHtml(c, 'selectie', env);
  assert.ok(sel.includes(`${sq.length} spelers`), 'het echte aantal');
  assert.equal((sel.match(/<tr class="ds-m-rij/g) || []).length, sq.length, 'elke speler staat erin');
  const man = viewHtml(c, 'manager', env);
  const eigen = (man.split('Jouw selectie')[1] || '').split('<p class="vb-tip">')[0];
  assert.equal((eigen.match(/<li /g) || []).length, sq.filter((q) => !q.protagonist).length, 'ook wie na de achttiende komt is te verkopen of te verlengen');
});

t('een tab die er niet meer is (manager of trainer weg) valt terug op Overzicht, met een gekozen tab in de balk', () => {
  const c = C.advanceDays(start(), 3, getClub).career;
  const h = vh(c, 'trainer', env);
  assert.ok(h.includes('data-vb="tab:overzicht" aria-selected="true"'));
  assert.equal((h.match(/aria-selected="true"/g) || []).length, 1);
  assert.ok(vh(c, 'bestaatniet', env).includes('data-vb="tab:overzicht" aria-selected="true"'));
});

t('geld weggeven of een speler laten gaan vraagt een tweede druk: de knop zegt Zeker', () => {
  assert.ok(vraagtBevestiging('sell:x') && vraagtBevestiging('share:buy:a:0.1') && vraagtBevestiging('share:sell:a'));
  assert.ok(!vraagtBevestiging('buy:x') && !vraagtBevestiging('tab:stand') && !vraagtBevestiging('train'));
  const c = manager(start());
  const p = C.squadOf(c, c.club, getClub).find((q) => !q.protagonist);
  ui.vraag = null;
  assert.ok(!viewHtml(c, 'manager', env).includes('Zeker? '));
  ui.vraag = `sell:${p.id}`;
  const h = viewHtml(c, 'manager', env);
  assert.equal(h.split('Zeker? ').length - 1, 1, 'precies een knop vraagt het');
  const i = h.indexOf(`data-vb="sell:${p.id}"`);
  assert.ok(i > 0 && h.slice(i, i + 200).includes('>Zeker? Verkoop'), 'de gevraagde knop is die van deze speler');
  ui.vraag = null;
});

t('radar: bij een mens in team 1 draait het veld zodat jouw aanval naar boven wijst; de computer is een vierkantje', () => {
  const m = makeMatch([{ slot: 0, team: 0 }, { slot: 1, team: 1 }], { seed: 3 });
  const a = m.mensen.find((x) => x.team === 0).ctl, b = m.mensen.find((x) => x.team === 1).ctl;
  m.bal.y = 10; m.bal.x = 4;
  const r0 = radarModel(m, a), r1 = radarModel(m, b);
  assert.ok(r0.bal.y < 0.5, 'team 0 valt aan naar +y: een bal voor het doel staat boven');
  assert.ok(r1.bal.y > 0.5 && Math.abs(r1.bal.y - (1 - r0.bal.y)) < 1e-9, 'team 1: dezelfde bal staat omgekeerd');
  assert.ok(Math.abs(r1.bal.x - (1 - r0.bal.x)) < 1e-9, 'een halve slag, dus ook links en rechts');
  assert.ok(r0.spelers.some((s) => s.jij), 'jij staat erop');
  const h = radarHtml(m, a);
  assert.ok(h.includes('<circle') && h.includes('vbtv-r0') && h.includes('<rect x=') && h.includes('vbtv-r1'));
  assert.ok(!/NaN/.test(h) && !/NaN/.test(radarHtml(m, b)));
  assert.equal(JSON.stringify(radarModel(m, -1).bal), JSON.stringify(r0.bal), 'zonder eigen speler (coach) blijft de standaard');
});

t('overslaan met F of spatie: eerst een korte leestijd voor rust, eindverslag en herhaling', () => {
  assert.equal(magOverslaan('eind', 0.2), false); assert.equal(magOverslaan('eind', MIN_LEEST.eind), true);
  assert.equal(magOverslaan('rust', 1.0), false); assert.equal(magOverslaan('herhaling', 0.3), false); assert.equal(magOverslaan('herhaling', 1.0), true);
  assert.equal(magOverslaan('intro', 0.5), true, 'de opstelling mag snel weg');
  assert.equal(magOverslaan('eind', NaN), false); assert.equal(magOverslaan('eind', undefined), false);
  for (const v of Object.values(MIN_LEEST)) assert.ok(v < 3, 'de leestijd blijft kort');
});

t('training: Esc tijdens het resultaat meldt geen geen-winst (de groei is al uitgekeerd)', () => {
  assert.equal(stopBericht('result'), null);
  for (const f of ['intro', 'run']) assert.ok(stopBericht(f).includes('geen winst'));
});

t('HUD in een derby: een mens in team 1 ziet jullie en tegen vanuit zijn eigen kant', () => {
  const g = { fase: 'spel', helft: 1, klok: 50, score: [3, 1], bezit: [10, 30], bezitTeam: 1, heeftBal: false, rol: 'veld', stamina: 1, moe: false, laad: 0, eigen: 0 };
  const hud0 = voetbalHudModel(g);
  // Club-UI 24-11: de stand en het bezit staan niet meer op de spelerskaart (alleen op het bord en in de rust); het omdraaien voor team 1 gebeurt in naarMijn
  assert.deepEqual(hud0.cijfers.map((x) => x.label), ['Jouw doelpunten']); assert.deepEqual(naarMijn(g).score, [3, 1]);
  assert.ok(hud0.nu.includes('Zet druk'));
  const hud1 = voetbalHudModel({ ...g, mijnTeam: 1 });
  assert.deepEqual(naarMijn({ ...g, mijnTeam: 1 }).score, [1, 3], 'jullie = team 1');
  assert.ok(hud1.nu.includes('Jullie hebben de bal'), 'team 1 heeft de bal: dat zijn jullie');
  assert.equal(hud1.stappen.find((s) => s.stand === 'nu').label, 'Aanvallen');
  assert.deepEqual(naarMijn({ ...g, mijnTeam: 1 }).bezit, [30, 10], 'het bezit draait mee');
  assert.deepEqual(naarMijn(naarMijn({ ...g, mijnTeam: 1 })).score, [1, 3], 'twee keer omdraaien gebeurt niet');
  assert.deepEqual(g.score, [3, 1], 'het origineel blijft heel');
  assert.ok(watNu({ fase: 'spel', helft: 1, moe: true, heeftBal: false, bezitTeam: -1, rol: 'veld' }).includes('Buiten adem'));
  assert.ok(watNu({ fase: 'spel', helft: 1, moe: true, heeftBal: true, bezitTeam: 0, rol: 'veld' }).includes('Je hebt de bal'), 'met de bal blijft de pass-hint staan');
});

t('lange fuzz: tien seizoenen met willekeurige manageracties en uitrekenen houdt de selectie, de kas en het profiel heel', () => {
  for (let seed = 1; seed <= 3; seed++) {
    const rng = makeRng(seed * 977);
    let c = C.createCareer({ char: seed % 2 ? 'anita' : 'tammo', index, home: { x: hx, y: hy } });
    c = { ...c, roles: { ...c.roles, manager: true } };
    let seizoenen = 0, stappen = 0;
    while (seizoenen < 10 && stappen++ < 6000) {
      const m = C.nextMatch(c, getClub);
      if (m && m.status === 'soon') c = C.advanceDays(c, 1, getClub).career;
      else if (m) c = C.playEvent(c, getClub, rng() < 0.5 ? null : { gf: Math.floor(rng() * 4), ga: Math.floor(rng() * 4), stats: { goals: 1, minutes: 8 } }).career;
      else {
        if (T.inBreak(c)) {
          const sq = C.squadOf(c, c.club, getClub);
          for (let k = 0; k < 4; k++) {
            const pick = rng(), p = sq[Math.floor(rng() * sq.length)];
            if (pick < 0.4) { const r = C.managerSell(c, p.id, getClub); if (r.ok) c = r.career; }
            else if (pick < 0.7 && c.market.pool && c.market.pool.length) { const r = C.managerBuy(c, c.market.pool[Math.floor(rng() * c.market.pool.length)].id, getClub, 1 + Math.floor(rng() * 3)); if (r.ok) c = r.career; }
            else { const r = C.managerRenew(c, p.id, getClub, 1); if (r.ok) c = r.career; }
          }
        }
        const adv = C.advanceDays(c, 2, getClub); c = adv.career; if (adv.newSeason) seizoenen++;
      }
      const sq = C.squadOf(c, c.club, getClub);
      assert.ok(sq.length >= C.MIN_SQUAD - 4 && sq.length <= 24, `selectie ${sq.length} (seed ${seed})`);
      assert.ok(sq.some((p) => p.role === 'keeper'), 'altijd een keeper');
      const kas = C.clubCash(c, getClub);
      assert.ok(Number.isFinite(kas) && kas >= 0, `kas ${kas}`);
    }
    assert.ok(seizoenen >= 3, `seed ${seed}: slechts ${seizoenen} seizoenen na ${stappen} stappen`);
    assert.ok(!/NaN|undefined/.test(viewHtml(c, 'manager', env)));
  }
});

t('coachen: de melding zegt hoeveel wissels er nog zijn en wanneer het de laatste was', () => {
  assert.equal(coachMelding('Vorming: 4-3-3', { ok: true, over: 5 }), 'Vorming: 4-3-3 (nog 5 wissels)');
  assert.equal(coachMelding('Vorming: 4-3-3', { ok: true, over: 1 }), 'Vorming: 4-3-3 (nog 1 wissel)');
  assert.ok(coachMelding('Speelstijl: druk', { ok: true, over: 0 }).includes('laatste wissel'));
  assert.equal(coachMelding('x', { ok: false, reden: 'Nog 12 seconden wachten' }), 'Nog 12 seconden wachten');
  let c = { ...start(), roles: { ...start().roles, trainer: true } };
  const s = coachSetup(c, getClub); assert.ok(s, 'coachopzet');
  const m = makeCoachMatch(s, { seed: 2 });
  m.fase = 'rust';
  let over = COACH_MAX_CHANGES, ok = 0;
  for (let i = 0; i < COACH_MAX_CHANGES + 2; i++) { const r = coachTactic(m, { stijl: i % 2 ? 'druk' : 'evenwichtig' }); if (r.ok) { ok++; over--; assert.equal(r.over, over); } else assert.ok(r.reden); }
  assert.equal(ok, COACH_MAX_CHANGES, 'precies zoveel wissels als mag');
});

t('commentaar over dertig bot-wedstrijden: nooit twee dezelfde regels achter elkaar en bijna nooit binnen tien regels', () => {
  let totaal = 0, dichtbij = 0, achter = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const m = makeMatch([], { seed, aiBeide: true, tegenstander: seed % 5 });
    const c = makeCommentaar({ seed, duurHelft: m.duurHelft });
    const regels = [];
    for (let i = 0; i < 40000 && m.fase !== 'klaar'; i++) {
      const ev = tikWedstrijd(m, 1 / 30, null);
      const ctx = { score: m.score.slice(), helft: m.helft, klok: m.klok, duurHelft: m.duurHelft, fase: m.fase, naamVan: (id) => (m.spelers[id] || {}).naam, bezit: m.stat && m.stat.bezit };
      for (const e of ev) commentaarVoor(c, e, ctx);
      for (const r of tikCommentaar(c, 1 / 30, ctx)) regels.push(r.tekst);
    }
    totaal += regels.length;
    regels.forEach((r, i) => { if (i && regels[i - 1] === r) achter++; for (let j = Math.max(0, i - 10); j < i; j++) if (regels[j] === r) dichtbij++; });
  }
  assert.ok(totaal > 30 * 20, `er is genoeg commentaar (${totaal})`);
  assert.equal(achter, 0, 'geen twee dezelfde regels achter elkaar');
  assert.ok(dichtbij <= 4, `${dichtbij} herhalingen binnen tien regels`);
});

t('het uitslagbord noemt wat het opleverde; de markt staat gesorteerd; training toont je energie', () => {
  const rij = carriereBannerRijen({ earn: [{ label: 'Contract', amount: 55 }, { label: 'Winstbonus', amount: 20 }], gains: ['schot'], injury: { text: 'Een verrekte spier' }, notes: ['Uitgeschakeld in de Dijkbeker'] }, { gf: 2, ga: 1, doelpunten: 1 });
  const lijst = Object.fromEntries(rij);
  assert.equal(lijst.Stand, '2-1'); assert.equal(lijst['Jouw doelpunten'], '1'); assert.equal(lijst.Verdiend, '€75');
  assert.equal(lijst.Groei, '+1'); assert.equal(lijst['Let op'], 'Een verrekte spier'); assert.match(lijst.Beker, /Dijkbeker/);
  const leeg = Object.fromEntries(carriereBannerRijen({ earn: [] }, { gf: 0, ga: 0 })); assert.ok(!('Verdiend' in leeg), 'niets verdiend geen regel');
  assert.ok(!('Jouw doelpunten' in Object.fromEntries(carriereBannerRijen(null, { coach: true }))) && 'Als trainer' in Object.fromEntries(carriereBannerRijen(null, { coach: true })));
  const c = manager(start());
  const man = viewHtml(c, 'manager', env);
  const markt = (man.split('Transfervrije spelers')[1] || '').split('Jouw selectie')[0];
  const ratings = [...markt.matchAll(/rating (\d+)/g)].map((x) => +x[1]);
  assert.ok(ratings.length >= 5, 'er staan spelers op de markt');
  for (let i = 1; i < ratings.length; i++) assert.ok(ratings[i] <= ratings[i - 1], 'de beste staat bovenaan');
  assert.match(viewHtml(C.advanceDays(start(), 3, getClub).career, 'training', env), /Energie nu<[/]small><b>\d+%/);
});

console.log(`voetbal_verfijn_test ok: ${n} testen`);
