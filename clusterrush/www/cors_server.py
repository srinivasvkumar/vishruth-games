#!/usr/bin/env python3
"""
Simple CORS-enabled HTTP server for Cluster Rush WebGL build.
Serves files from the current directory with CORS headers.
"""

import http.server
import socketserver
import os

PORT = 8765

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)) or '.')
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        print(f"Serving with CORS on port {PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    main()
