import { Server, Socket } from "socket.io";
import { mainServer } from "@socket/global";
import { RoomSummary } from "@socket/types";
import { formatUptime } from "@socket/utils/Formatters";
import { getTotalPlayerCount } from "@socket/utils/BasicServerIO";

export default (io: Server, socket: Socket) => {
    socket.on("api-stats", () => {
        const roomsList: RoomSummary[] = [];
        mainServer.rooms.forEach((room) => {
            roomsList.push({
                RoomID: room.id,
                RoomName: room.name,
                RoomPlayerCount: room.players.size,
                RoomPlayerMax: room.maxplayers,
                RoomGameVersion: room.gameversion,
            });
        });

        socket.volatile.emit("api-stats", {
            playerCount: getTotalPlayerCount(),
            memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}mb`,
            countryCode: process.env.countryCode,
            uptime: formatUptime(Math.round(process.uptime())),
            rooms: roomsList || "",
            roomsCount: mainServer.rooms.size || 0
        })
    });
}
