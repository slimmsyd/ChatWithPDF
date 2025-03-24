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
      bodySizeLimit: '50mb',
    },
  },
  // Configure Next.js API routes for larger payloads
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
  },
}

module.exports = nextConfig; 