// De hengelhouding van de speler (#437): een korte beweging bij het uitwerpen, de ruk aan de hengel bij een beet en
// het binnenhalen. Pure getallen uit models3d_people.js (hengelHouding), die applyPose op de botten zet.
import './node3d.mjs';
import assert from 'node:assert/strict';
const { hengelHouding } = await import('../game/js/models3d_people.js');

let n = 0;
const t = (name, f) => { f(); n++; };
const klaar = hengelHouding('hengel', 0);

t('klaar: de hengel voor je uit, armen en romp binnen de grenzen van het model', () => {
  for (const k of ['armL', 'elbowL', 'armR', 'elbowR', 'chest', 'head', 'legL', 'legR']) assert.ok(Number.isFinite(klaar[k]), k);
  assert.ok(klaar.armR > 0.8 && klaar.armR < 2.75, 'de rechterarm houdt de hengel vooruit');
  assert.ok(klaar.elbowR > 0 && klaar.elbowR < 1.5, 'de elleboog is licht gebogen');
  assert.ok(Math.abs(hengelHouding('hengel', 0.4).armR - klaar.armR) < 0.1, 'het rusten is rustig');
});

t('uitwerpen: eerst naar achteren (inhalen), dan de zwiep naar voren', () => {
  const achter = hengelHouding('hengel-uit', 0.28), top = Math.max(...[0.5, 0.6, 0.7, 0.8].map((u) => hengelHouding('hengel-uit', u).armR));
  const eind = hengelHouding('hengel-uit', 0.8);
  assert.ok(achter.armR < klaar.armR - 0.3, 'de arm gaat naar achteren');
  assert.ok(top > klaar.armR + 0.4, 'daarna zwaait hij vooruit');
  assert.ok(eind.elbowR < achter.elbowR, 'de elleboog strekt bij de zwiep');
  assert.ok(Math.abs(eind.armR - klaar.armR) < 0.2, 'aan het eind staat de arm bijna weer klaar');
  for (const u of [0, 0.15, 0.35, 0.6, 1]) assert.ok(Number.isFinite(hengelHouding('hengel-uit', u).armR));
});

t('de ruk aan de hengel: meteen omhoog en daarna terug naar klaar', () => {
  const top = Math.max(...[0.05, 0.1, 0.15, 0.2].map((u) => hengelHouding('hengel-ruk', u).armR));
  assert.ok(top > klaar.armR + 0.3, 'de hengel gaat met een ruk omhoog');
  assert.ok(Math.abs(hengelHouding('hengel-ruk', 0.45).armR - klaar.armR) < 0.06, 'na de ruk staat hij weer klaar');
  assert.ok(hengelHouding('hengel-ruk', 0.1).chest < klaar.chest, 'je leunt iets achterover bij de ruk');
});

t('binnenhalen: de molen draait, dus de arm beweegt heen en weer', () => {
  const a = hengelHouding('hengel-haal', 0), b = hengelHouding('hengel-haal', 0.17), c = hengelHouding('hengel-haal', 0.35);
  assert.ok(Math.abs(a.elbowR - b.elbowR) > 0.1 || Math.abs(b.elbowR - c.elbowR) > 0.1, 'de elleboog draait');
  assert.ok(Math.abs(a.elbowL - b.elbowL) > 0.1, 'de andere hand slingert de molen');
});

t('elke houding heeft dezelfde velden, zodat applyPose nooit op undefined stuit', () => {
  const velden = Object.keys(klaar).sort();
  for (const p of ['hengel', 'hengel-uit', 'hengel-ruk', 'hengel-haal', 'iets-anders']) {
    assert.deepEqual(Object.keys(hengelHouding(p, 0.3)).sort(), velden, p);
  }
});

console.log(`hengelhouding_test: ${n}/${n} ok`);
