"""Local preview server with the same clean URLs as the live site.

    python3 serve.py          then open http://localhost:5173

/projects serves projects.html, /shelf serves shelf.html, and /projects.html redirects
to /projects, matching "cleanUrls" in vercel.json. Ctrl+C stops it.
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = os.path.dirname(os.path.abspath(__file__))


class CleanHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path, _, query = self.path.partition("?")
        # /page.html -> /page (and /index.html -> /)
        if path.endswith(".html"):
            clean = path[: -len(".html")]
            clean = clean[: -len("index")] if clean.endswith("/index") or clean == "/index" else clean
            self.send_response(308)
            self.send_header("Location", (clean or "/") + (f"?{query}" if query else ""))
            self.end_headers()
            return
        # /page -> serve page.html
        if path != "/" and "." not in os.path.basename(path):
            if os.path.isfile(os.path.join(ROOT, path.lstrip("/") + ".html")):
                self.path = path + ".html" + (f"?{query}" if query else "")
        super().do_GET()


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("", PORT), CleanHandler) as httpd:
        print(f"serving on http://localhost:{PORT}")
        httpd.serve_forever()
