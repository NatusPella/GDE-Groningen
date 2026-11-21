// Workflows: geen ${{ inputs.* }} (behalve booleans) of github.head_ref rechtstreeks in een run-script
// (injectie via env:), en elke workflow met workflow_dispatch-invoer heeft een owner-guard op elke taak
// (security-review 22-11).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../.github/workflows/', import.meta.url));
let n = 0;

function check(f, i, l, boolInputs) {
  for (const m of l.matchAll(/\$\{\{\s*(?:inputs\.(\w+)|github\.head_ref)/g)) {
    if (m[1] && boolInputs.has(m[1])) continue; // een boolean kan geen shell bevatten
    assert.fail(`${f}:${i + 1}: expressie in run-script, gebruik env: ${l.trim()}`);
  }
}

for (const f of fs.readdirSync(dir).filter((x) => /\.ya?ml$/.test(x))) {
  const txt = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
  const lines = txt.split('\n');
  const boolInputs = new Set([...txt.matchAll(/^ {6}(\w+):\n(?: {8}.*\n)*? {8}type: boolean/gm)].map((x) => x[1]));
  let inRun = false, runIndent = 0;
  lines.forEach((l, i) => {
    const m = /^(\s*)(- )?run:\s*(.*)$/.exec(l);
    if (m) {
      runIndent = m[1].length + (m[2] ? 2 : 0);
      inRun = /^[|>]/.test(m[3]);
      if (!inRun) check(f, i, m[3], boolInputs);
      return;
    }
    if (inRun) {
      const ind = l.length - l.trimStart().length;
      if (l.trim() && ind <= runIndent) inRun = false; else check(f, i, l, boolInputs);
    }
  });
  if (/workflow_dispatch:\n\s+inputs:/.test(txt)) {
    const jobs = txt.split(/^jobs:\s*$/m)[1] || '';
    const jobCount = (jobs.match(/^ {2}[A-Za-z0-9_-]+:\s*$/gm) || []).length;
    const guards = (jobs.match(/^ {4}if: github\.actor == github\.repository_owner/gm) || []).length;
    assert.equal(guards, jobCount, `${f}: elke taak heeft de owner-guard (${guards}/${jobCount})`);
  }
  n++;
}
console.log(`workflow_inputs_test: ${n} workflows ok`);
