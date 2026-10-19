import type { NextConfig } from 'next';

const config: NextConfig = {
  // Static HTML export: the page is plain files on a CDN, readable with JS off.
  output: 'export',
  trailingSlash: true,
  // Art is pre-graded into AVIF/WebP srcsets by scripts/grade-art.mjs, so Next's optimizer is not needed.
  images: { unoptimized: true },
  // @zaster/shared ships TypeScript source.
  transpilePackages: ['@zaster/shared'],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default config;
