import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain' };
// This project uses only exact-path redirects with literal from/to/status values.
const redirects = [...(await readFile(new URL('../netlify.toml', import.meta.url), 'utf8'))
  .matchAll(/\[\[redirects\]\]([\s\S]*?)(?=\n\[|$)/g)].map(([, block]) => ({
    from: block.match(/from = "([^"]+)"/)[1],
    to: block.match(/to = "([^"]+)"/)[1],
    status: Number(block.match(/status = (\d+)/)[1]),
  }));
export function createPreviewServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const redirect = redirects.find(rule => rule.from === url.pathname);
      if (redirect) {
        const target = new URL(redirect.to, url);
        target.search = url.search;
        response.writeHead(redirect.status, { Location: target.pathname + target.search + target.hash }).end();
        return;
      }
      const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (filename !== path.resolve(root) && !filename.startsWith(path.resolve(root) + path.sep)) { response.writeHead(403).end(); return; }
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
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createPreviewServer().listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
}
