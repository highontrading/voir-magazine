import type { NextConfig } from 'next';

const config: NextConfig = {
  // Allows running a second dev server from the same checkout (NEXT_DIST_DIR=.next-alt).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
  },
};

export default config;
