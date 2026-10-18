// First-load JS budget for the static export: gzips every <script src> in out/index.html and out/en/index.html
// (nomodule polyfills excluded: modern browsers never download them) and fails above the budget.
// Also prints the lazy chunks (motion runtime, shader) so the total is visible too.
// Usage: node scripts/check-bundle.mjs [budgetKB=150]
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const out = join(dirname(fileURLToPath(import.meta.url)), '../out');
const budget = Number(process.argv[2] ?? 150) * 1024;
const gz = async (p) => gzipSync(await readFile(join(out, p)), { level: 9 }).length;
let failed = false;
const allInitial = new Set();
for (const page of ['index.html', 'en/index.html']) {
  const html = await readFile(join(out, page), 'utf8');
  const srcs = [...html.matchAll(/<script\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => !/nomodule/i.test(tag))
    .map((tag) => tag.match(/\bsrc="([^"]+)"/)?.[1])
    .filter(Boolean);
  let total = 0;
  for (const s of new Set(srcs)) {
    total += await gz(s);
    allInitial.add(s.replace(/^\//, ''));
  }
  const ok = total <= budget;
  failed ||= !ok;
  process.stdout.write(
    `${ok ? 'ok  ' : 'FAIL'} ${page}: first-load JS ${(total / 1024).toFixed(1)} KB gz (budget ${budget / 1024} KB)\n`,
  );
}
const chunks = (await readdir(join(out, '_next/static/chunks'))).filter((f) => f.endsWith('.js'));
let lazy = 0;
for (const f of chunks) {
  const p = `_next/static/chunks/${f}`;
  if (allInitial.has(p)) continue;
  const size = await gz(p);
  const head = (await readFile(join(out, p), 'utf8')).slice(0, 4000);
  if (head.includes('core-js') || /Function\("return this"\)/.test(head)) continue; // nomodule polyfills
  lazy += size;
  process.stdout.write(`     lazy ${p}: ${(size / 1024).toFixed(1)} KB gz\n`);
}
process.stdout.write(
  `     lazy total ${(lazy / 1024).toFixed(1)} KB gz (motion runtime on first intent, shader after it)\n`,
);
process.exit(failed ? 1 : 0);
