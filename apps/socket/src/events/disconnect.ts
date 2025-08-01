import { Server, Socket } from "socket.io";
import { webclients, mainServer, clientStates } from "@socket/global";
import { internal } from "@socket/utils/Logging";

export default (io: Server, socket: Socket) => {
    socket.on("disconnect", () => {
        internal.log("[Connection] Client disconnecting:", socket.id);
        if (webclients.connectedWebClients.has(socket)) {
            webclients.connectedWebClients.delete(socket);
            internal.log("[Server] Web Client Removed", socket.id);
        } else {
            mainServer.removePlayer(socket);
        }
        internal.log('[Connection] Client disconnected:', socket.id);
        if (clientStates.has(socket.id)) {
            clientStates.delete(socket.id);
        }
        socket.disconnect(true);
    });
};
