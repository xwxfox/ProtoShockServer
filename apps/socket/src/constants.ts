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
    port: parseInt(process.env.PORT || "8880", 10),
    debugMode: parseInt(process.env.DEBUG_TYPE || "0", 10),
    serverIconFile: process.env.SERVER_ICON_FILE || "serverIcon.png",
    enableServerIcon: process.env.ENABLE_SERVER_ICON === "true",
    enableSocketAdminUI: process.env.ENABLE_SOCKET_ADMIN_UI === "true" || false,
    countryCode: process.env.COUNTRY_CODE || "UK",
    enableWebClient: process.env.ENABLE_WEB_CLIENT === "true" || true,
};