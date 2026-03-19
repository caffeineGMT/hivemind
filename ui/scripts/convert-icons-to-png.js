import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

async function convertSvgToPng(svgPath, pngPath) {
  try {
    await sharp(svgPath)
      .png()
      .toFile(pngPath);
    console.log(`✅ Converted ${path.basename(svgPath)} -> ${path.basename(pngPath)}`);
  } catch (error) {
    console.error(`❌ Error converting ${svgPath}:`, error.message);
  }
}

async function main() {
  console.log('Converting SVG icons to PNG...\n');

  await convertSvgToPng(
    path.join(publicDir, 'icon-192.svg'),
    path.join(publicDir, 'icon-192.png')
  );

  await convertSvgToPng(
    path.join(publicDir, 'icon-512.svg'),
    path.join(publicDir, 'icon-512.png')
  );

  console.log('\n✅ All icons converted successfully!');
}

main();
