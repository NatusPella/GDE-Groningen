// Samen spelen (#636/#634): de gedeelde identiteitstabel, de overlaycomponent en het
// toestemmingsvinkje. Pure HTML/regels, geen DOM nodig.
//   node scripts/coopui_test.mjs
import assert from 'node:assert/strict';
import { PROFIEL_KLEUREN, STANDAARD_KLEUR, identiteitsKleur, kleurVoorSpeler, isProfielKleur } from '../game/js/coopidentiteit.js';
import { PROFIEL_KLEUREN as LOBBY_KLEUREN, STANDAARD_KLEUR as LOBBY_STANDAARD, profielKleur } from '../game/js/lobby.js';
import { PARTNER, partnersInfo } from '../game/js/partnerhud.js';
import { overlayHtml } from '../game/js/coopoverlay.js';
import { consentOnthoudenHtml } from '../game/js/onlineconsentui.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('identiteit: één tabel voor lobby en partner-HUD, unieke veilige kleuren', () => {
  assert.equal(LOBBY_KLEUREN, PROFIEL_KLEUREN, 'de lobby gebruikt dezelfde tabel');
  assert.equal(LOBBY_STANDAARD, STANDAARD_KLEUR);
  assert.equal(PROFIEL_KLEUREN.length, 8);
  assert.equal(new Set(PROFIEL_KLEUREN.map((c) => c.hex)).size, 8, 'geen dubbele identiteitskleur');
  for (const c of PROFIEL_KLEUREN) assert.match(c.hex, /^#[0-9a-f]{6}$/i);
  assert.equal(isProfielKleur(STANDAARD_KLEUR.toUpperCase()), true);
  assert.equal(profielKleur('geen-kleur'), STANDAARD_KLEUR);
  assert.equal(profielKleur(PROFIEL_KLEUREN[3].hex), PROFIEL_KLEUREN[3].hex);
});

t('identiteit: vaste kleur per plek en de avatar gaat voor', () => {
  assert.equal(identiteitsKleur(0), PROFIEL_KLEUREN[0].hex);
  assert.equal(identiteitsKleur(8), identiteitsKleur(0), 'de tabel wikkelt');
  assert.equal(identiteitsKleur(-1), identiteitsKleur(7));
  assert.equal(kleurVoorSpeler({ slot: 2 }), identiteitsKleur(2));
  assert.equal(kleurVoorSpeler({ slot: 2, kleur: PROFIEL_KLEUREN[5].hex }), PROFIEL_KLEUREN[5].hex);
  assert.equal(kleurVoorSpeler({ slot: 2, avatar: { kleur: PROFIEL_KLEUREN[6].hex } }), PROFIEL_KLEUREN[6].hex);
  assert.equal(kleurVoorSpeler({ slot: 2, kleur: '#123456' }), identiteitsKleur(2), 'onbekende kleur valt terug');
});

t('partnerhud: de standaardkleuren komen uit de tabel, net als een speler zonder avatar', () => {
  assert.ok(PROFIEL_KLEUREN.some((c) => c.hex === PARTNER.host.kleur));
  assert.ok(PROFIEL_KLEUREN.some((c) => c.hex === PARTNER.gast.kleur));
  const info = partnersInfo(0, [], [{ slot: 2, char: '', verbinding: 'ok' }]);
  assert.equal(info[0].kleur, identiteitsKleur(2), 'geen avatar: de vaste kleur van de plek');
});

t('overlaycomponent: één surface met aria-modal, tokens en één primaire knop', () => {
  const html = overlayHtml({ title: 'Even wachten', text: 'Er viel iemand weg.', label: 'Weggevallen speler', buttons: [
    { action: 'hervat', label: 'Opnieuw verbinden', primary: true },
    { action: 'stop', label: 'Niet wachten' },
  ] });
  assert.match(html, /class="gm cp-overlay"/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-label="Weggevallen speler"/);
  assert.match(html, /class="m-bg cp-btn m-bp cp-primary" data-cp-action="hervat">Opnieuw verbinden</);
  assert.match(html, /class="m-bg cp-btn" data-cp-action="stop">Niet wachten</);
  assert.ok(html.indexOf('cp-primary') < html.indexOf('data-cp-action="stop"'), 'de primaire knop staat eerst');
  assert.ok(!/style=/.test(html) && !/#[0-9a-f]{6}/i.test(html), 'geen inline stijl of losse hex');
  assert.match(overlayHtml({ title: '<b>gevaar</b>', text: 'a & b' }), /&lt;b&gt;gevaar&lt;\/b&gt;/);
});

t('toestemmingsvinkje: één component met de menu-set', () => {
  const html = consentOnthoudenHtml({ label: 'Niet meer vragen', checked: true });
  assert.match(html, /class="coop-consent m-li"/);
  assert.match(html, /class="m-sw coop-consent-vink" checked/);
  assert.match(html, /<span class="ss-label">Niet meer vragen<\/span>/);
  assert.ok(!/style=/.test(html), 'geen inline stijl');
  assert.match(consentOnthoudenHtml({ label: '<x>' }), /&lt;x&gt;/);
});

console.log(`coopui_test: ${n}/${n} ok`);
