#!/usr/bin/env python3
"""Prints scripts/perf/run.sh results as a table; several files side by side."""
import json
import sys

COLS = [('avg', 'avg ms'), ('p95', 'p95'), ('p99', 'p99'), ('cpuAvg', 'cpu'), ('cpuP95', 'cpu95'), ('gpuAvg', 'gpu'),
        ('callsPerFrame', 'calls'), ('trisPerFrame', 'tris'), ('programs', 'progs'), ('textures', 'tex'),
        ('longTasks', 'long'), ('longMax', 'longMax'), ('over50', '>50ms')]

for f in sys.argv[1:]:
    try:
        d = json.load(open(f, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f, 'no result', e)
        continue
    print(f"{f}  dpr {d.get('dpr')} css {d.get('css')} gpu-timer {d.get('gpu')} q {d.get('settings', {}).get('quality')}")
    print('route   ' + ''.join(h.rjust(9) for _, h in COLS))
    for name, r in d['routes'].items():
        if not r:
            continue
        cells = []
        for k, _ in COLS:
            v = r.get(k)
            cells.append(('-' if v is None else (f'{v/1000:.0f}k' if k == 'trisPerFrame' else str(v))).rjust(9))
        print(name.ljust(8) + ''.join(cells))
