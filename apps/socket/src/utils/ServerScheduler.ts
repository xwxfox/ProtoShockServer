import { serverOptions } from "@socket/constants";
import { sendBundledCompressedMessages } from "@socket/utils/CompressedServerIO";
import { internal } from "./Logging";

export let messageInterval: NodeJS.Timeout;

export function startInterval() {
    messageInterval = setInterval(sendBundledCompressedMessages, 1000 / 60);
}
export function scheduleGc() {
    if (!global.gc) return;
    const minutes = Math.random() * 30 + 15;
    setTimeout(function () {
        global.gc!();
        if (serverOptions.debugMode === 3) return internal.log('[Debug] Garbage Collector was ran.');
        scheduleGc();
    }, minutes * 60 * 1000);
}
