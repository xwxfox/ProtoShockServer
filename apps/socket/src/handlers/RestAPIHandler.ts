import { serverOptions } from "@socket/constants";
import { serverData } from "@socket/global";
import { RoomSummary } from "@socket/types";
import { formatUptime, getTotalPlayerCount } from "@socket/util";
import { HttpResponse, TemplatedApp } from "uWebSockets.js";

export function registerAPIHandler(uws: TemplatedApp) {
    uws.options("/health", (res) => {
        setCorsHeaders(res);
        res.end();
    });
    uws.get("/health", (res) => {
        setCorsHeaders(res);
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
        res.writeHeader("Content-Type", "application/json");
        res.writeHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.writeHeader("Pragma", "no-cache");
        res.writeHeader("Expires", "0");
        const json = JSON.stringify({
            playerCount: getTotalPlayerCount(),
            memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}mb`,
            countryCode: serverOptions.countryCode,
            uptime: formatUptime(Math.round(process.uptime())),
            rooms: roomsList || "",
            roomsCount: serverData.rooms.size || 0
        });
        res.writeStatus("200 OK").end(json, true)
    });
}

export function setCorsHeaders(res: HttpResponse) {
    // You can change the below headers as they're just examples
    res.writeHeader("Access-Control-Allow-Origin", "*");
    res.writeHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.writeHeader("Access-Control-Allow-Headers", "origin, content-type, accept, x-requested-with");
    res.writeHeader("Access-Control-Max-Age", "3600");
}