import { serverOptions } from "@socket/constants";
import { sendBundledCompressedMessages } from "@socket/utils/CompressedServerIO";

export let messageInterval: NodeJS.Timeout;

export function startInterval() {
    messageInterval = setInterval(sendBundledCompressedMessages, 1000 / 30);
}
export function scheduleGc() {
    if (!global.gc) return;
    const minutes = Math.random() * 30 + 15;
    setTimeout(function () {
        global.gc!();
        if (serverOptions.debugMode === 3) return console.log('[Debug] Garbage Collector was ran.');
        scheduleGc();
    }, minutes * 60 * 1000);
}
