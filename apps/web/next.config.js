/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cardscan/types", "@cardscan/validation", "@cardscan/config"],

  /**
   * Routes renamed in the UI redesign.
   *
   * Declared here rather than as `redirect()` pages: those live inside the
   * `(app)` group whose layout is a client component, so the redirect degrades
   * to a client-side hop that still serves a 200. These are real 308s, applied
   * before any rendering.
   *
   * `/cards` is an exact match, so the `/cards/[id]` detail route is unaffected.
   */
  async redirects() {
    return [
      { source: "/dashboard", destination: "/home", permanent: true },
      { source: "/cards", destination: "/discover", permanent: true },
    ];
  },
};

module.exports = nextConfig;
