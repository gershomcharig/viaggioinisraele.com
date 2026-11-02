import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (filename !== path.resolve(root) && !filename.startsWith(root)) { response.writeHead(403).end(); return; }
    const info = await stat(filename);
    if (info.isDirectory() && !url.pathname.endsWith('/')) {
      response.writeHead(301, { Location: url.pathname + '/' + url.search }).end(); return;
    }
    const target = info.isDirectory() ? path.join(filename, 'index.html') : filename;
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
