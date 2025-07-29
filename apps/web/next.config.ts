import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    trailingSlash: false,
    skipTrailingSlashRedirect: true,
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true, // Ignore ESLint errors during build
    },
    async rewrites() {
        return {
            beforeFiles: [
                {
                    source: '/socket.io',
                    destination: 'http://localhost:8880/socket.io/', // Proxy to Socket server
                },
            ]
        }
    },
};

export default nextConfig;
