import { serverOptions } from "@socket/constants";

function log(message: string, ...args: any[]) {
    if (serverOptions.debugMode >= 3) {
        console.log(message, ...args);
    }
}

function debug(message: string, ...args: any[]) {
    if (serverOptions.debugMode >= 4) {
        console.log(message, ...args);
    }
}

export const internal = { log, debug };
