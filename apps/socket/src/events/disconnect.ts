import { Server, Socket } from "socket.io";
import { webclients, serverData } from "@socket/global";
import { serverOptions } from "@socket/constants";

export default (io: Server, socket: Socket) => {
    socket.on("disconnect", () => {
        if (webclients.connectedWebClients.has(socket)) {
            webclients.connectedWebClients.delete(socket);
            if (serverOptions.debugMode === 3) return console.log("[Server] Web Client Removed");
        } else {
            serverData.removePlayer(socket);
        }
    });
}
