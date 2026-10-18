// Downloads every painting in art-manifest.json from the museum's own open-access endpoint into art-src/,
// and refuses any object the museum itself does not mark as public domain / CC0.
// Writes art-src/records.json, the raw licence evidence ASSETS.md is written from.
// Usage: node scripts/fetch-art.mjs
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'art-src');
const manifest = JSON.parse(await readFile(join(root, 'scripts/art-manifest.json'), 'utf8'));

const PD_RIGHTS = new Set([
  'https://creativecommons.org/publicdomain/mark/1.0/',
  'https://creativecommons.org/publicdomain/zero/1.0/',
  'http://creativecommons.org/publicdomain/zero/1.0/',
]);

async function json(url, accept = 'application/json') {
  const res = await fetch(url, { headers: { Accept: accept } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function met(id) {
  const o = await json(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
  if (o.isPublicDomain !== true) throw new Error(`Met ${id} is not isPublicDomain=true`);
  return {
    title: o.title,
    artist: o.artistDisplayName,
    date: o.objectDate,
    collection: `The Metropolitan Museum of Art (${o.creditLine})`,
    objectUrl: o.objectURL,
    licence: 'CC0 1.0 (Met Open Access, isPublicDomain=true)',
    image: o.primaryImage,
  };
}

async function rijks(id) {
  const o = await json(`${id}?_profile=dc`, 'application/ld+json');
  const rights = o.rights?.['@id'];
  if (!PD_RIGHTS.has(rights)) throw new Error(`Rijksmuseum ${id} rights are ${rights}`);
  const creator = Array.isArray(o.creator?.title) ? o.creator.title[0] : (o.creator?.title ?? 'anonymous');
  // IIIF: cap the long edge at 3000 px; that is enough for a 2048 px crop.
  const image = o.relation['@id'].replace('/full/max/', '/full/!3000,3000/');
  return {
    title: o.title,
    artist: creator,
    date: o.date,
    collection: `Rijksmuseum, Amsterdam (${o.identifier})`,
    // The persistent identifier redirects browsers to the collection page (page slugs change, this doesn't).
    objectUrl: id,
    licence:
      rights === 'https://creativecommons.org/publicdomain/mark/1.0/'
        ? 'Public Domain Mark 1.0 (Rijksmuseum)'
        : 'CC0 1.0 (Rijksmuseum)',
    image,
    dataUrl: id,
  };
}

await mkdir(outDir, { recursive: true });
const records = [];
for (const item of manifest) {
  const rec = item.source === 'met' ? await met(item.id) : await rijks(item.id);
  const file = join(outDir, `${item.slug}.jpg`);
  const exists = await stat(file).then(
    () => true,
    () => false,
  );
  if (!exists) {
    const res = await fetch(rec.image);
    if (!res.ok) throw new Error(`${res.status} ${rec.image}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  records.push({
    ...item,
    ...rec,
    file: `art-src/${item.slug}.jpg`,
    checked: new Date().toISOString().slice(0, 10),
  });
  process.stdout.write(`ok ${item.slug}: ${rec.title} (${rec.licence})\n`);
}
await writeFile(join(outDir, 'records.json'), `${JSON.stringify(records, null, 2)}\n`);
