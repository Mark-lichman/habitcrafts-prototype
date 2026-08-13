#!/usr/bin/env node
/**
 * Zero-dependency static server for the HabitCrafts prototype.
 *
 * The prototype has no build step and no npm dependencies, and this keeps it
 * that way — it uses only Node built-ins. Opening the files by double-click
 * (file://) also works, but serving them over http:// is closer to how Vercel
 * will serve them and avoids file:// quirks.
 *
 *   node scripts/serve.js          -> http://localhost:5173
 *   node scripts/serve.js 8080     -> http://localhost:8080
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'prototype');
const PORT = Number(process.argv[2]) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  // Strip the query string, decode, and normalise. Reject anything that climbs
  // out of ROOT — this serves a local directory, so path traversal matters.
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (rel === '/') rel = '/index.html';

  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(full, (err, stat) => {
    // A bare directory falls back to its index.html.
    const target = !err && stat.isDirectory() ? path.join(full, 'index.html') : full;
    fs.readFile(target, (readErr, buf) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<pre>404 — ${rel}\n\nServing: ${ROOT}</pre>`);
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
        // Never cache during design review — a stale screen wastes everyone's time.
        'Cache-Control': 'no-store',
      });
      res.end(buf);
    });
  });
});

server.listen(PORT, () => {
  console.log(`HabitCrafts prototype  ->  http://localhost:${PORT}`);
  console.log(`serving ${ROOT}`);
  console.log('Ctrl+C to stop.');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is in use. Try: node scripts/serve.js ${PORT + 1}`);
    process.exit(1);
  }
  throw err;
});
