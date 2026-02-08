/** @type {import('next').NextConfig} */
const nextConfig = {
  // pg (node-postgres) uses native Node APIs that can't be bundled by webpack.
  // Listing it here tells Next.js to require() it at runtime instead.
  serverExternalPackages: ['pg', 'pg-native'],
};

export default nextConfig;
