/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude prisma seed file from build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '../prisma/seed': 'commonjs ../prisma/seed',
      })
    }
    return config
  },
  // Exclude seed file from TypeScript compilation
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  }
}

module.exports = nextConfig