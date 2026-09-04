import http.server
import socketserver

PORT = 8765
DIR = "/home/srinivasvkumar/vishruth/games/clusterrush/Builds/WebGL"

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIR, **k)
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        super().end_headers()

s = socketserver.TCPServer(("", PORT), H)
s.serve_forever()
