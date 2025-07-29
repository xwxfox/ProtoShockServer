import { ActionHandler, RPCAction, ActionResult, SetPlayerNameRPC } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";
import { serverData } from "@socket/global";
import { internal } from "@socket/util";

// CRITICAL: This event handler is responsible for giving the Player object a name, as we dont really get it any other way from the client.
export const mergePlayerNameWithPlayerObjectHandler: ActionHandler = (socket, action, context) => {
    if (action.action === 'rpc') {
        const rpcAction = action as RPCAction;
        const parsedRPC = actionMiddleware.parseRPC(rpcAction.rpc);

        if (parsedRPC && actionMiddleware.isRPCType<SetPlayerNameRPC>(parsedRPC, 'setplayername')) {
            console.log("NAME ADDED FOR PLAYER:", parsedRPC.name, "for player ID:", rpcAction.sender);
            try {
                serverData.players.get(rpcAction.sender)!.name = parsedRPC.name;
            } catch (error) {
                console.error("Error merging player name:", error);
            }
        }
    }

    return { result: ActionResult.PASS_THROUGH };
};