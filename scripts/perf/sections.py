#!/usr/bin/env python3
"""Main-thread ms per frame by category from run.sh results made with --hitch
(hitchprobe.js sections), one line per route; several files are averaged per
route (A/B: pass all runs of one side)."""
import json
import sys
from collections import defaultdict

CAT = {
    'sim/AI': ['populate', 'player', 'traffic', 'police+collide', 'combat', 'peds', 'wildlife', 'systems', 'phone+save', 'story'],
    'stream/geo': ['cityprops', '3d:buildings', '3d:grass', '3d:water', '3d:roads', '3d:trees', '3d:rail+country', '3d:farlod', '3d:prewarm', 'mapfollow'],
    'actors3d': ['3d:vehicles', '3d:vehfx', '3d:peds', '3d:props+wildlife', '3d:players', '3d:markers+combat'],
    'hud/dom': ['hud'],
    'audio': ['audio'],
    'render': ['3d:render'],
    'cam/env/fx': ['3d:camera', '3d:lights', '3d:tod+weather', '3d:env', 'fx+gore'],
}
DETAIL = ['cityprops', '3d:rail+country', '3d:roads', '3d:buildings', '3d:water', '3d:prewarm']

acc = defaultdict(lambda: defaultdict(list))
for f in sys.argv[1:]:
    d = json.load(open(f))
    for k, r in d['routes'].items():
        if not r or 'hitch' not in r or 'sections' not in r['hitch']:
            continue
        s = r['hitch']['sections']
        a = acc[k]
        a['frame'].append(s.get('frame', 0))
        for c, xs in CAT.items():
            a[c].append(sum(s.get(x, 0) for x in xs))
        for x in DETAIL:
            a[x].append(s.get(x, 0))
        a['long'].append(r['longTasks'])
        a['over50'].append(r['over50'])
        a['frames'].append(r['frames'])

mean = lambda v: sum(v) / max(1, len(v))
for k, a in acc.items():
    fr = mean(a['frame'])
    cats = '  '.join(f"{c} {mean(a[c]):.1f} ({mean(a[c]) / fr * 100:.0f}%)" for c in CAT)
    det = '  '.join(f"{x} {mean(a[x]):.2f}" for x in DETAIL)
    print(f"{k:8} n={len(a['frame'])} frame {fr:.1f} ms  {cats}")
    print(f"{'':8} {det}  long {mean(a['long']):.1f} >50ms {mean(a['over50']):.1f} frames {mean(a['frames']):.0f}")
