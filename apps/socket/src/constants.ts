import { config } from "dotenv";
config({
    path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development",
});

export const serverOptions = {
    port: parseInt(process.env.PORT || "8880", 10),
    debugMode: parseInt(process.env.DEBUG_TYPE || "3", 10),
    serverIconFile: process.env.SERVER_ICON_FILE || "serverIcon.png",
    enableServerIcon: process.env.ENABLE_SERVER_ICON === "true",
};