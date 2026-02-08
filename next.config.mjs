/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 uses native Node addons that can't be bundled by webpack.
  // Listing it here tells Next.js to require() it at runtime instead.
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
