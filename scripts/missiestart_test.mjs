// De visuele hiërarchie bij elke missiestart (game/js/missiestart.js; 23-11, akte 1 op eindniveau): één primair element (de doelbalk),
// klok en panelen pas na het instappen, de introkaart kort en onder de doelbalk, geen bijbaanprompt tijdens een missie. Puur: de regels
// zelf, en dat de runner (missions.js), het stuntpaneel (stunthud.js) en de bijbaanprompt (sidejobs.js) ze volgen.
//   node scripts/missiestart_test.mjs
import fs from 'node:fs';
import { startHierarchie, bijbaanPromptToegestaan, INTRO_MAX_S } from '../game/js/missiestart.js';

let bad = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };

// 1. de regels
const lopen = startHierarchie({ voertuig: true, ingestapt: false });
ok(lopen.primair === 'doel', 'het primaire element is altijd de doelbalk');
ok(!lopen.klokLoopt && !lopen.klokZichtbaar, 'met een missievoertuig: geen klok tot je instapt');
ok(!lopen.paneel && !lopen.intro, 'met een missievoertuig: geen paneel en geen introkaart tot je instapt');
const rijden = startHierarchie({ voertuig: true, ingestapt: true });
ok(rijden.klokLoopt && rijden.klokZichtbaar && rijden.paneel && rijden.intro, 'ingestapt: klok, paneel en introkaart');
const tevoet = startHierarchie({ voertuig: false });
ok(tevoet.klokLoopt && tevoet.paneel, 'een missie zonder eigen voertuig begint meteen');
ok(!startHierarchie({ voertuig: false, cinematic: true }).klokLoopt, 'tijdens een scène loopt de klok niet');
ok(startHierarchie({}).bijbaanPrompts === false, 'nooit bijbaanprompts in de hiërarchie van een missie');
ok(!bijbaanPromptToegestaan({ phase: 'active' }) && bijbaanPromptToegestaan({ phase: 'idle' }) && bijbaanPromptToegestaan(null), 'bijbaanprompt alleen buiten een actieve missie');
ok(INTRO_MAX_S > 0 && INTRO_MAX_S <= 5, 'de introkaart staat hoogstens 5 s', INTRO_MAX_S);

// 2. de runner, het paneel en de prompt volgen de regels (voor ELKE missie: de regel zit in de gedeelde tik, niet per missie)
const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const missions = bron('missions.js');
ok(/startHierarchie\(/.test(missions) && /function hierNu\(world\)/.test(missions), 'missions.js rekent de hiërarchie in de gedeelde tik');
ok(/hier\.klokLoopt\) chainState\(\)\.timeLeft -= dt/.test(missions), 'de klok van elke missie loopt pas als de hiërarchie het zegt');
ok(/pub\.timeLeft = [^\n]*ingestapt/.test(missions), 'de klok staat pas in de HUD na het instappen');
ok(/armStuntHud\(hier\.paneel\)/.test(missions), 'het stuntpaneel volgt de hiërarchie');
ok(/chainState\(\)\.ingestapt = false/.test(missions), 'elke missiestart begint niet-ingestapt');
const hud = bron('stunthud.js');
ok(!/stunt-brief \{[^}]*top: 22%/.test(hud), 'de introkaart staat niet meer midden over de actie (top 22%)');
ok(/stunt-brief \{[^}]*top: calc\(var\(--hud-goal-bottom/.test(hud), 'de introkaart staat onder de doelbalk');
ok(/BRIEF_TIME = INTRO_MAX_S/.test(hud), 'de introkaart volgt INTRO_MAX_S');
ok(/export function armStuntHud/.test(hud) && /if \(!state\.armed\) return;/.test(hud), 'het stuntpaneel wacht op armStuntHud');
const sj = bron('sidejobs.js');
ok(/if \(!bijbaanPromptToegestaan\(w\.mission\)\) return null;/.test(sj), 'sidejobs.js toont geen bijbaanprompt tijdens een missie');
ok(/if \(!bijbaanPromptToegestaan\(w\.mission\)\) return out;/.test(sj), 'en ook geen bijbaanbord met naam en icoon (sideJobSecondary)');

console.log(bad ? `missiestart_test: ${bad} van ${n} fout` : `missiestart_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
