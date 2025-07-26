import { Server, Socket } from "socket.io";
import { createGunzip, createInflate } from "zlib"; // Import Inflate as well
import { finished } from "stream/promises";
import { handleAction } from "@socket/handlers/ActionHandler";
import { runAction } from "@socket/util";

export default (io: Server, socket: Socket) => {
    socket.on("message", async (compressedMessage) => {
        try {
            // Attempt Gzip decompression
            try {
                const gunzip = createGunzip();
                const chunks: any[] = [];
                gunzip.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                gunzip.on('error', (err) => { // Handle Gzip-specific errors
                    console.error('[Gunzip Error] Gzip decompression failed:', err);
                    gunzip.removeAllListeners(); // Prevent further errors
                    // Attempt Deflate decompression as a fallback
                    attemptDeflate(compressedMessage, socket);
                });

                gunzip.write(compressedMessage);
                gunzip.end();
                await finished(gunzip);

                const decompressedMessage = Buffer.concat(chunks).toString('utf8');
                processMessage(decompressedMessage, socket);

            } catch (gzipErr) {
                console.error('[Gzip Try/Catch Error] Gzip decompression failed:', gzipErr);
                // Attempt Deflate decompression as a fallback
                attemptDeflate(compressedMessage, socket);
            }

        } catch (overallErr) {
            console.error('[Overall Error] Failed to process message:', overallErr);
        }
    });
};

async function attemptDeflate(compressedMessage: any, socket: Socket) {
    try {
        const inflate = createInflate();
        const chunks: any[] = [];

        inflate.on('data', (chunk) => {
            chunks.push(chunk);
        });

        inflate.on('error', (err) => {
            console.error('[Deflate Error] Deflate decompression failed:', err);
            inflate.removeAllListeners();
            // If Deflate also fails, handle as uncompressed
            processMessage(compressedMessage.toString('utf8'), socket);
        });

        inflate.write(compressedMessage);
        inflate.end();
        await finished(inflate);

        const decompressedMessage = Buffer.concat(chunks).toString('utf8');
        processMessage(decompressedMessage, socket);

    } catch (deflateErr) {
        console.error('[Deflate Try/Catch Error] Deflate decompression failed:', deflateErr);
        // If Deflate fails, handle as uncompressed
        processMessage(compressedMessage.toString('utf8'), socket);
    }
}

async function processMessage(decompressedMessage: string, socket: Socket) {
    const messageList = decompressedMessage.split('\n');
    const filteredMessageList = messageList.filter(msg => msg.trim() !== '');

    filteredMessageList.forEach(async (element) => {
        try {
            const data = JSON.parse(element);
            const result = await handleAction(socket, data);

            // Handle the main processed action
            if (result.processedAction) {
                runAction(socket, result.processedAction);
            }

            // Handle any additional actions that should be sent to the client
            if (result.additionalActions && result.additionalActions.length > 0) {
                for (const additionalAction of result.additionalActions) {
                    runAction(socket, additionalAction);
                }
            }
        } catch (err) {
            console.error("Error parsing message:", err);
        }
    });
}