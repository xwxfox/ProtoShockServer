import { Server, Socket } from "socket.io";
import { createGunzip } from "zlib";
import { finished } from "stream/promises";
import { handleAction } from "@socket/util";

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

            filteredMessageList.forEach((element) => {
                try {
                    const data = JSON.parse(element);
                    console.log(data)
                    handleAction(socket, data);
                } catch (err) {
                    console.error("Error parsing message:", err);
                }
            });
        } catch (err) {
            console.error('[Error] Failed Decompressing the Message sent from Client', err)
        }
    });
}
