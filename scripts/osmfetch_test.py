"""osmfetch.overpass with a mocked transport: next endpoint on failure, Retry-After and backoff, no network."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import osmfetch as O  # noqa: E402

calls, sleeps = [], []
O.time.sleep = sleeps.append
O.URLS[:] = ["a", "b"]


def script(*answers):
    it = iter(answers)

    def once(url, query, timeout=300):
        calls.append(url)
        return next(it)
    O.overpass_once = once


script((429, "", 30), (200, '{"elements": [1]}', 0))
assert O.overpass("q", key="elements") == [1] and calls == ["a", "b"] and not sleeps
calls.clear()
script((429, "", 30), (504, "", 0), (200, '{"elements": [2]}', 0))
assert O.overpass("q", key="elements") == [2] and calls == ["a", "b", "a"] and sleeps == [30], sleeps
script(*[(0, "", 0)] * 4)
try:
    O.overpass("q", attempts=2)
    raise AssertionError("expected SystemExit")
except SystemExit:
    pass
print("osmfetch_test: ok")
