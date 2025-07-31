import { Server, Socket } from "socket.io";
import { serverData, webclients } from "@socket/global";
import { createGzip } from "zlib";
import { ChatMonitoringMessage } from "@socket/types/Basics";

export default (io: Server, socket: Socket) => {
    // Handle admin chat messages
    socket.on("adminChat", (data: { message: string, roomId?: string, global?: boolean }) => {
        console.log(`[Admin] Chat message: ${data.message}, Room: ${data.roomId || 'Global'}`);

        // Create proper RPC chat message for game clients
        const chatRPC = {
            type: 'chatmessage',
            message: `<b><color=red>[ADMIN]</color></b>: ${data.message}`
        };

        const rpcAction = {
            action: 'rpc',
            rpc: JSON.stringify(chatRPC),
            sender: 'server',
            id: serverData.createId()
        };

        if (data.global || !data.roomId) {
            // Send to all connected game clients using the message queue system
            const gzip = createGzip();
            const buffers: any[] = [];
            gzip.on('data', (chunk) => buffers.push(chunk));
            gzip.on('end', () => {
                const compressedData = Buffer.concat(buffers);
                socket.broadcast.emit('clientmessage', compressedData);
            });
            gzip.on('error', (error) => {
                console.error("[Error] Admin chat compression failed:", error);
                // Fallback to uncompressed
                socket.broadcast.emit('clientmessage', JSON.stringify(rpcAction));
            });
            gzip.end(JSON.stringify(rpcAction));
        } else {
            // Send to specific room using message queue
            const room = serverData.rooms.get(data.roomId);
            if (room) {
                room.players.forEach(player => {
                    const gzip = createGzip();
                    const buffers: any[] = [];

                    gzip.on('data', (chunk) => buffers.push(chunk));
                    gzip.on('end', () => {
                        const compressedData = Buffer.concat(buffers);
                        player.socket.emit('clientmessage', compressedData);
                    });
                    gzip.on('error', (error) => {
                        console.error("[Error] Admin chat compression failed:", error);
                        // Fallback to uncompressed
                        player.socket.emit('clientmessage', JSON.stringify(rpcAction));
                    });

                    gzip.end(JSON.stringify(rpcAction));
                });
            }
        }

        // Broadcast to all web clients for monitoring
        webclients.connectedWebClients.forEach((client) => {
            const messageData: ChatMonitoringMessage = {
                senderId: "0",
                senderName: 'Admin',
                message: data.message,
                roomId: serverData.rooms.get(data.roomId || "")?.id || 'Global',
                roomName: serverData.rooms.get(data.roomId || "")?.name || 'Global',
                timestamp: Date.now(),
            }
            client.emit('forwardedChatMessage', messageData);
        });
    });

    // Handle player kick
    socket.on("kickPlayer", (data: { playerId: string, reason?: string }) => {
        console.log(`[Admin] Kicking player: ${data.playerId}, Reason: ${data.reason || 'No reason provided'}`);

        // Find player across all rooms
        let playerFound = false;
        serverData.rooms.forEach((room) => {
            room.players.forEach((player) => {
                if (player.id === data.playerId) {
                    playerFound = true;

                    // Send kick message to player
                    player.socket.emit('serverMessage', {
                        type: 'kick',
                        message: `You have been kicked from the server. Reason: ${data.reason || 'No reason provided'}`,
                        timestamp: Date.now()
                    });

                    // Disconnect the player
                    setTimeout(() => {
                        player.socket.disconnect(true);
                    }, 1000);

                    // Notify web clients
                    webclients.connectedWebClients.forEach((client) => {
                        client.emit('playerKicked', {
                            playerId: data.playerId,
                            reason: data.reason || 'No reason provided',
                            timestamp: Date.now()
                        });
                    });
                }
            });
        });

        if (!playerFound) {
            socket.emit('adminError', { message: `Player ${data.playerId} not found` });
        }
    });

    // Handle chat monitoring toggle
    socket.on("toggleChatMonitor", (enabled: boolean) => {
        // This would be implemented to monitor chat messages from players
        console.log(`[Admin] Chat monitoring ${enabled ? 'enabled' : 'disabled'}`);
        socket.emit('chatMonitorStatus', { enabled });
    });
};
