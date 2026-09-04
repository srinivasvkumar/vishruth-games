# PWA Server — COOP/COEP headers + Brotli compression
# Usage: python server.py
# Serves on port 9877 with proper headers for Godot 4.x WebGL

import http.server
import socketserver
import os
import sys
import gzip
import brotli

BUILD_DIR = "/home/srinivasvkumar/vishruth/games/clusterrush/Builds/WebGL"
PORT = 9877

CONTENT_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.wasm': 'application/wasm',
    '.css': 'text/css',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.txt': 'text/plain',
}

class WebServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BUILD_DIR, **kwargs)
    
    def end_headers(self):
        # Cross-Origin Isolation headers — REQUIRED for Godot 4.x
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        
        # Security headers
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        
        # Cache headers
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        
        # Brotli/Gzip support
        accept_encoding = self.headers.get('Accept-Encoding', '')
        if 'br' in accept_encoding and self.path.endswith(('.wasm', '.js', '.html', '.json', '.css')):
            try:
                with open(os.path.join(BUILD_DIR, self.path.lstrip('/')), 'rb') as f:
                    content = f.read()
                compressed = brotli.compress(content)
                self.send_header("Content-Encoding", "br")
                self.send_header("Vary", "Accept-Encoding")
                self.wfile.write(compressed)
                return
            except Exception:
                pass
        
        super().end_headers()
    
    def log_message(self, format, *args):
        pass

print(f"🎮 Cluster Rush Server")
print(f"   URL: http://localhost:{PORT}")
print(f"   Build: {BUILD_DIR}")
print(f"   COOP/COEP: Enabled")
print(f"   Brotli: Enabled")
sys.stdout.flush()

with socketserver.TCPServer(("0.0.0.0", PORT), WebServer) as httpd:
    print(f"   Serving on port {PORT}...")
    httpd.serve_forever()
