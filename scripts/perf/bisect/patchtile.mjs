import fs from 'node:fs';
const f = process.argv[2];
let s = fs.readFileSync(f, 'utf8');
s = s.replace("    this.resident.add(tk);\n    const newRoads = [], newWater = [];", "    this.resident.add(tk);\n    console.log('[trailer] btile + ' + tk + ' t' + Math.round(performance.now()));\n    const newRoads = [], newWater = [];");
s = s.replace("    if (!this.resident.delete(tk)) return false;\n    for (const fn of this._tileListeners", "    if (!this.resident.delete(tk)) return false;\n    console.log('[trailer] btile - ' + tk + ' t' + Math.round(performance.now()));\n    for (const fn of this._tileListeners");
fs.writeFileSync(f, s); console.log(s.includes('btile +'), s.includes('btile -'));
