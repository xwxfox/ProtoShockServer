import { Server, Socket } from "socket.io";
import { webclients, serverData } from "@socket/global";
import { serverOptions } from "@socket/constants";
import { getWebClientData } from "@socket/utils/BasicServerIO";

export default (io: Server, socket: Socket) => {
    socket.on("webClient", () => {
        webclients.connectedWebClients.set(socket, socket);
        if (serverOptions.debugMode === 3) console.log("[Server] Web Client Connected");

        const data = getWebClientData();

        // Send data immediately
        socket.emit("webClient", data);
    });
}
