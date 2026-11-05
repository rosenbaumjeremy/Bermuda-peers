"""Local preview that sends the same Content-Security-Policy as the live site.

python serve.py [port]   (default 8770), then open http://localhost:8770
A plain `python -m http.server` sends no CSP, so it would hide anything the
live site blocks (inline styles, outside scripts).
"""
import functools
import http.server
import pathlib
import sys

SITE = pathlib.Path(__file__).resolve().parent / "site"
CSP = next(
    line.split(":", 1)[1].strip()
    for line in (SITE / "_headers").read_text(encoding="utf-8").splitlines()
    if line.strip().startswith("Content-Security-Policy:")
)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8770
http.server.ThreadingHTTPServer(
    ("127.0.0.1", port), functools.partial(Handler, directory=str(SITE))
).serve_forever()
