// Crops single app screens out of the composite screenshots in docs/screenshots, so the landing page can show
// them inside CSS device frames. Coordinates are in each source image's own pixels.
// Usage: node scripts/screens.mjs
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, '../../docs/screenshots');
const outDir = join(root, 'public/screens');
await mkdir(outDir, { recursive: true });

// [source, scale from the 2000 px preview to the original, x, y, w, h] (preview coordinates)
const SCREENS = {
  till: ['act1-payment-moment.png', 1.679, 40, 42, 293, 648],
  qr: ['act1-payment-moment.png', 1.679, 364, 42, 290, 648],
  confirm: ['act1-payment-moment.png', 1.679, 688, 42, 296, 648],
  paid: ['act1-payment-moment.png', 1.679, 1017, 42, 296, 648],
  'till-paid': ['act1-payment-moment.png', 1.679, 1346, 42, 290, 648],
  receipt: ['act1-payment-moment.png', 1.679, 1670, 42, 290, 648],
  wallet: ['showcase-app.png', 1.2, 0, 0, 320, 721],
  'wallet-dark': ['showcase-app.png', 1.2, 336, 0, 320, 721],
  'till-ready': ['showcase-app.png', 1.2, 672, 0, 320, 721],
  'merchant-wallet': ['showcase-app.png', 1.2, 1008, 0, 320, 721],
  profile: ['showcase-app.png', 1.2, 1344, 0, 320, 721],
  pin: ['showcase-app.png', 1.2, 1680, 0, 320, 721],
  welcome: ['showcase-onboarding.png', 1.2, 0, 0, 385, 867],
  'pin-set': ['showcase-onboarding.png', 1.2, 1212, 0, 385, 867],
  device: ['showcase-onboarding.png', 1.2, 1615, 0, 385, 867],
};

for (const [name, [file, s, x, y, w, h]] of Object.entries(SCREENS)) {
  const img = sharp(join(shots, file));
  const meta = await img.metadata();
  const left = Math.round(x * s);
  const top = Math.round(y * s);
  const width = Math.min(Math.round(w * s), meta.width - left);
  const height = Math.min(Math.round(h * s), meta.height - top);
  const base = img
    .extract({ left, top, width, height })
    .resize({ width: 460, height: 996, fit: 'cover', position: 'top' });
  await base
    .clone()
    .avif({ quality: 60 })
    .toFile(join(outDir, `${name}.avif`));
  await base
    .clone()
    .webp({ quality: 82 })
    .toFile(join(outDir, `${name}.webp`));
  process.stdout.write(`screen ${name}\n`);
}
