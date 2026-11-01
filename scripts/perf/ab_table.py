#!/usr/bin/env python3
"""Medians (min-max) per route of interleaved A/B runs: ab_table.py <dir> <name>."""
import glob
import json
import statistics
import sys

d, name = sys.argv[1], sys.argv[2]
KEYS = ['callsPerFrame', 'trisPerFrame', 'programs', 'gpuAvg', 'longTasks', 'longMax', 'avg', 'p95', 'p99', 'cpuAvg', 'over50']
runs = {'A': [], 'B': []}
for side in runs:
    for f in sorted(glob.glob(f'{d}/{name}-{side}[0-9]*.json')):
        try:
            runs[side].append(json.load(open(f, encoding="utf-8")))
        except Exception:  # noqa: BLE001
            pass
print(f'{name}: A {len(runs["A"])} runs, B {len(runs["B"])} runs; load per run A {[r.get("load") for r in runs["A"]]} B {[r.get("load") for r in runs["B"]]}')
routes = []
for r in runs['A'] + runs['B']:
    for k in r['routes']:
        if k not in routes:
            routes.append(k)
print('route  side ' + ''.join(k[:9].rjust(16) for k in KEYS))
for route in routes:
    for side in 'AB':
        cells = []
        for k in KEYS:
            vals = [r['routes'][route][k] for r in runs[side] if r['routes'].get(route) and r['routes'][route].get(k) is not None]
            if not vals:
                cells.append('-'.rjust(16))
                continue
            m = statistics.median(vals)
            fmt = (lambda v: f'{v/1000:.0f}k') if k == 'trisPerFrame' else (lambda v: f'{v:.1f}' if isinstance(v, float) else str(v))
            cells.append(f'{fmt(m)} ({fmt(min(vals))}-{fmt(max(vals))})'.rjust(16))
        print(f'{route:6} {side}    ' + ''.join(cells))
