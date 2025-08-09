import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    trailingSlash: false,
    skipTrailingSlashRedirect: true,
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true, // Ignore ESLint errors during build
    },
    output: 'standalone',
    async rewrites() {
        const socketInternal = process.env.SOCKET_SERVER_INTERNAL_URL || 'http://socket:8880';
        return {
            beforeFiles: [
                {
                    source: '/socket.io',
                    destination: `${socketInternal}/socket.io/`,
                },
            ]
        }
    },
};

export default nextConfig;
