# PWA Server - COOP/COEP headers for Godot 4.x WebGL
import http.server
import socketserver
import os
import sys

BUILD_DIR = "/home/srinivasvkumar/vishruth/games/clusterrush/Builds/WebGL"
PORT = 9877

class WebServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BUILD_DIR, **kwargs)
    
    def end_headers(self):
        # Cross-Origin Isolation headers
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()
    
    def log_message(self, format, *args):
        pass

print(f"Serving on port {PORT} from {BUILD_DIR}")
print(f"URL: http://localhost:{PORT}/index.html")
sys.stdout.flush()

with socketserver.TCPServer(("0.0.0.0", PORT), WebServer) as httpd:
    httpd.serve_forever()
