import { createServer } from 'node:http';
import { parse } from 'node:url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import next from 'next';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:8880';

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Create socket.io proxy middleware with enhanced configuration
const socketProxy = createProxyMiddleware({
    target: socketServerUrl,
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
    timeout: 30000, // 30 second timeout
    proxyTimeout: 30000,
    pathRewrite: {
        '^/socket.io': '/socket.io', // Ensure path is preserved
    },
    on: {
        error: (err: Error, req: IncomingMessage, res: ServerResponse | Socket) => {
            console.error(`[${new Date().toISOString()}] Socket proxy error:`, err.message);
            if (res instanceof ServerResponse && !res.headersSent) {
                res.writeHead(502, {
                    'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({
                    error: 'Socket server unavailable',
                    message: 'The socket.io server is currently unavailable. Please try again later.'
                }));
            }
        },
        proxyReq: (proxyReq, req, res) => {
            if (dev) {
                console.log(`[${new Date().toISOString()}] Proxying ${req.method} ${req.url} to socket server`);
            }
            // Set appropriate headers for socket.io
            proxyReq.setHeader('X-Forwarded-For', req.socket.remoteAddress || '');
            proxyReq.setHeader('X-Forwarded-Proto', req.headers['x-forwarded-proto'] || 'http');
            proxyReq.setHeader('X-Forwarded-Host', req.headers.host || hostname);
        },
        proxyRes: (proxyRes, req, res) => {
            // Add CORS headers if needed
            if (dev) {
                proxyRes.headers['Access-Control-Allow-Origin'] = '*';
                proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS';
                proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
            }
        },
    },
});

interface ServerConfig {
    keepAliveTimeout: number;
    headersTimeout: number;
    maxHeaderSize: number;
}

const serverConfig: ServerConfig = {
    keepAliveTimeout: 65000, // Slightly higher than typical load balancer timeout
    headersTimeout: 66000, // Should be higher than keepAliveTimeout
    maxHeaderSize: 16384, // 16KB max header size
};

app.prepare().then(() => {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        try {
            const parsedUrl = parse(req.url || '', true);
            const { pathname } = parsedUrl;

            // Add security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');

            // Handle socket.io requests
            if (pathname?.startsWith('/socket.io/')) {
                return socketProxy(req, res);
            }

            // Handle all other requests with Next.js
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Error occurred handling`, req.url, err);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    error: 'Internal Server Error',
                    message: dev ? (err as Error).message : 'Something went wrong'
                }));
            }
        }
    });

    // Apply server optimizations
    server.keepAliveTimeout = serverConfig.keepAliveTimeout;
    server.headersTimeout = serverConfig.headersTimeout;
    // server.maxHeaderSize = serverConfig.maxHeaderSize;

    // Handle WebSocket upgrades for socket.io
    server.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url || '');

        if (pathname?.startsWith('/socket.io/')) {
            try {
                (socketProxy.upgrade as any)?.(request, socket, head);
            } catch (err) {
                console.error(`[${new Date().toISOString()}] WebSocket upgrade error:`, err);
                socket.destroy();
            }
        } else {
            socket.destroy();
        }
    });

    // Health check endpoint
    server.on('request', (req, res) => {
        if (req.url === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                socketServerUrl: dev ? socketServerUrl : 'configured'
            }));
            return;
        }
    });

    // Graceful shutdown handling
    const shutdown = (signal: string) => {
        console.log(`\n[${new Date().toISOString()}] Received ${signal}. Graceful shutdown...`);
        server.close(() => {
            console.log(`[${new Date().toISOString()}] HTTP server closed.`);
            process.exit(0);
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
            console.log(`[${new Date().toISOString()}] Force shutdown after timeout`);
            process.exit(1);
        }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    server
        .once('error', (err: Error) => {
            console.error(`[${new Date().toISOString()}] Server error:`, err);
            process.exit(1);
        })
        .listen(port, hostname, () => {
            console.log(`[${new Date().toISOString()}] > Ready on http://${hostname}:${port}`);
            if (dev) {
                console.log(`[${new Date().toISOString()}] > Socket.io requests will be proxied to ${socketServerUrl}`);
                console.log(`[${new Date().toISOString()}] > Health check available at http://${hostname}:${port}/health`);
            }
        });
});
