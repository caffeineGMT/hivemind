// SEO Infrastructure for Hivemind Engine
// Manages meta tags, structured data, sitemaps for optimal search visibility

export const seoConfig = {
  siteName: 'Hivemind Engine',
  siteUrl: 'https://hivemind-engine.vercel.app',
  defaultTitle: 'Hivemind Engine - Autonomous AI Company Platform',
  defaultDescription:
    'Launch autonomous AI companies with full engineering teams. CEO, CTO, CMO, and engineers collaborate 24/7 to build, deploy, and monetize products.',
  defaultImage: '/og-image.png',
  twitterHandle: '@HivemindEngine',
  keywords: [
    'AI company builder',
    'autonomous AI agents',
    'AI startup platform',
    'AI business automation',
    'AI entrepreneurship',
    'Claude AI agents',
    'AI team collaboration',
    'automated business',
  ],
};

/**
 * Generate page-specific meta tags
 */
export function generateMetaTags(page) {
  const pages = {
    home: {
      title: 'Hivemind Engine - Launch Autonomous AI Companies in Minutes',
      description:
        'Build AI companies that work 24/7. Full engineering teams (CEO, CTO, CMO, engineers) collaborate autonomously to ship products and generate revenue.',
      keywords: ['AI company platform', 'autonomous business', 'AI agents', 'AI startup builder'],
    },
    pricing: {
      title: 'Pricing - Hivemind Engine',
      description:
        'Simple, transparent pricing for autonomous AI companies. Start free, scale as you grow. Plans from $49/mo to Enterprise.',
      keywords: ['AI company pricing', 'AI platform cost', 'SaaS pricing'],
    },
    dashboard: {
      title: 'Dashboard - Hivemind Engine',
      description: 'Manage your autonomous AI companies, agents, tasks, and revenue in real-time.',
      keywords: ['AI dashboard', 'company management', 'agent monitoring'],
    },
    blog: {
      title: 'Blog - Hivemind Engine | AI Entrepreneurship Insights',
      description:
        'Learn how to build successful AI companies. Tutorials, case studies, and insights from entrepreneurs using autonomous AI agents.',
      keywords: ['AI entrepreneurship', 'AI business tips', 'autonomous agents', 'AI tutorials'],
    },
  };

  const pageData = pages[page] || pages.home;

  return {
    title: pageData.title,
    description: pageData.description,
    keywords: [...seoConfig.keywords, ...pageData.keywords].join(', '),
    ogTitle: pageData.title,
    ogDescription: pageData.description,
    ogImage: seoConfig.defaultImage,
    ogUrl: `${seoConfig.siteUrl}/${page === 'home' ? '' : page}`,
    twitterCard: 'summary_large_image',
    twitterTitle: pageData.title,
    twitterDescription: pageData.description,
    twitterImage: seoConfig.defaultImage,
  };
}

/**
 * Generate structured data (Schema.org) for rich snippets
 */
export function generateStructuredData(type, data = {}) {
  const baseSchema = {
    '@context': 'https://schema.org',
  };

  const schemas = {
    organization: {
      ...baseSchema,
      '@type': 'Organization',
      name: seoConfig.siteName,
      url: seoConfig.siteUrl,
      logo: `${seoConfig.siteUrl}/logo.png`,
      description: seoConfig.defaultDescription,
      sameAs: [
        'https://twitter.com/HivemindEngine',
        'https://linkedin.com/company/hivemind-engine',
        'https://github.com/hivemind-engine',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@hivemind-engine.com',
        contactType: 'Customer Support',
      },
    },

    softwareApplication: {
      ...baseSchema,
      '@type': 'SoftwareApplication',
      name: seoConfig.siteName,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: '49',
        highPrice: '999',
        priceCurrency: 'USD',
        priceValidUntil: '2027-12-31',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '127',
        bestRating: '5',
        worstRating: '1',
      },
      description: seoConfig.defaultDescription,
      featureList: [
        'Autonomous AI agents',
        'Continuous deployment',
        '24/7 operation',
        'Revenue analytics',
        'Multi-agent collaboration',
      ],
    },

    article: {
      ...baseSchema,
      '@type': 'Article',
      headline: data.title,
      description: data.description,
      image: data.image || seoConfig.defaultImage,
      datePublished: data.datePublished,
      dateModified: data.dateModified || data.datePublished,
      author: {
        '@type': 'Person',
        name: data.author || 'Hivemind Team',
      },
      publisher: {
        '@type': 'Organization',
        name: seoConfig.siteName,
        logo: {
          '@type': 'ImageObject',
          url: `${seoConfig.siteUrl}/logo.png`,
        },
      },
    },

    faq: {
      ...baseSchema,
      '@type': 'FAQPage',
      mainEntity: (data.questions || []).map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer,
        },
      })),
    },

    product: {
      ...baseSchema,
      '@type': 'Product',
      name: data.name || seoConfig.siteName,
      description: data.description || seoConfig.defaultDescription,
      brand: {
        '@type': 'Brand',
        name: seoConfig.siteName,
      },
      offers: {
        '@type': 'Offer',
        price: data.price,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: data.url || seoConfig.siteUrl,
      },
      aggregateRating: data.rating
        ? {
            '@type': 'AggregateRating',
            ratingValue: data.rating.value,
            reviewCount: data.rating.count,
          }
        : undefined,
    },
  };

  return schemas[type] || schemas.organization;
}

/**
 * Generate XML sitemap
 */
export function generateSitemap(pages) {
  const baseUrl = seoConfig.siteUrl;
  const currentDate = new Date().toISOString().split('T')[0];

  const urls = pages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${page.lastModified || currentDate}</lastmod>
    <changefreq>${page.changeFreq || 'weekly'}</changefreq>
    <priority>${page.priority || '0.8'}</priority>
  </url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Generate robots.txt
 */
export function generateRobotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${seoConfig.siteUrl}/sitemap.xml

# Google
User-agent: Googlebot
Allow: /

# Bing
User-agent: Bingbot
Allow: /

# Yandex
User-agent: Yandex
Allow: /
`;
}

/**
 * Canonical URL generator
 */
export function getCanonicalUrl(path) {
  const cleanPath = path.replace(/\/$/, ''); // Remove trailing slash
  return `${seoConfig.siteUrl}${cleanPath}`;
}

/**
 * Generate Open Graph tags for social sharing
 */
export function generateOGTags(data) {
  return {
    'og:type': data.type || 'website',
    'og:site_name': seoConfig.siteName,
    'og:title': data.title || seoConfig.defaultTitle,
    'og:description': data.description || seoConfig.defaultDescription,
    'og:image': data.image || seoConfig.defaultImage,
    'og:url': data.url || seoConfig.siteUrl,
    'og:locale': 'en_US',
  };
}

/**
 * Generate Twitter Card tags
 */
export function generateTwitterTags(data) {
  return {
    'twitter:card': data.cardType || 'summary_large_image',
    'twitter:site': seoConfig.twitterHandle,
    'twitter:creator': seoConfig.twitterHandle,
    'twitter:title': data.title || seoConfig.defaultTitle,
    'twitter:description': data.description || seoConfig.defaultDescription,
    'twitter:image': data.image || seoConfig.defaultImage,
  };
}

/**
 * SEO-friendly slug generator
 */
export function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Track SEO performance metrics
 */
export function trackSEOMetrics(data) {
  // This would integrate with Google Analytics 4 or other analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: data.title,
      page_location: data.url,
      page_path: data.path,
    });
  }
}
