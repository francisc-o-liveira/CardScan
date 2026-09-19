/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cardscan/types", "@cardscan/validation", "@cardscan/config"],
};

module.exports = nextConfig;
