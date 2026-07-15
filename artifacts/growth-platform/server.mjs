import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'dist/public');
const port = process.env.PORT || 5000;
const apiBackend = process.env.API_BACKEND; // e.g. "http://127.0.0.1:5007"

const server = http.createServer((req, res) => {
  let filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url);
  
  // Optional proxy: forward any /api/* requests to API_BACKEND when configured.
  if (apiBackend && req.url && req.url.startsWith('/api/')) {
    try {
      const backend = new URL(apiBackend);
      const proxyOptions = {
        protocol: backend.protocol,
        hostname: backend.hostname,
        port: backend.port || (backend.protocol === 'https:' ? 443 : 80),
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: backend.host },
      };

      const proxyReq = (backend.protocol === 'https:' ? https : http).request(proxyOptions, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on('error', () => {
        res.writeHead(502);
        res.end('Bad Gateway');
      });

      req.pipe(proxyReq, { end: true });
      return;
    } catch (err) {
      res.writeHead(502);
      res.end('Bad Gateway');
      return;
    }
  }

  // Normalize path to prevent directory traversal
  filePath = path.normalize(filePath);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // If requesting a directory or file doesn't exist, serve index.html (SPA fallback)
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    filePath = path.join(publicDir, 'index.html');
  }

  // Serve the file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    // Set content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
