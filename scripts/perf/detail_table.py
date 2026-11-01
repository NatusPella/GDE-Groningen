#!/usr/bin/env python3
"""Prints scripts/perf/detail.sh results as a Markdown table; several files one after the other."""
import json
import sys

COLS = [('avg', 'frame ms'), ('cpuAvg', 'cpu ms'), ('gpuAvg', 'gpu ms'), ('callsPerFrame', 'draw calls'), ('trisPerFrame', 'triangles'),
        ('materials', 'materials'), ('bldMeshes', 'bld meshes'), ('bldBoxes', 'bld boxes'), ('furniture', 'furniture'),
        ('lamps', 'lamps'), ('trees', 'trees')]

for f in sys.argv[1:]:
    try:
        d = json.load(open(f, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f, 'no result', e)
        continue
    print(f"{f}  dpr {d.get('dpr')} css {d.get('css')} gpu-timer {d.get('gpu')}")
    print('| area | ' + ' | '.join(h for _, h in COLS) + ' |')
    print('|---|' + '---:|' * len(COLS))
    for name, r in d['areas'].items():
        cells = []
        for k, _ in COLS:
            v = r.get(k)
            cells.append('-' if v is None else (f'{v / 1000:.0f}k' if k == 'trisPerFrame' else str(v)))
        print(f'| {name} | ' + ' | '.join(cells) + ' |')
