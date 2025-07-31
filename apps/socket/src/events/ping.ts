import { Server, Socket } from "socket.io";
import { serverData } from "@socket/global";
import { internal } from "@socket/utils/Logging";

export default (io: Server, socket: Socket) => {
    socket.on("ping", (timestamp) => {
        internal.log("[Server] Ping received from", socket.id, "at", timestamp);
        socket.volatile.emit('pong', timestamp);
        const player = serverData.getPlayerBySocket(socket);
        if (player != null) {
            player.lastMessageTime = Date.now();
        }
    });
}
