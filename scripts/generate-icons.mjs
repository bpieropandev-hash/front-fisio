// One-off script: rasterizes src/assets/icons/icon-source.svg into the PNG sizes
// the PWA manifest and apple-touch-icon need. Run manually after editing the SVG
// source (`node scripts/generate-icons.mjs`) — output is versioned, not built on
// every `ng build`.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcSvg = join(__dirname, '../src/assets/icons/icon-source.svg');
const outDir = join(__dirname, '../src/assets/icons');

const manifestSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const appleTouchIconSize = 180;

async function run() {
  for (const size of manifestSizes) {
    const out = join(outDir, `icon-${size}.png`);
    await sharp(srcSvg).resize(size, size).png().toFile(out);
    console.log(`generated ${out}`);
  }

  const appleOut = join(outDir, `icon-${appleTouchIconSize}.png`);
  await sharp(srcSvg).resize(appleTouchIconSize, appleTouchIconSize).png().toFile(appleOut);
  console.log(`generated ${appleOut}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
