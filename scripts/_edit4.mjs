import fs from 'node:fs';
let f = 'game/js/net/codec.js';
let s = fs.readFileSync(f, 'utf8'); const crlf = s.includes('\r\n'); if (crlf) s = s.replace(/\r\n/g, '\n');
const a = "if (nt <= LOOK_TUNE && o + nt <= end) { let t = ''; for (let i = 0; i < nt; i++) t += String.fromCharCode(v.getUint8(o + i)); l.tune = t; }";
if (!s.includes(a)) throw new Error('x');
s = s.replace(a, "if (nt <= LOOK_TUNE && o + nt <= end) { let t = ''; for (let i = 0; i < nt; i++) t += String.fromCharCode(v.getUint8(o + i)); if (/^[\x21-\x7e]+$/.test(t)) l.tune = t; } // dezelfde tekenset als writeLook: een afwijkende host levert geen onleesbare tekens (review 22-11, N3)");
if (crlf) s = s.replace(/\n/g, '\r\n'); fs.writeFileSync(f, s);
