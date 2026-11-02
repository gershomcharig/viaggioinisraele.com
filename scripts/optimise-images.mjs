// Run manually after changing source photos. Generated variants are committed;
// normal builds do not need cwebp (brew install webp).
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const template = await readFile(path.join(root, 'src/home.html'), 'utf8');
await mkdir(path.join(root, 'images/responsive'), { recursive: true });
for (const [tag] of template.matchAll(/<img\b[^>]+>/g)) {
  const source = tag.match(/src="\/images\/([^"/]+)\.webp"/)?.[1];
  const width = Number(tag.match(/\bwidth="(\d+)"/)?.[1]);
  if (!source || !width) throw new Error(`Missing source/dimensions: ${tag}`);
  if (width <= 480) continue;
  for (const target of [...new Set([480, 960, 1440, width])].filter(target => target <= width)) {
    execFileSync('cwebp', ['-quiet', '-q', '78', '-m', '6', '-resize', String(target), '0',
      path.join(root, `images/${source}.webp`), '-o', path.join(root, `images/responsive/${source}-${target}.webp`)]);
  }
}
console.log('Generated responsive WebP photos.');
