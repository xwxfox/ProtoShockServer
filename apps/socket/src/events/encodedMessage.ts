import { Server, Socket } from "socket.io";
import { createGunzip } from "zlib";
import { finished } from "stream/promises";
import { handleAction } from "@socket/handlers/ActionHandler";
import { runAction } from "@socket/util";
export default (io: Server, socket: Socket) => {
    socket.on("message", async (compressedMessage) => {
        try {
            const gunzip = createGunzip();
            const chunks: any[] = [];
            gunzip.on('data', (chunk) => {
                chunks.push(chunk);
            });
            gunzip.write(compressedMessage);
            gunzip.end();
            await finished(gunzip);
            const decompressedMessage = Buffer.concat(chunks).toString('utf8');
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
        } catch (err) {
            console.error('[Error] Failed Decompressing the Message sent from Client', err)
        }
    });
}
