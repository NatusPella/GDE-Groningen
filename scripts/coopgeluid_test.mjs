// Samen spelen (#434): het geluid bij een gast klinkt zoals bij de host. Een gast heeft in zijn eigen spel geen voertuig, ook niet als hij bij de host in
// een auto of boot zit; sfx/ambience.js leest dan world.coopZit (de soort voertuig, coopnet.js), zodat een dichte cabine het gemurmel van de menigte,
// de wind en het verkeer net zo dempt als bij de host.
// Ook de dempstand (de toets, de indicator op de HUD en het weer starten van de audio-context) en het niveau van de pratende mensen staan hier:
// de rekenregels in coopgeluid.js en de bedrading in audio.js en hud_panel.js.
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { rijdtIn } = await import('../game/js/sfx/ambience.js');
const G = await import('../game/js/coopgeluid.js');

let n = 0;
const t = (name, f) => { f(); n++; };
const dicht = (v) => !!v && !v.isBike && !v.isScooter && !v.isBoat; // zoals ambience.js setTargets en scan

t('de host rijdt in zijn eigen voertuig, niets verandert', () => {
  const v = { isBoat: true };
  assert.equal(rijdtIn({ player: { inVehicle: v } }), v);
  assert.equal(rijdtIn({ player: { inVehicle: null } }), null);
  assert.equal(rijdtIn({ player: {}, coopZit: 'auto' }), null, 'niet als gast: world.coopZit telt niet');
});
t('een gast in een auto, bus of politieauto zit in een dichte cabine; op een fiets, scooter, motor of in een boot niet', () => {
  for (const z of ['auto', 'bus', 'politie', 'bakkie', 'vracht', 'heli']) assert.equal(dicht(rijdtIn({ player: {}, coopRole: 'client', coopZit: z })), true, z);
  for (const z of ['fiets', 'scooter', 'motor', 'boot']) assert.equal(dicht(rijdtIn({ player: {}, coopRole: 'client', coopZit: z })), false, z);
  assert.equal(rijdtIn({ player: {}, coopRole: 'client', coopZit: null }), null, 'te voet: de open lucht');
});

// --- de pratende mensen onder de effecten ------------------------------------
t('een ambient stem staat op de helft van zijn oude niveau', () => {
  assert.ok(G.STEM_NIVEAU > 0 && G.STEM_NIVEAU < 1, 'duidelijk onder de effecten, maar hoorbaar');
  assert.equal(G.stemNiveau(1), G.STEM_NIVEAU);
  assert.equal(G.stemNiveau(0.5), G.STEM_NIVEAU * 0.5);
  assert.equal(G.stemNiveau(0), 0);
});
t('een rare basis wordt een veilig niveau: nooit harder dan vol, nooit onder nul', () => {
  assert.equal(G.stemNiveau(-3), 0);
  assert.equal(G.stemNiveau(4), G.STEM_NIVEAU);
  assert.equal(G.stemNiveau(NaN), G.STEM_NIVEAU);
  assert.equal(G.stemNiveau('hard'), G.STEM_NIVEAU);
  assert.equal(G.stemNiveau(undefined), G.STEM_NIVEAU);
});

// --- dempen is terug te draaien --------------------------------------------
t('de indicator noemt de toets, en op een touch-toestel de tik', () => {
  assert.equal(G.dempHint(), 'U: geluid');
  assert.equal(G.dempHint({ touch: false }), 'U: geluid');
  assert.equal(G.dempHint({ touch: true }), 'tik: geluid');
});
t('de melding bij dempen zegt meteen hoe je het weer aanzet', () => {
  assert.equal(G.dempMelding(false), 'Geluid aan');
  assert.equal(G.dempMelding(false, { touch: true }), 'Geluid aan');
  const pc = G.dempMelding(true);
  assert.ok(pc.includes('Geluid uit') && pc.includes('U'), pc);
  const touch = G.dempMelding(true, { touch: true });
  assert.ok(touch.includes('Geluid uit') && /tik/i.test(touch), touch);
  assert.ok(!touch.includes('Druk op U'), 'op een touch-toestel geen toets die er niet is');
});

// --- de bedrading -----------------------------------------------------------
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const audio = src('game/js/audio.js').replace(/\/\/[^\n]*/g, '');
const hud = src('game/js/hud_panel.js').replace(/\/\/[^\n]*/g, '');

t('audio.js zet de pratende mensen op het niveau uit coopgeluid.js', () => {
  assert.match(audio, /import \{[^}]*stemNiveau[^}]*\} from '\.\/coopgeluid\.js'/);
  assert.match(audio, /playNpcSpokenClip[\s\S]{0,400}stemNiveau\(1\)/);
});
t('de demptoets werkt ook zonder audio-context (een gast met een bewaarde dempstand)', () => {
  const i = audio.indexOf('wasPressed(\'u\')');
  const guard = audio.indexOf('if (!ctx || !worldReady)');
  assert.ok(i !== -1 && guard !== -1 && i < guard, 'de toets staat vóór de ctx-controle');
  assert.match(audio, /if \(!menuAudio && !SILENT_MODE && world\.input && world\.input\.wasPressed\('u'\)\) toggleMute\(\)/);
});
t('na dempen start de audio-context weer en blijft de stand bewaard', () => {
  const fn = audio.slice(audio.indexOf('export function setMuted'), audio.indexOf('export function toggleMute'));
  assert.match(fn, /saveMuted\(\)/);
  assert.match(fn, /resumeCtx\('unmute'\)/);
  assert.match(fn, /unlockAudio\(\)/);
  assert.match(fn, /dempMelding\(muted/);
});
t('de HUD-indicator is een knop die het geluid weer aanzet, met de toets erbij', () => {
  assert.match(hud, /<button[^>]*class="hud-chip hud-mute"/);
  assert.match(hud, /import \{[^}]*toggleMute[^}]*\} from '\.\/audio\.js'/);
  assert.match(hud, /els\.mute\.addEventListener\('click'[\s\S]{0,200}toggleMute\(\)/);
  assert.match(hud, /dempHint\(\{ touch \}\)/);
  assert.match(hud, /els\.mute\.hidden = !demp/);
});

console.log(`coopgeluid_test: ${n}/${n} ok`);
