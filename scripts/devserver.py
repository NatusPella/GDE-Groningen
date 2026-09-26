#!/usr/bin/env python3
"""Static file server for the game dir that disables caching entirely -
the preview browser was aggressively caching stale JS/HTML across restarts
since plain http.server sends no Cache-Control header at all."""
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.1 + keep-alive so the ~25 module files this page imports reuse
    # a handful of connections instead of opening a fresh TCP connection
    # per file - at HTTP/1.0 a burst of that many simultaneous connections
    # regularly exceeded the default listen() backlog and got RST by the OS
    # (intermittent net::ERR_CONNECTION_RESET on page load).
    protocol_version = "HTTP/1.1"

    # Python reads MIME types from the Windows registry, which on some PCs
    # maps .js to text/plain - browsers then refuse to run ES modules. Pin
    # the types the game needs so it works the same on every OS.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
        ".wasm": "application/wasm",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
    }

    # The changelog lives in the repo root, one level above the game dir;
    # the start screen fetches it as ./CHANGELOG.md.
    def translate_path(self, path):
        local = super().translate_path(path)
        if path.split("?", 1)[0] == "/CHANGELOG.md" and not os.path.exists(local):
            root = os.path.join(os.path.dirname(local), "..", "CHANGELOG.md")
            if os.path.exists(root):
                return os.path.abspath(root)
        return local

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
    host = sys.argv[3] if len(sys.argv) > 3 else ""  # "" = all interfaces
    handler = lambda *a, **kw: NoCacheHandler(*a, directory=directory, **kw)
    try:
        Server((host, port), handler).serve_forever()
    except KeyboardInterrupt:
        pass
