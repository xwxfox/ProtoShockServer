import { Server, Socket } from "socket.io";
import path from "path";
import { createGzip } from "zlib";
import fs from "fs";
import sharp from "sharp";
import { serverOptions } from "@socket/constants";
import { internal } from "@socket/utils/Logging";
import { ServerInfo } from "@socket/types/ServerInfo";
import { mainServer } from "@socket/global";

const __dirname = path.resolve();
export default (io: Server, socket: Socket) => {
    socket.on("query", async () => {
        console.log("[Server] Query received from", socket.id);

        // Helper function to send server info response
        const sendServerInfo = (iconData: string | false = false) => {
            const serverInfo: ServerInfo = {
                Name: serverOptions.name,
                Description: serverOptions.description,
                Version: mainServer.serverVersion,
                SupportedVersions: mainServer.supportedGameVersions,
                Icon: iconData,
                Port: serverOptions.port,
                OnlinePlayers: mainServer.getTotalPlayerCount(),
                MaxPlayers: serverOptions.maxPlayers,
                Modded: mainServer.getModInfo().hasMods || false,
                Host: serverOptions.host,
                CountryCode: serverOptions.countryCode,
            };

            // Compress and send the response
            const gzip = createGzip();
            const chunks: Buffer[] = [];

            gzip.on('data', (chunk) => {
                chunks.push(chunk);
            });

            gzip.on('end', () => {
                const compressedData = Buffer.concat(chunks);
                socket.emit('query', compressedData);
            });

            gzip.write(JSON.stringify(serverInfo));
            gzip.end();
        };

        // If server icon is disabled, send response immediately
        if (!serverOptions.enableIcon) {
            sendServerInfo();
            return;
        }

        // Process server icon
        try {
            const filePath = path.join(__dirname, serverOptions.iconFile);

            // Check if file exists and get stats
            const stats = await fs.promises.stat(filePath);

            // Check file size (10MB limit)
            if (stats.size > 10 * 1024 * 1024) {
                console.log("[Error] Server Icon is too large, must be less than 10MB");
                sendServerInfo();
                return;
            }

            // Get image metadata
            const metadata = await sharp(filePath).metadata();

            // Check dimensions
            if (metadata.width !== 64 || metadata.height !== 64) {
                console.log("[Error] Server Icon isn't 64x64");
                sendServerInfo();
                return;
            }

            // Read and encode the file
            const imageData = await fs.promises.readFile(filePath);
            const base64Icon = imageData.toString('base64');

            sendServerInfo(base64Icon);

        } catch (error) {
            console.log("[Error] Failed to process server icon:", error);
            sendServerInfo();
        }
    });
}
