// Script to generate PWA icons
const fs = require('fs');
const path = require('path');

// SVG icon with bee emoji and amber gradient background
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg-gradient)"/>

  <!-- Bee emoji or hexagon pattern -->
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-size="${size * 0.6}" font-family="system-ui, -apple-system">
    🐝
  </text>
</svg>
`.trim();

// Generate icons
const publicDir = path.join(__dirname, '..', 'public');

// Create 192x192 icon
fs.writeFileSync(
  path.join(publicDir, 'icon-192.svg'),
  createIconSVG(192)
);

// Create 512x512 icon
fs.writeFileSync(
  path.join(publicDir, 'icon-512.svg'),
  createIconSVG(512)
);

console.log('✅ SVG icons generated successfully');
console.log('📝 Note: For production, convert these to PNG using:');
console.log('   npm install sharp');
console.log('   node scripts/convert-icons-to-png.js');
