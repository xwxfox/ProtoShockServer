import { Server, Socket } from "socket.io";
import { App } from "uWebSockets.js";
import { instrument } from "@socket.io/admin-ui";
import death from 'death'

import registerPingHandler from "@socket/events/ping";
import registerDisconnectHandler from "@socket/events/disconnect";
import registerWebClientHandler from "@socket/events/webClient";
import registerQueryHandler from "@socket/events/query";
import registerMessageHandler from "@socket/events/rawMessage";
import registerApiStatsHandler from "@socket/events/api-stats";
import registerAdminActionsHandler from "@socket/events/adminActions";
import { registerAPIHandler } from "@socket/handlers/RestAPIHandler";
import { webclients, clientStates } from "@socket/global";
import { serverOptions } from "@socket/constants";
import { internal } from "@socket/utils/Logging";
import { startInactivityChecker, updateLastEventTimestamp } from "@socket/utils/inactivity";
import { checkRoomValidity, getWebClientData } from "@socket/utils/BasicServerIO";
import { scheduleGc } from "@socket/utils/ServerScheduler";
import { PluginRegistry } from "@socket/utils/PluginRegistry";


console.log("[Server] Starting Socket Server...");
if (global.gc) {
    console.log("[Server] Garbage Collector is enabled.");
}
else {
    console.log("[Server] Garbage Collector is not enabled. Run the server with --expose-gc to enable it.");
}

// Set the process title for easier identification
process.title = "ProtoShock Socket Server";
// Load plugins
await PluginRegistry.loadPlugins();
console.log("[Server] Loaded plugins:", PluginRegistry.getPluginList().map(plugin => plugin.name + " (v" + plugin.version + ")").join(", "));

// Register plugin handlers
console.log("[Server] Registering plugin handlers...");
await Promise.all(PluginRegistry.getPluginClassList().map(async (plugin) => {
    const instance = new plugin();
    if (instance.registerHandlers) {
        PluginRegistry.pluginLog(instance.PluginInfo.name, `Registering handlers for plugin: ${instance.PluginInfo.id}`);
        await instance.registerHandlers();
    } else {
        PluginRegistry.pluginLog(instance.PluginInfo.name, `Plugin ${instance.PluginInfo.id} does not have registerHandlers method.`);
    }
})
).catch((error) => {
    console.error("Error registering plugin handlers:", error);
    throw error; // Re-throw to ensure server startup fails if plugins cannot be registered
}).finally(() => {
    console.log("[Server] All plugin handlers registered successfully.");
});

console.log(`[Server] Listening on port ${serverOptions.port}...`);
console.log(`[Server] Debug mode is set to ${serverOptions.debugMode}.`);
console.log(serverOptions)

const uws = App();
const io = new Server({
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    },
    addTrailingSlash: true,
    allowUpgrades: true,
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
    },
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 10e8,
    pingTimeout: 60000,
});

// Register API handler for RESTful requests
registerAPIHandler(uws);

if (serverOptions.enableAdminUI) {
    instrument(io, {
        auth: {
            type: "basic",
            username: "admin",
            password: "admin",
        },
        mode: serverOptions.debugMode === 4 ? "development" : "production",
    });
    console.log("[Server] Socket Admin UI is enabled.");
}

io.attachApp(uws);
setInterval(checkRoomValidity, 8000);

// Inactivity checker for game client sockets - This is needed for handling clients that are technically disconnected but didnt fire the leave event
startInactivityChecker(io);

scheduleGc();

if (serverOptions.enableWebClient) {
    console.log("[Server] Web Client support is enabled.");
    // Send periodic updates to web clients
    setInterval(() => {
        if (webclients.connectedWebClients.size > 0) {
            webclients.connectedWebClients.forEach((client) => {
                const data = getWebClientData();
                client.emit("webClient", data);
            })
        }
    }, 1000);
} else {
    console.log("[Server] Web Client support is disabled.");
    console.log("[Server] Admin dashboard will not be available.");
}

// Log server stats every minute
setInterval(async () => {
    const { databaseHandler } = await import("@socket/global");
    await databaseHandler.logServerStats();
}, 60000);

const onConnection = (socket: Socket) => {
    internal.log('[Connection] New client connected:', socket.id);
    // Initialize client state tracking
    clientStates.set(socket.id, {
        connectedAt: Date.now(),
        lastMessageAt: Date.now(),
        messageCount: 0,
        consecutiveErrors: 0,
        isHealthy: true
    });

    if (serverOptions.debugMode > 3) {
        socket.onAny((eventName, ...args) => {
            internal.debug(`[Server] Received event '${eventName}' from ${socket.id}`);
            internal.debug(`[Server] Event data:`, args);
        });

        // Log when socket sends any event

        socket.onAnyOutgoing((eventName, ...args) => {
            internal.debug(`[Server] Sending event '${eventName}' to ${socket.id}`);
            internal.debug(`[Server] Outgoing data:`, args);
        });
    }

    // Log socket errors
    socket.on("error", (error) => {
        console.error(`[Server] Socket error for ${socket.id}:`, error);
    });

    socket.onAny(() => {
        // Update last event timestamp for inactivity tracking
        updateLastEventTimestamp(socket);
    });

    registerMessageHandler(io, socket);
    registerQueryHandler(io, socket);
    registerPingHandler(io, socket);
    if (serverOptions.enableWebClient) {
        // Register web client connection handler
        registerWebClientHandler(io, socket);
    }
    registerDisconnectHandler(io, socket);
    registerApiStatsHandler(io, socket);
    registerAdminActionsHandler(io, socket);
}

io.on("connection", onConnection);

uws.listen(serverOptions.port, () => {
    console.log(`[Server] HTTP Server listening on port ${serverOptions.port}`);
});

if (!serverOptions.disableGracefulShutdown) {
    const DEATH_HANDLER = death({ uncaughtException: true })
    DEATH_HANDLER((signal) => {
        gracefulShutdown(signal as NodeJS.Signals);
    });
}

export async function gracefulShutdown(signal: NodeJS.Signals) {
    const socketsToDisconnect = new Map<string, Socket>();
    console.log("[Server] Got signal: " + signal, "[Server] Cleaning up & exiting...");

    // Disconnect all clients
    console.log("[Server] Disconnecting all clients...");
    console.log("[Server] Sending shutdown message to all clients...");
    for (const [socketId] of clientStates) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
            socket.emit('adminChat', {
                message: "[Server] Game server shutting down - Please reconnect from main menu.",
                roomId: undefined,
                global: true
            });
            socketsToDisconnect.set(socketId, socket);
        }
        clientStates.delete(socketId);
    }
    console.log("[Server] Disconnecting all clients in 3 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    for (const [socketId, socket] of socketsToDisconnect) {
        try {
            socket.emit("leave");
            socket.disconnect(true);
            socketsToDisconnect.delete(socketId);
            console.log(`[Server] Socket ${socketId} disconnected.`);
        } catch (error) {
            console.error(`[Server] Error disconnecting socket ${socketId}:`, error);
        }
    }


    console.log("[Server] Disconnecting main in 3 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    io.disconnectSockets(true);
    // Close all sockets gracefully
    io.close(() => {
        console.log("[Server] All sockets closed.");
    });

    // Optionally, you can also log server stats before shutdown
    import("@socket/global").then(({ databaseHandler }) => {
        databaseHandler.logServerStats().then(() => {
            console.log("[Server] Server stats logged before shutdown.");
        });
    });

    console.log("[Server] Shutdown complete.");
    process.exit(0);
}
