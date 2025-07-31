import { Socket } from 'socket.io';
import { Player, Room } from '@socket/types';
import { serverOptions } from '@socket/constants';
import { randomBytes } from 'crypto';
import { SendMessage } from '@socket/utils/CompressedServerIO';
import { messageInterval, startInterval } from '@socket/utils/ServerScheduler';
import { broadcastRoomInfo } from '@socket/utils/BasicServerIO';

export class ServerState {
    players: Map<string, Player> = new Map();
    rooms: Map<string, Room> = new Map();

    createId(existingSet: Set<string> = new Set(this.players.keys())): string {
        let id: string;
        do {
            id = Array.from({ length: 4 }, () => randomBytes(4).toString('hex')).join('-');
        } while (existingSet.has(id));
        return id;
    }

    getPlayerBySocket(socket: Socket): Player | undefined {
        for (const player of this.players.values()) {
            if (player.socket === socket) return player;
        }
    }

    getPlayersInRoom(roomId: string): Player[] {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        return Array.from(room.players.values());
    }

    getTotalPlayerCount(): number {
        let total = 0;
        this.rooms.forEach(room => {
            total += room.players.size;
        });
        return total;
    }

    async removePlayer(socket: Socket) {
        const player = this.getPlayerBySocket(socket);
        if (!player) return;
        const room = this.rooms.get(player.roomId);
        if (!room) return console.error("[Debug] Room not found.");
        if (player.hosting && room.players.size > 1) {
            const players = Array.from(room.players.values());
            if (!Array.isArray(players)) {
                console.error("[Debug] Players is not an array.");
                return;
            }
            let nextPlayer;
            for (const playerobject of players) {
                if (playerobject !== player) {
                    nextPlayer = playerobject;
                    break;
                }
            }
            if (nextPlayer) {
                const data = JSON.stringify({
                    type: "newhost",
                    newhostid: nextPlayer.id
                });
                nextPlayer.hosting = true;
                try {
                    players.forEach((playertosend) => {
                        if (playertosend !== player) {
                            const json = JSON.stringify({
                                action: 'rpc',
                                rpc: data,
                                sender: this.createId(),
                                id: this.createId(),
                            });
                            SendMessage(playertosend.socket, json);
                        }
                    });
                } catch (error) {
                    console.error("[Debug] Error sending RPC:", error);
                }
            }
        }

        this.players.delete(player.id);
        room.players.delete(player.id);
        room.playerCount--;
        if (room.players.size == 0) {
            this.rooms.delete(room.id);
        }

        if (serverOptions.debugMode === 3) return console.log(`[Server] Player ${player.id} left from the room ${player.roomId}`);
        if (serverOptions.debugMode === 3) return console.log(`[Server] Room ${player.roomId}'s Player Count: ${room.players.size}`);

        if (this.rooms.size === 0) {
            clearInterval(messageInterval);
        }

        // Log player leave to database
        import('../global').then(({ databaseHandler }) => {
            databaseHandler.logPlayerLeave(player);
        });
    }

    async removePlayerBySocketId(socketId: string) {
        let player: Player | undefined;
        for (const p of this.players.values()) {
            if (p.socket.id === socketId) player = p;
        }
        if (!player) return;
        const room = this.rooms.get(player.roomId);
        if (!room) return console.error("[Debug] Room not found.");
        if (player.hosting && room.players.size > 1) {
            const players = Array.from(room.players.values());
            if (!Array.isArray(players)) {
                console.error("[Debug] Players is not an array.");
                return;
            }
            let nextPlayer;
            for (const playerobject of players) {
                if (playerobject !== player) {
                    nextPlayer = playerobject;
                    break;
                }
            }
            if (nextPlayer) {
                const data = JSON.stringify({
                    type: "newhost",
                    newhostid: nextPlayer.id
                });
                nextPlayer.hosting = true;
                try {
                    players.forEach((playertosend) => {
                        if (playertosend !== player) {
                            const json = JSON.stringify({
                                action: 'rpc',
                                rpc: data,
                                sender: this.createId(),
                                id: this.createId(),
                            });
                            SendMessage(playertosend.socket, json);
                        }
                    });
                } catch (error) {
                    console.error("[Debug] Error sending RPC:", error);
                }
            }
        }

        this.players.delete(player.id);
        room.players.delete(player.id);
        room.playerCount--;
        if (room.players.size == 0) {
            this.rooms.delete(room.id);
        }

        if (serverOptions.debugMode === 3) return console.log(`[Server] Player ${player.id} left from the room ${player.roomId}`);
        if (serverOptions.debugMode === 3) return console.log(`[Server] Room ${player.roomId}'s Player Count: ${room.players.size}`);

        if (this.rooms.size === 0) {
            clearInterval(messageInterval);
        }

        // Log player leave to database
        import('../global').then(({ databaseHandler }) => {
            databaseHandler.logPlayerLeave(player);
        });
    }

    createRoom(socket: Socket, roomName: string, _scene: string, _scenepath: string, _gameversion: string, max: number) {
        const player = this.getPlayerBySocket(socket);
        if (player && player.roomId) {
            if (serverOptions.debugMode >= 2) return console.log(`[Server] Player ${player.id} is already in a room.`);
        }
        const room: Room = {
            id: this.createId(),
            maxplayers: max,
            scene: _scene,
            scenepath: _scenepath,
            name: roomName,
            gameversion: _gameversion,
            players: new Map(),
            playerCount: 0,
        };
        if (this.rooms.size === 0) {
            startInterval()
        };
        this.rooms.set(room.id, room);
        this.joinRoom(socket, room.id, _gameversion, true);
        // Log room creation to database
        import('../global').then(({ databaseHandler }) => {
            databaseHandler.logServerStats();
        });
    }
    joinRoom(socket: Socket, roomId: string, _gameversion: string, ishosting: boolean) {
        const player = this.getPlayerBySocket(socket);
        if (player && player.roomId) {
            if (serverOptions.debugMode >= 2) return console.log(`[Server] Player ${player.id} is already in a room: ${player}`);
        }
        const room = this.rooms.get(roomId);
        if (!room) return;
        if (room.gameversion != _gameversion) return;
        const newPlayer: Player = {
            id: this.createId(),
            socket: socket,
            roomId: roomId,
            local: true,
            hosting: ishosting,
            name: "PLAYER",
        };
        room.players.set(newPlayer.id, newPlayer);
        this.players.set(newPlayer.id, newPlayer);
        room.playerCount++;
        if (serverOptions.debugMode === 3) {
            console.log(`[Server] Player ${newPlayer.id} joined the room ${newPlayer.roomId}`);
            console.log(`[Server] Room ${roomId}'s Player Count: ${room.players.size}`);
        }
        broadcastRoomInfo();

        // Log player join to database
        import('../global').then(({ databaseHandler }) => {
            databaseHandler.logPlayerJoin(newPlayer, room);
        });
    }
}
