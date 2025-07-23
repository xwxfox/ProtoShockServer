import { Server, Socket } from "socket.io";
import path from "path";
import { createGzip } from "zlib";
import fs from "fs";
import sharp from "sharp";
import { serverOptions } from "@socket/constants";
import { internal } from "@socket/util";

export default (io: Server, socket: Socket) => {
    socket.on("query", () => {
        internal.log("[Server] Query received from", socket.id);
        const filePath = path.join(__dirname, serverOptions.serverIconFile);
        const gzip = createGzip();
        const chunks: any[] = [];
        gzip.on('data', (chunk) => {
            chunks.push(chunk);
        });
        if (serverOptions.enableServerIcon) {
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    gzip.write({ serverIcon: false });
                    gzip.end()
                    return;
                }

                if (stats.size > 10 * 1024 * 1024) {
                    console.error('[Error] Server Icon exceeds 10 MB');
                    gzip.write({ serverIcon: false });
                    gzip.end()
                    return;
                }

                sharp(filePath)
                    .metadata((err, metadata) => {
                        if (err) {
                            console.error('Error processing the image:', err);
                            gzip.write({ serverIcon: false });
                            gzip.end()
                            return;
                        }

                        if (metadata.width === 64 && metadata.height === 64) {
                            fs.readFile(filePath, (err, data) => {
                                if (err) {
                                    console.error('Error reading the file:', err);
                                    gzip.write({ serverIcon: false });
                                    gzip.end()
                                    return;
                                }

                                const base64 = data.toString('base64');
                                gzip.on('end', () => {
                                    const compressedData = Buffer.concat(chunks);
                                    socket.emit('query', compressedData);
                                });
                                gzip.end(JSON.stringify({ serverIcon: base64 }));
                            });
                        } else {
                            console.error("[Error] Server Icon isn't 64x64");
                            gzip.write({ serverIcon: false });
                            gzip.end()
                        }
                    });
            });
        }
    });
}
