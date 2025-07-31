import { Socket } from "socket.io";
import { serverData } from "@socket/global";
import { serverOptions } from "@socket/constants";
import { Player, RoomSummary } from "@socket/types/Basics";
import { convertSecondsToUnits } from "@socket/utils/Formatters";
import { SendMessage } from "@socket/utils/CompressedServerIO";
import { WebClientData } from "@socket/types/WebClient";

export function getWebClientData(): WebClientData {
    const roomsList: RoomSummary[] = [];
    const playersList: any[] = [];

    serverData.rooms.forEach((room) => {
        roomsList.push({
            RoomID: room.id,
            RoomName: room.name,
            RoomPlayerCount: room.players.size,
            RoomPlayerMax: room.maxplayers,
            RoomGameVersion: room.gameversion,
        });

        // Add players from this room
        room.players.forEach((player) => {
            playersList.push({
                id: player.id,
                socketId: player.socket.id,
                username: player.name,
                roomId: room.id,
                roomName: room.name,
                connected: player.socket.connected,
                hosting: player.hosting,
                local: player.local
            });
        });
    });


    return {
        rooms: roomsList,
        roomsCount: roomsList.length,
        players: playersList,
        playerCount: getTotalPlayerCount(),
        uptime: convertSecondsToUnits(Math.round(process.uptime())),
        memoryUsage: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
        countryCode: serverOptions.countryCode
    };
}

export function checkRoomValidity() {
    serverData.rooms.forEach((room, roomId) => {
        const invalidPlayers: string[] = [];

        room.players.forEach((player, playerId) => {
            // Get player info based on WebSocket
            let playerBySocket: Player | undefined;
            Array.from(serverData.players.values()).forEach((p) => {
                if (p.id === playerId) {
                    playerBySocket = p;
                }
            });
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

        if (room.players.size <= 0) {
            serverData.rooms.delete(roomId);
        }
    });
}

export function getTotalPlayerCount() {
    let totalPlayerCount = 0;
    serverData.rooms.forEach((room) => {
        totalPlayerCount += room.players.size;
    });
    return totalPlayerCount;
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