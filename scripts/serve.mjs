import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORT = 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  const requested = decodeURIComponent(req.url.split('?')[0]);

  // join() collapses any ".." the caller sent, so the resolved path either
  // still sits inside site/ or it does not. That single check is the guard:
  // without it, a request for /../../../../etc/passwd walks straight out of
  // the directory we meant to serve.
  const path = join(siteRoot, requested === '/' ? 'index.html' : requested);

  if (!path.startsWith(siteRoot)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`Serving site/ on http://localhost:${PORT}`));
