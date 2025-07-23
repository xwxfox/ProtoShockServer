import { ActionHandler, ActionResult, RPCAction, SyncTransformRPC } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";
import { internal } from "@socket/util";
// Transform throttling handler - warns when frequency of transform updates hits a threshold
// I dont know what to set the threshold to yet, so for now we just warn
let lastTransformTime = new Map<string, number>();

export const transformThrottleHandler: ActionHandler = (socket, action, context) => {
    if (action.action === 'rpc') {
        const rpcAction = action as RPCAction;
        const parsedRPC = actionMiddleware.parseRPC(rpcAction.rpc);

        if (parsedRPC && actionMiddleware.isRPCType<SyncTransformRPC>(parsedRPC, 'SyncTransform')) {
            const key = `${rpcAction.sender}_${parsedRPC.id}`;
            const now = Date.now();
            const lastTime = lastTransformTime.get(key) || 0;

            // Warn on excessive updates
            if (now - lastTime < 500) {
                internal.log(`[${context.timestamp}] Excessive transform updates for ${key}`);
                return { result: ActionResult.PASS_THROUGH };
            }

            lastTransformTime.set(key, now);
        }
    }

    return { result: ActionResult.PASS_THROUGH };
};