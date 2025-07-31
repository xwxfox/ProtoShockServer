import { internal } from "@socket/utils/Logging";
import { Server, Socket } from "socket.io";
import { serverData } from "@socket/global";

// Map to track last event timestamp for each socket.id
export const lastEventTimestamps: Map<string, number> = new Map();

// Utility to update last event timestamp (to be called on any event from a game client)
export function updateLastEventTimestamp(socket: Socket) {
    lastEventTimestamps.set(socket.id, Date.now());
}

/**
 * Start a periodic check for inactive sockets (no events for 3+ seconds).
 * If found, handle as leave and clean up player/room.
 */
export function startInactivityChecker(io: Server) {
    setInterval(() => {
        const now = Date.now();
        for (const [socketId, lastTime] of lastEventTimestamps.entries()) {
            if (now - lastTime > 3000) { // 3 seconds

                // dont disconnect web clients (sometimes game clients show up here so we disable this check for them)
                // if (webclients.connectedWebClients.has(io.sockets.sockets.get(socketId)!)) return
                internal.log(`[Server] Inactivity check: Socket ${socketId} inactive for more than 10 seconds.`);

                try {
                    serverData.removePlayerBySocketId(socketId);
                } catch (error) {
                    console.error("[Error] Failed to remove player:", error);
                }
                lastEventTimestamps.delete(socketId);
            }
        }
    }, 3000); // Check every 3 seconds
}
