import { ActionHandler, ActionResult } from "@socket/types";
import { internal } from "@socket/util";

// Logging handler - runs for all actions
export const loggingHandler: ActionHandler = (socket, action, context) => {
    internal.log(`[${context.timestamp}] Action received:`, {
        action: action.action,
        socketId: socket.id,
        playerId: context.player?.id
    });

    return { result: ActionResult.PASS_THROUGH };
};