const fs = require('fs');
const f = 'scripts/coop_coverage.json';
let s = fs.readFileSync(f, 'utf8');
const a = '"coopgroep","samenposten"]';
if (!s.includes(a)) throw new Error('niet gevonden');
s = s.replace(a, '"coopgroep","samenposten","careermoments*","careertour*","characterdossiers*","dialogueform*","homebase*","reputation*","unlockgate*"]');
fs.writeFileSync(f, s);
console.log('ok');
