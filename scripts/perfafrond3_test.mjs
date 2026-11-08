// #653 punt 6 + #654: motorpolice/streetlife-tick, updateStory-throttle, missionstory-cache.
import fs from 'node:fs';
import { makeTick } from '../game/js/tickbudget.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const tel = (intervalMs) => { const t = makeTick(intervalMs); let c = 0, now = 0; for (let f = 0; f < 60; f++) { now += 1000 / 60; if (t(now)) c++; } return c; };
ok(tel(1500) <= 1, 'motorpolice: 60 frames in 1 s -> hooguit 1 scan (was 60)', tel(1500));
ok(tel(2000) <= 1, 'streetlife: 60 frames in 1 s -> hooguit 1 scan (was 60)', tel(2000));
ok(tel(200) >= 4 && tel(200) <= 6, 'updateStory: ~5x/s', tel(200));

const motor = fs.readFileSync(new URL('../game/js/motorpolice.js', import.meta.url), 'utf8');
ok(/scanT = MOTOR_SCAN_S/.test(motor), 'motorpolice gebruikt de 1,5 s-tick');
const street = fs.readFileSync(new URL('../game/js/streetlife.js', import.meta.url), 'utf8');
ok(/world\.pedestrians\.length !== lastPedCount \|\| dressT >= DRESS_SCAN_S/.test(street), 'streetlife: nieuwe voetganger of 2 s');
const story = fs.readFileSync(new URL('../game/js/story.js', import.meta.url), 'utf8');
// #758: één tick per aanroep bepalen en die twee keer gebruiken; twee losse aanroepen verbruikten dezelfde tick
ok((story.match(/storyTick\(performance\.now\(\)\)/g) || []).length === 1, 'updateStory: de 5 Hz-tick wordt één keer per frame bepaald');
ok(/const storyDue = started && storyTick\(performance\.now\(\)\);/.test(story) && /if \(storyDue\) \{\n      const kiss/.test(story) && /if \(storyDue \|\| state\.done\.size !== storyDoneSize \|\| curCache === null\)/.test(story), 'updateStory: dezelfde due voor de kus-unlock en de stappencache (#758)');
ok(/const cur = curCache;/.test(story), 'de volgende stap komt uit de cache');
const ms = fs.readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');
ok(/const list = r\._actorList \|\| \(r\._actorList =/.test(ms) && !/const list = \[\[r\.tammo/.test(ms), 'missionstory: actorenlijst één keer');
console.log('#653/#654 meting: motorpolice-scan 60 -> 1 per 1,5 s, streetlife-dress 60 -> 1 per 2 s (+ bij nieuwe voetganger), updateStory ~5x/s i.p.v. 60x/s, missionstory 0 array-allocaties per frame per scène');
console.log(`${n - fails}/${n} perfafrond3`);
process.exit(fails ? 1 : 0);
