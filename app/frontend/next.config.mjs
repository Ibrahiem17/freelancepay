/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicit empty turbopack config silences the webpack-conflict warning
  turbopack: {},
};

export default nextConfig;
