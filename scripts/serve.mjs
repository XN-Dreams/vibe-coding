import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';
import { resolveSitePath } from './lib/safe-path.mjs';

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORT = 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  // Every containment decision lives in resolveSitePath, which is unit-tested.
  // null means the request pointed outside site/ — see tests/safe-path.test.mjs.
  const path = resolveSitePath(siteRoot, req.url);

  if (path === null) {
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
