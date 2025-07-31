import { Socket } from "socket.io";
import { serverData } from "@socket/global";
import { internal } from "@socket/utils/Logging";

import { lastEventTimestamps } from "@socket/utils/inactivity";
import { getCurrentPlayers, roomList } from "@socket/utils/BasicServerIO";
import { SendMessage } from "@socket/utils/CompressedServerIO";


export function runAction(socket: Socket, data: any) {
    // Update last event timestamp for this socket
    lastEventTimestamps.set(socket.id, Date.now());
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
            try {
                serverData.removePlayer(socket);
            } catch (error) {
                internal.log("[Server] Error during disconnect handling:", error);
            }
            break;
        default:
            console.warn(`[Server] Unknown action received: ${data.action}`);
            console.warn("[Server] Data:", data);
            break;
    }
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
