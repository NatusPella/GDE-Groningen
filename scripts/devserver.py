#!/usr/bin/env python3
"""Static file server for the game dir that disables caching entirely -
the preview browser was aggressively caching stale JS/HTML across restarts
since plain http.server sends no Cache-Control header at all."""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    directory = sys.argv[2] if len(sys.argv) > 2 else "."
    handler = lambda *a, **kw: NoCacheHandler(*a, directory=directory, **kw)
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
