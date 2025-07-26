import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    trailingSlash: false,
    skipTrailingSlashRedirect: true,
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
