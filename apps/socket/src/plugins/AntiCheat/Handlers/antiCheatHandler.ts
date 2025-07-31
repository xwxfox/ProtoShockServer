import { ActionHandler, RPCAction, ActionResult, PlayerInfoRPC } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";

// Anti-cheat handler - validates player info - works better than VAC Live
export const antiCheatHandler: ActionHandler = (socket, action, context) => {
    if (action.action === 'rpc') {
        const rpcAction = action as RPCAction;
        const parsedRPC = actionMiddleware.parseRPC(rpcAction.rpc);

        if (parsedRPC && actionMiddleware.isRPCType<PlayerInfoRPC>(parsedRPC, 'playerinfo')) {
            // Check for impossible health values
            if (parsedRPC.health > 100 || parsedRPC.health < 0) {
                return {
                    result: ActionResult.BLOCK,
                    reason: 'Invalid health value detected'
                };
            }

            // Check for impossible latency
            if (parsedRPC.latency < 0 || parsedRPC.latency > 10000) {
                return {
                    result: ActionResult.BLOCK,
                    reason: 'Invalid latency value detected'
                };
            }
        }
    }

    return { result: ActionResult.PASS_THROUGH };
};
