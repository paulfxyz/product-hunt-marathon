# Local server that mimics the .htaccess clean URLs (/hunt -> hunt/index.html).
import http.server, os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
    def send_head(s):
        p = s.path.split('?')[0].split('#')[0]
        fs = s.translate_path(p)
        if os.path.isdir(fs) and os.path.isfile(os.path.join(fs, 'index.html')):
            s.path = p.rstrip('/') + '/index.html'
        return super().send_head()
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8931), H).serve_forever()
