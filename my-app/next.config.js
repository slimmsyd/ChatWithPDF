/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['ui-avatars.com'],
  },
  // Configuration for handling larger file uploads
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
    // Allow processing of large request bodies
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Configure Next.js API routes for larger payloads
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
}

module.exports = nextConfig; 