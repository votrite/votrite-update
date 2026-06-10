/*
 * Tiny static server for the accessibility harness.
 * Serves the Laravel app root (one level up) on http://127.0.0.1:8080 so the
 * harness pages can load ../public/assets/... over http.
 *
 *   node serve.mjs        (Ctrl+C to stop)
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..'); // app root
const PORT = 8080;
const HOST = '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(req.url.split('?')[0]);
    if (path === '/') path = '/accessibility-harness/candidate-selection.html';
    const full = normalize(join(ROOT, path));
    if (!full.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
    const s = await stat(full);
    const target = s.isDirectory() ? join(full, 'index.html') : full;
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': TYPES[extname(target).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Harness server running:`);
  console.log(`  http://${HOST}:${PORT}/accessibility-harness/candidate-selection.html`);
  console.log(`  http://${HOST}:${PORT}/accessibility-harness/propositions.html`);
  console.log(`  http://${HOST}:${PORT}/accessibility-harness/review.html`);
});
