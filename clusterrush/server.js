const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const DIR = path.join(__dirname, 'Builds', 'WebGL');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.pck': 'application/octet-stream',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
});

// Add COOP/COEP headers for SharedArrayBuffer support
const originalSendHead = http.ServerResponse.prototype.writeHead;
http.ServerResponse.prototype.writeHead = function(statusCode, statusMessage, headers) {
  if (typeof statusMessage === 'object') {
    headers = statusMessage;
    statusMessage = undefined;
  }
  if (!headers) {
    headers = {};
  }
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
  return originalSendHead.call(this, statusCode, statusMessage, headers);
};
