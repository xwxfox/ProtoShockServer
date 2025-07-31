import { Socket } from "socket.io";
import { messageQueue } from "@socket/global";
import { createGzip } from "zlib";

export function SendMessage(socket: Socket, data: any) {
    if (messageQueue.MessagesToSend.has(socket)) {
        messageQueue.MessagesToSend.get(socket)!.push(data);
    } else {
        messageQueue.MessagesToSend.set(socket, [data]);
    }
}
export async function sendBundledCompressedMessages() {
    messageQueue.MessagesToSend.forEach(async (messages, socket) => {
        const bundledMessage = messages.join('\n');
        try {
            if (socket) {
                const gzip = createGzip();
                const buffers: any[] = [];
                gzip.on('data', (chunk) => buffers.push(chunk));
                gzip.on('end', () => {
                    const compressedData = Buffer.concat(buffers);
                    socket.emit('clientmessage', compressedData);
                });
                gzip.on('error', (error) => {
                    console.error("[Error] There was a issue compressing the bundled messages:", error);
                });
                gzip.end(bundledMessage);
            }
        } catch (error) {
            console.error("Error compressing and sending message:", error);
        }
    });
    messageQueue.MessagesToSend.clear();
}

/**
 * Send a single compressed message to a specific socket
 * @param socket Socket 
 * @param data JSON clientMessage event
 */
export async function sendCompressedMessage(socket: Socket, data: any) {
    console.log("[Debug] Sending compressed message:", data);
    try {
        if (socket) {
            const gzip = createGzip();
            const buffers: any[] = [];
            gzip.on('data', (chunk) => buffers.push(chunk));
            gzip.on('end', () => {
                const compressedData = Buffer.concat(buffers);
                console.log("[Debug] Compressed data size:", compressedData.length);

                socket.emit('clientmessage', compressedData);
            });
            gzip.on('error', (error) => {
                console.error("[Error] There was a issue compressing the message:", error);
            });
            gzip.end(JSON.stringify(data));
        }
    } catch (error) {
        console.error("Error compressing and sending message:", error);
    }
}
