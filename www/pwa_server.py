#!/usr/bin/env python3
"""Godot 4.x HTML5 PWA server with required headers."""
import http.server
import os
import sys

BUILD_DIR = "/home/srinivasvkumar/vishruth/games/clusterrush/Builds/WebGL"
PORT = 8090

class GodotHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BUILD_DIR, **kwargs)
    
    def end_headers(self):
        # Godot 4.x requires these for SharedArrayBuffer (threading)
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        # CORS for PWA
        self.send_header("Access-Control-Allow-Origin", "*")
        # MIME types for WASM/worker
        super().end_headers()
    
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()
    
    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")

if __name__ == "__main__":
    handler = GodotHandler
    handler.directory = BUILD_DIR
    with http.server.HTTPServer(("0.0.0.0", PORT), handler) as httpd:
        print(f"Serving at http://0.0.0.0:{PORT}")
        print(f"Build dir: {BUILD_DIR}")
        httpd.serve_forever()
