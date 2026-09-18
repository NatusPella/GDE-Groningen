#!/usr/bin/env python3
"""Static file server for the game dir that disables caching entirely -
the preview browser was aggressively caching stale JS/HTML across restarts
since plain http.server sends no Cache-Control header at all."""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.1 + keep-alive so the ~25 module files this page imports reuse
    # a handful of connections instead of opening a fresh TCP connection
    # per file - at HTTP/1.0 a burst of that many simultaneous connections
    # regularly exceeded the default listen() backlog and got RST by the OS
    # (intermittent net::ERR_CONNECTION_RESET on page load).
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    directory = sys.argv[2] if len(sys.argv) > 2 else "."
    handler = lambda *a, **kw: NoCacheHandler(*a, directory=directory, **kw)
    Server(("", port), handler).serve_forever()
