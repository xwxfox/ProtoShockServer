import { Server, Socket } from "socket.io";
import { webclients, serverData, clientStates } from "@socket/global";
import { internal } from "@socket/util";

export default (io: Server, socket: Socket) => {
    socket.on("disconnect", () => {
        if (webclients.connectedWebClients.has(socket)) {
            webclients.connectedWebClients.delete(socket);
            internal.log("[Server] Web Client Removed", socket.id);
        } else {
            if (serverData.players.has(socket.id)) {
                serverData.removePlayer(socket);
            }

        }
        internal.log('[Connection] Client disconnected:', socket.id);
        if (clientStates.has(socket.id)) {
            clientStates.delete(socket.id);
        }
        socket.disconnect(true);
    });
}
