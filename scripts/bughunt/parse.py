import json, sys
s = open(sys.argv[1], encoding="utf-8").read()
if '[smoke error]' in s:
    print('SMOKE ERROR', s[s.index('[smoke error]'):][:300])
i = s.index('[perf-script]')
j = json.loads(s[i + 14:s.index('\n}\n', i) + 2])
print('points', j['points'], 'rides', j.get('rides'))
if 'fps' in j:
    low = sorted(j['fps'].items(), key=lambda kv: kv[1])[:25]
    print('lowest fps', low)
for x in j['issues']:
    print('I', x[:300])
for x in j['errors']:
    print('E', x[:500])
for x in j['warnings']:
    print('W', x[:400])
print('spikes', json.dumps(j['spikes'])[:800])
for m in j['mem']:
    print(m)
