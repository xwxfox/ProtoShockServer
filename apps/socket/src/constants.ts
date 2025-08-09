import { config } from "dotenv";
import { existsSync } from "fs";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";

if (!existsSync(envFile)) {
    console.warn(`[Warning] Environment file ${envFile} does not exist. Using default environment variables.`);
}

config({
    path: envFile,
});

export const serverOptions = {
    name: process.env.SERVER_NAME || "Protoshock Server",
    description: process.env.SERVER_DESCRIPTION || "A Protoshock server.",
    host: process.env.SERVER_HOST || "localhost",
    port: parseInt(process.env.PORT || "8880", 10),
    maxPlayers: parseInt(process.env.MAX_PLAYERS || "32", 10),
    debugMode: Number(process.env.DEBUG_TYPE || "0"),
    iconFile: process.env.SERVER_ICON_FILE || "serverIcon.png",
    enableIcon: process.env.ENABLE_SERVER_ICON === "true",
    enableAdminUI: process.env.ENABLE_SOCKET_ADMIN_UI === "true" || false,
    countryCode: process.env.COUNTRY_CODE || "UK",
    enableWebClient: process.env.ENABLE_WEB_CLIENT === "true" || true,
    disableGracefulShutdown: process.env.DISABLE_GRACEFUL_SHUTDOWN === "true" || false,
};