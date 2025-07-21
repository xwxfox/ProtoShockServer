import { Server, Socket } from "socket.io";
import { createServer } from "http";

import registerPingHandler from "@socket/events/ping";
import registerDisconnectHandler from "@socket/events/disconnect";
import registerWebClientConnectHandler from "@socket/events/webClientConnect";
import registerQueryHandler from "@socket/events/query";
import registerMessageHandler from "@socket/events/message";
import registerApiStatsHandler from "@socket/events/api-stats";

import { serverData, webclients } from "@socket/global";
import { checkRoomValidity, convertSecondsToUnits, getTotalPlayerCount, scheduleGc, internal } from "@socket/util";
import { RoomSummary } from "@socket/types";
import { serverOptions } from "@socket/constants";

console.log("[Server] Starting Socket Server...");
if (global.gc) {
    console.log("[Server] Garbage Collector is enabled.");
}
else {
    console.log("[Server] Garbage Collector is not enabled. Run the server with --expose-gc to enable it.");
}

// Set the process title for easier identification
process.title = "ProtoShock Socket Server";

console.log(`[Server] Listening on port ${serverOptions.port}...`);
console.log(`[Server] Debug mode is set to ${serverOptions.debugMode}.`);
console.log(serverOptions)

const httpServer = createServer();
const io = new Server(httpServer, {
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    },
    allowUpgrades: true,
    cors: {
        origin: (_req, callback) => {
            callback(null, true);
        },
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
    },
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 10e8,
    pingTimeout: 60000,
});

setInterval(checkRoomValidity, 10000);

scheduleGc();

setInterval(() => {
    if (webclients.connectedWebClients.size > 0) {
        const roomsList: RoomSummary[] = [];
        serverData.rooms.forEach((room) => {
            roomsList.push({
                RoomID: room.id,
                RoomName: room.name,
                RoomPlayerCount: room.playerCount,
                RoomPlayerMax: room.maxplayers,
                RoomGameVersion: room.gameversion,
            });
        });

        webclients.connectedWebClients.forEach((client) => {
            const data = {
                rooms: roomsList,
                playerCount: getTotalPlayerCount(),
                uptime: convertSecondsToUnits(Math.round(process.uptime())),
                memoryUsage: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
            };
            client.emit("webClient", data);
        })
    }
}, 1000);

const onConnection = (socket: Socket) => {
    internal.log(`[Server] New connection from ${socket.id}`);

    // Add comprehensive event logging
    socket.onAny((eventName, ...args) => {
        internal.log(`[Server] Received event '${eventName}' from ${socket.id}`);
        internal.log(`[Server] Event data:`, args);
    });

    // Log when socket sends any event
    socket.onAnyOutgoing((eventName, ...args) => {
        internal.log(`[Server] Sending event '${eventName}' to ${socket.id}`);
        internal.log(`[Server] Outgoing data:`, args);
    });

    // Log socket errors
    socket.on("error", (error) => {
        console.error(`[Server] Socket error for ${socket.id}:`, error);
    });

    registerMessageHandler(io, socket);
    registerQueryHandler(io, socket);
    registerPingHandler(io, socket);
    registerWebClientConnectHandler(io, socket);
    registerDisconnectHandler(io, socket);
    registerApiStatsHandler(io, socket);
}

io.on("connection", onConnection);

httpServer.listen(serverOptions.port, () => {
    console.log(`[Server] HTTP Server listening on port ${serverOptions.port}`);
});