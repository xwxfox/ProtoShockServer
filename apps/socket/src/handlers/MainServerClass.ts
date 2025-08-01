import { Socket } from 'socket.io';
import { CreateRoomAction, JoinRoomAction, Player, Room, RPCAction, Action, GetRoomListAction } from '@socket/types';
import { randomBytes } from 'crypto';
import { SendMessage } from '@socket/utils/CompressedServerIO';
import { messageInterval, startInterval } from '@socket/utils/ServerScheduler';
import { internal } from '@socket/utils/Logging';
import { mainServer } from '@socket/global';
import { lastEventTimestamps } from "@socket/utils/inactivity";
import { getCurrentPlayers, roomList, broadcastRoomInfo } from "@socket/utils/BasicServerIO";

export class MainServerClass {
    players: Map<string, Player> = new Map();
    rooms: Map<string, Room> = new Map();

    /**
     * Creates a unique ID for players and rooms.
     * @param existingSet Optional set of existing IDs to avoid duplicates
     * @returns Unique ID string
     */
    createId(existingSet: Set<string> = new Set(this.players.keys())): string {
        let id: string;
        do {
            id = Array.from({ length: 4 }, () => randomBytes(4).toString('hex')).join('-');
        } while (existingSet.has(id));
        return id;
    }

    /**
     * Gets a player by their socket.
     * @param socket Socket of the player to get
     * @returns Player object or undefined if not found
     */
    getPlayerBySocket(socket: Socket): Player | undefined {
        for (const player of this.players.values()) {
            if (player.socket === socket) return player;
        }
    }


    /**
     * @param roomId ID of the room to get players from
     * @returns Array of Player objects in the room, or an empty array if the room does not exist
     */
    getPlayersInRoom(roomId: string): Player[] {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        return Array.from(room.players.values());
    }

    /**
     * Gets a player by their ID.
     * @param playerId ID of the player to get
     * @returns Player object or undefined if not found
     */
    getPlayerById(playerId: string): Player | undefined {
        return this.players.get(playerId);
    }

    /**
     * Gets total player count across all rooms.
     * @returns Total number of players across all rooms.
     */
    getTotalPlayerCount(): number {
        let total = 0;
        this.rooms.forEach(room => {
            total += room.players.size;
        });
        return total;
    }

    /**
     * Removes a player from the server by their socket.
     * @param socket Socket of the player to remove
     */
    async removePlayer(socket: Socket): Promise<void> {
        const player = this.getPlayerBySocket(socket);
        if (!player) return;
        const room = this.rooms.get(player.roomId);
        if (!room) return internal.debug("[Debug] Room not found.");
        if (player.hosting && room.players.size > 1) {
            const players = Array.from(room.players.values());
            if (!Array.isArray(players)) {
                internal.debug("[Debug] Players is not an array.");
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
                    this.sendToAllInRoom(room, JSON.stringify({
                        action: 'rpc',
                        rpc: data,
                        sender: this.createId(),
                        id: this.createId(),
                    }));
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

        internal.log(`[Server] Player ${player.id} left from the room ${player.roomId}`);
        internal.log(`[Server] Room ${player.roomId}'s Player Count: ${room.players.size}`);

        if (this.rooms.size === 0) {
            clearInterval(messageInterval);
        }

        // Log player leave to database
        import('../global').then(({ databaseHandler }) => {
            databaseHandler.logPlayerLeave(player);
        });
    }

    /**
     * Removes a player by their socket ID.
     * @param socketId Socket ID of the player to remove
     */
    async removePlayerBySocketId(socketId: string): Promise<void> {
        let player: Player | undefined;
        for (const p of this.players.values()) {
            if (p.socket.id === socketId) player = p;
        }
        if (!player) return;
        const room = this.rooms.get(player.roomId);
        if (!room) return internal.debug("[Debug] Room not found.");
        if (player.hosting && room.players.size > 1) {
            const players = Array.from(room.players.values());
            if (!Array.isArray(players)) {
                internal.debug("[Debug] Players is not an array.");
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
                    this.sendToAllInRoom(room, JSON.stringify({
                        action: 'rpc',
                        rpc: data,
                        sender: this.createId(),
                        id: this.createId(),
                    }));
                } catch (error) {
                    internal.debug("[Debug] Error sending RPC:", error);
                }
            }
        }

        this.players.delete(player.id);
        room.players.delete(player.id);
        room.playerCount--;
        if (room.players.size == 0) {
            this.rooms.delete(room.id);
        }

        internal.log(`[Server] Player ${player.id} left from the room ${player.roomId}`);
        internal.log(`[Server] Room ${player.roomId}'s Player Count: ${room.players.size}`);

        if (this.rooms.size === 0) {
            clearInterval(messageInterval);
        }

        // Log player leave to database
        import('../global').then(({ databaseHandler }) => {
            databaseHandler.logPlayerLeave(player);
        });
    }

    /**
     * Creates a new room and adds the player to it.
     * @param socket Socket of the player
     * @param roomData Data containing room details
     */
    createRoom(socket: Socket, roomData: CreateRoomAction): void {
        const player = this.getPlayerBySocket(socket);
        if (player && player.roomId) {
            internal.debug(`[Server] Player ${player.id} is already in a room.`);
        }
        const room: Room = {
            id: this.createId(),
            maxplayers: roomData.maxplayers,
            scene: roomData.scene,
            scenepath: roomData.scenepath,
            name: roomData.name,
            gameversion: roomData.gameversion,
            players: new Map(),
            playerCount: 0,
        };
        if (this.rooms.size === 0) {
            startInterval()
        };
        this.rooms.set(room.id, room);
        const joinRoomData: JoinRoomAction = {
            action: 'joinRoom',
            roomId: room.id,
            gameversion: roomData.gameversion,
            ishosting: true,
        };
        this.joinRoom(socket, joinRoomData);
        // Log room creation to database
        import('../global').then(({ databaseHandler }) => {
            databaseHandler.logServerStats();
        });
    }

    /**
     * Joins a player to a room.
     * @param socket Socket of the player
     * @param roomData Data containing room ID and game version
     */
    joinRoom(socket: Socket, roomData: JoinRoomAction): void {
        const player = this.getPlayerBySocket(socket);
        if (player && player.roomId) {
            return internal.log(`[Server] Player ${player.id} is already in a room: ${player}`);
        }
        const room = this.rooms.get(roomData.roomId);
        if (!room) return;
        if (room.gameversion != roomData.gameversion) return;
        const newPlayer: Player = {
            id: this.createId(),
            socket: socket,
            roomId: roomData.roomId,
            local: true,
            hosting: roomData.ishosting,
            name: "PLAYER",
        };
        room.players.set(newPlayer.id, newPlayer);
        this.players.set(newPlayer.id, newPlayer);
        room.playerCount++;
        internal.log(`[Server] Player ${newPlayer.id} joined the room ${newPlayer.roomId}`);
        internal.log(`[Server] Room ${roomData.roomId}'s Player Count: ${room.players.size}`);

        broadcastRoomInfo();

        // Log player join to database
        import('../global').then(({ databaseHandler }) => {
            databaseHandler.logPlayerJoin(newPlayer, room);
        });
    }

    /**
    * Broadcasts an RPC action to all players in the room of the specified socket.
    * @param socket Socket to broadcast the action to
     * @param RPCEvent RPC action event to broadcast
    */
    async broadcastRPCAction(socket: Socket, RPCEvent: RPCAction): Promise<void> {
        const room = await this.getRoomBySocket(socket);
        if (!room) {
            internal.debug(`[Server] No room found for socket ${socket.id}`);
            return;
        }

        try {
            const genericRPCAction: RPCAction = {
                action: RPCEvent.action,
                rpc: RPCEvent.rpc,
                sender: RPCEvent.sender,
                id: mainServer.createId(),
            };
            this.sendToAllInRoomById(room.id, JSON.stringify(genericRPCAction));
        } catch (error) {
            internal.debug(`[Server] Error handling RPC for socket ${socket.id}:`, error);
        }
    }

    /**
     * Sends a RPC message to all players in a room.
     * @param roomId Room ID to send the data to
     * @param data Stringified JSON data to send
     * @returns 
    */
    async sendToAllInRoomById(roomId: string, data: string): Promise<void> {
        const room = this.rooms.get(roomId);
        if (!room) return;
        room.players.forEach((player) => {
            if (player == null || !player.socket) return internal.debug(`[Server] Player ${player.id} has no socket or is null.`);
            SendMessage(player.socket, data);
            player.lastMessageTime = Date.now();
        });
    }

    /**
     * Sends a message to all players in a room.
     * @param room The room to send the data to
     * @param data Stringified JSON data to send
     */
    async sendToAllInRoom(room: Room, data: string): Promise<void> {
        room.players.forEach((player) => {
            if (player == null || !player.socket) return internal.debug(`[Server] Player ${player.id} has no socket or is null.`);
            SendMessage(player.socket, data);
            player.lastMessageTime = Date.now();
        });
    }

    /**
     * Gets the room associated with a socket.
     * @param socket Socket to get the room from
     * @returns Room associated with the socket or null if not found
    */
    async getRoomBySocket(socket: Socket): Promise<Room | null> {
        let room: Room | null = null;
        try {
            const player = this.getPlayerBySocket(socket);
            room = this.rooms.get(player!.roomId)!;
        } catch {
            socket.rooms.forEach((roomId) => {
                const r = this.rooms.get(roomId);
                if (r) {
                    room = r;
                }
            });
        }
        if (!room) return null;
        return room;
    }

    /**
     * Handles a server action received after it has been processed by middlewares.
     * @param socket Socket that sent the action
     * @param actionData Action data to process
     */
    runServerAction(socket: Socket, actionData: Action) {
        // Update last event timestamp for this socket
        lastEventTimestamps.set(socket.id, Date.now());
        switch (actionData.action) {
            case 'createRoom':
                mainServer.createRoom(socket, actionData as CreateRoomAction);
                break;
            case 'joinRoom':
                mainServer.joinRoom(socket, actionData as JoinRoomAction);
                break;
            case 'rpc':
                mainServer.broadcastRPCAction(socket, actionData as RPCAction);
                break;
            case 'getroomlist':
                roomList(socket, actionData as GetRoomListAction);
                break;
            case 'getcurrentplayers':
                getCurrentPlayers(socket);
                break;
            case 'leave':
                try {
                    mainServer.removePlayer(socket);
                } catch (error) {
                    internal.log("[Server] Error during disconnect handling:", error);
                }
                break;
            default:
                console.warn(`[Server] Unknown action received: ${(actionData as Action).action}`);
                console.warn("[Server] Data:", actionData);
                break;
        }
    }

}
