import type { MetadataRoute } from 'next'

function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) {
    try {
      const parsed = new URL(configured)
      if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return parsed.origin
    } catch {
      // Fall through to the established canonical origin.
    }
  }
  return 'https://pillarsoftech.org'
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/auth/',
        '/volunteer/checkin/',
        '/register/',
        '/private/',
        '/api/media/',
      ],
    },
    sitemap: new URL('/sitemap.xml', siteOrigin()).toString(),
  }
}
