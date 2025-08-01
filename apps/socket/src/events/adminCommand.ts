import { Server, Socket } from "socket.io";
import { databaseHandler, mainServer } from "@socket/global";
import { SendMessage } from "@socket/utils/CompressedServerIO";

export default (io: Server, socket: Socket) => {
    socket.on("adminCommand", async (data) => {
        try {
            const { command, targetId, message, reason } = data;

            switch (command) {
                case 'kickPlayer':
                    if (targetId) {
                        const player = mainServer.players.get(targetId);
                        if (player) {
                            player.socket.disconnect();
                            await databaseHandler.logAdminAction(socket.id, 'kick_player', targetId, reason);
                            socket.emit('adminCommandResult', { success: true, message: `Player ${targetId} kicked` });
                        }
                    }
                    break;

                case 'sendGlobalMessage':
                    if (message) {
                        const globalMessage = {
                            action: 'rpc',
                            rpc: JSON.stringify({
                                type: 'chatmessage',
                                message: `[ADMIN] ${message}`,
                                sender: 'SERVER'
                            }),
                            sender: 'SERVER',
                            id: mainServer.createId()
                        };

                        // Send to all players
                        mainServer.players.forEach((player) => {
                            SendMessage(player.socket, JSON.stringify(globalMessage));
                        });

                        // Log to database
                        await databaseHandler.logChatMessage('SERVER', 'ADMIN', 'GLOBAL', message, true);
                        await databaseHandler.logAdminAction(socket.id, 'send_global_message', undefined, message);

                        socket.emit('adminCommandResult', { success: true, message: 'Global message sent' });
                    }
                    break;

                case 'sendRoomMessage':
                    if (message && targetId) {
                        const room = mainServer.rooms.get(targetId);
                        if (room) {
                            const roomMessage = {
                                action: 'rpc',
                                rpc: JSON.stringify({
                                    type: 'chatmessage',
                                    message: `[ADMIN] ${message}`,
                                    sender: 'SERVER'
                                }),
                                sender: 'SERVER',
                                id: mainServer.createId()
                            };

                            // Send to all players in room
                            room.players.forEach((player) => {
                                SendMessage(player.socket, JSON.stringify(roomMessage));
                            });

                            // Log to database
                            await databaseHandler.logChatMessage('SERVER', 'ADMIN', targetId, message, true);
                            await databaseHandler.logAdminAction(socket.id, 'send_room_message', targetId, message);

                            socket.emit('adminCommandResult', { success: true, message: `Message sent to room ${room.name}` });
                        }
                    }
                    break;

                case 'getPlayerStats':
                    const playerStats = await databaseHandler.getPlayerStats(100);
                    socket.emit('playerStatsData', playerStats);
                    break;

                case 'getChatHistory':
                    const chatHistory = await databaseHandler.getRecentChatMessages(targetId, 100);
                    socket.emit('chatHistoryData', chatHistory);
                    break;

                case 'getServerStats':
                    const serverStats = await databaseHandler.getServerStatsHistory(24);
                    socket.emit('serverStatsData', serverStats);
                    break;

                default:
                    socket.emit('adminCommandResult', { success: false, message: 'Unknown command' });
            }
        } catch (error) {
            console.error('[AdminCommand] Error handling admin command:', error);
            socket.emit('adminCommandResult', { success: false, message: 'Command failed' });
        }
    });
};
