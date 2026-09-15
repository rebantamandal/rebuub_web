"""Local static preview with the same clean routes as the Vercel build.
Run: python tools/serve.py [port]
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
import sys

ROOT = Path(__file__).resolve().parent.parent

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        route = unquote(urlparse(self.path).path).strip('/')
        requested = (ROOT / route).resolve()
        if not requested.is_relative_to(ROOT):
            self.send_error(403)
            return
        if route and not requested.exists():
            page = (ROOT / 'pages' / (route + '.html')).resolve()
            if page.is_relative_to(ROOT) and page.is_file():
                self.path = '/pages/' + route + '.html'
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write((ROOT / '404.html').read_bytes())
                return
        super().do_GET()

if __name__ == '__main__':
    try:
        port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
        if not 1 <= port <= 65535:
            raise ValueError('Port must be between 1 and 65535.')
        with ThreadingHTTPServer(('127.0.0.1', port), Handler) as server:
            print(f'Open http://127.0.0.1:{port} - press Ctrl+C to stop.', flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        pass
    except (ValueError, OSError) as exc:
        print(f'Cannot start preview: {exc}', file=sys.stderr)
        sys.exit(1)
