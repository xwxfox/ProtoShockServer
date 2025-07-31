import { ActionHandler, ActionResult } from "@socket/types";

// Rate limiting handler - Blocks excessive actions
export const rateLimitHandler: ActionHandler = (socket, action, context) => {
    const now = Date.now();
    const lastMessageTime = context.player?.lastMessageTime || 0;
    const timeDiff = now - lastMessageTime;

    // Rate limit: max 10 actions per second
    if (timeDiff < 100) {
        return {
            result: ActionResult.BLOCK,
            reason: 'Rate limit exceeded'
        };
    }

    // Update last message time
    if (context.player) {
        context.player.lastMessageTime = now;
    }

    return { result: ActionResult.PASS_THROUGH };
};