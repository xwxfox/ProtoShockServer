import { Server, Socket } from "socket.io";
import { webclients } from "@socket/global";
import { serverOptions } from "@socket/constants";

export default (io: Server, socket: Socket) => {
    socket.on("webClient", () => {
        webclients.connectedWebClients.set(socket, socket);
        if (serverOptions.debugMode === 3) return console.log("[Server] Web Client Connected");
    });
}
