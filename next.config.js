/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
let supabasePattern = null

if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl)
    if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
      supabasePattern = {
        protocol: parsed.protocol.slice(0, -1),
        hostname: parsed.hostname,
        pathname: '/storage/v1/object/**',
      }
    }
  } catch {
    supabasePattern = null
  }
}

const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      ...(cloudinaryCloudName ? [{
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: `/${cloudinaryCloudName}/image/upload/**`,
      }] : []),
      ...(supabasePattern ? [supabasePattern] : []),
    ],
    contentDispositionType: 'attachment',
    formats: ['image/webp', 'image/avif'],
  },
}

module.exports = nextConfig
