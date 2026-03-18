#!/usr/bin/env node
// Generate XML sitemap for SEO

import fs from 'fs';
import path from 'path';

const baseUrl = 'https://hivemind-engine.vercel.app';
const currentDate = new Date().toISOString().split('T')[0];

const pages = [
  {
    path: '',
    priority: 1.0,
    changefreq: 'daily',
  },
  {
    path: '/app',
    priority: 0.9,
    changefreq: 'daily',
  },
  {
    path: '/pricing',
    priority: 0.8,
    changefreq: 'weekly',
  },
  {
    path: '/blog',
    priority: 0.7,
    changefreq: 'daily',
  },
  {
    path: '/docs',
    priority: 0.6,
    changefreq: 'weekly',
  },
  {
    path: '/about',
    priority: 0.5,
    changefreq: 'monthly',
  },
  {
    path: '/contact',
    priority: 0.5,
    changefreq: 'monthly',
  },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

// Write to public directory
const publicDir = path.join(process.cwd(), 'ui', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
console.log('✓ Sitemap generated at ui/public/sitemap.xml');

// Also generate robots.txt
const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${baseUrl}/sitemap.xml

# Google
User-agent: Googlebot
Allow: /

# Bing
User-agent: Bingbot
Allow: /
`;

fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);
console.log('✓ robots.txt generated at ui/public/robots.txt');
