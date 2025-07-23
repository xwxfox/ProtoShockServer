import { Socket } from "socket.io";
import { messageQueue, serverData } from "@socket/global";
import { createGzip } from "zlib";
import { serverOptions } from "@socket/constants";

export let messageInterval: NodeJS.Timeout;

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

export function startInterval() {
    messageInterval = setInterval(sendBundledCompressedMessages, 1000 / 30);
}

export function runAction(socket: Socket, data: any) {
    switch (data.action) {
        case 'createRoom':
            serverData.createRoom(socket, data.roomName, data.scene, data.scenepath, data.gameversion, data.maxplayers);
            break;
        case 'joinRoom':
            serverData.joinRoom(socket, data.roomId, data.gameversion, false);
            break;
        case 'rpc':
            handleRPC(socket, JSON.stringify(data));
            break;
        case 'getroomlist':
            roomList(socket, /* data.amount, */ data.emptyonly);
            break;
        case 'getcurrentplayers':
            getCurrentPlayers(socket);
            break;
        case 'leave':
            serverData.removePlayer(socket);
            break;
        default:
            break;
    }
}

export function broadcastRoomInfo() {
    serverData.players.forEach((player) => {
        if (player == null) return;
        const room = serverData.rooms.get(player.roomId);
        if (!room) return;
        const playerIds = Array.from(room.players.keys()).map((id) => ({
            playerId: id,
            local: id === player.id,
            roomId: room.id,
        }));
        const json = JSON.stringify({
            action: 'roominfo',
            playerIds: playerIds,
            scene: room.scene,
            scenepath: room.scenepath,
            gameversion: room.gameversion,
            id: serverData.createId(),
        });
        SendMessage(player.socket, json);
    });
}

export function getCurrentPlayers(socket: Socket) {
    const player = serverData.getPlayerBySocket(socket);
    if (player == null) return;
    const room = serverData.rooms.get(player.roomId);
    if (!room) return;
    const playerIds = Array.from(room.players.keys()).map((id) => ({
        playerId: id,
        local: id === player.id,
        roomId: room.id,
    }));
    const json = JSON.stringify({
        action: 'currentplayers',
        playerIds: playerIds,
        scene: room.scene,
        scenepath: room.scenepath,
        gameversion: room.gameversion,
        id: serverData.createId(),
    });
    SendMessage(player.socket, json);
}

export function roomList(socket: Socket, /* amount: number, */ emptyonly: boolean = false) {
    if (serverData.rooms.size < 0) return;
    serverData.rooms.forEach((room) => {
        const _data = JSON.stringify({
            action: 'roomlist_roominfo',
            roomName: room.name,
            roomId: room.id,
            roomversion: room.gameversion,
            playercount: room.players.size,
        });
        if (room.players.size < room.maxplayers || !emptyonly) return SendMessage(socket, _data);
    });
}

export async function handleRPC(socket: Socket, data: string) {
    const player = serverData.getPlayerBySocket(socket)
    if (player == null) return;
    const players = serverData.getPlayersInRoom(player.roomId);
    players.forEach((p) => {
        const parsedData = JSON.parse(data);
        const _data = JSON.stringify({
            action: parsedData.action,
            rpc: parsedData.rpc,
            sender: parsedData.sender,
            id: serverData.createId(),
        });
        if (p.socket) {
            SendMessage(p.socket, _data);
        }
    });
    player.lastMessageTime = Date.now();
}

export function getTotalPlayerCount() {
    let totalPlayerCount = 0;
    serverData.rooms.forEach((room) => {
        totalPlayerCount += room.playerCount;
    });
    return totalPlayerCount;
}

export function convertSecondsToUnits(seconds: number) {
    const timeUnits = [
        { unit: 'year', seconds: 31536000 },
        { unit: 'month', seconds: 2592000 },
        { unit: 'week', seconds: 604800 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 },
        { unit: 'second', seconds: 1 },
    ];
    let durationString = '';
    let remainingSeconds = seconds;
    timeUnits.forEach(({ unit, seconds }) => {
        const value = Math.floor(remainingSeconds / seconds);
        remainingSeconds %= seconds;
        if (value > 0) {
            durationString += `${value} ${unit}${value !== 1 ? 's' : ''} `;
        }
    });
    return durationString.trim();
}

export function checkRoomValidity() {
    serverData.rooms.forEach((room, roomId) => {
        const invalidPlayers: string[] = [];

        room.players.forEach((player, playerId) => {
            // Get player info based on WebSocket
            const playerBySocket = serverData.getPlayerBySocket(player.socket);
            if (!playerBySocket || playerBySocket.id !== player.id) {
                invalidPlayers.push(playerId);
            }
        });

        // Remove invalid players and update player count
        invalidPlayers.forEach(playerId => {
            room.players.delete(playerId);
            room.playerCount--;
            console.log(`[Server] Player ${playerId} in Room ${roomId} is not valid. Removed from the room.`);
        });

        if (room.playerCount <= 0) {
            serverData.rooms.delete(roomId);
        }
    });
}

export function scheduleGc() {
    if (!global.gc) return;
    const minutes = Math.random() * 30 + 15;
    setTimeout(function () {
        global.gc!();
        if (serverOptions.debugMode === 3) return console.log('[Debug] Garbage Collector was ran.');
        scheduleGc();
    }, minutes * 60 * 1000);
}

export function formatUptime(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function log(message: string, ...args: any[]) {
    if (serverOptions.debugMode === 4) {
        console.log(message, ...args);
    }
}

export const internal = { log };