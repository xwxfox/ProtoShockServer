import { ActionHandler, RPCAction, ActionResult, SetPlayerNameRPC } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";
import { serverData } from "@socket/global";
import { internal } from "@socket/utils/Logging";
import { sendCompressedMessage } from "@socket/utils/CompressedServerIO";

// CRITICAL: This event handler is responsible for giving the Player object a name, as we dont really get it any other way from the client.
export const mergePlayerNameWithPlayerObjectHandler: ActionHandler = (socket, action, context) => {
    if (action.action === 'rpc') {
        const rpcAction = action as RPCAction;
        const parsedRPC = actionMiddleware.parseRPC(rpcAction.rpc);
        if (parsedRPC && actionMiddleware.isRPCType<SetPlayerNameRPC>(parsedRPC, 'setplayername')) {

            internal.log("NAME ADDED FOR PLAYER:", parsedRPC.name, "for player ID:", rpcAction.sender);

            if (Array.from(serverData.players.values()).some(player => player.name === parsedRPC.name)) {
                internal.log("Player name already exists, Adding random chars to the name:", parsedRPC.name);
                const newName = parsedRPC.name + Math.random().toString(36).substring(2, 5);
                parsedRPC.name = newName;
                const nameChangeRPC: SetPlayerNameRPC = {
                    type: 'setplayername',
                    name: newName
                };
                const newRPCAction: RPCAction = {
                    action: 'rpc',
                    rpc: JSON.stringify(nameChangeRPC),
                    sender: serverData.getPlayerBySocket(socket)?.id || 'server',
                    id: serverData.createId()
                };
                serverData.players.get(rpcAction.sender)!.name = parsedRPC.name;
                internal.log("New name set for player:", newName);
                sendCompressedMessage(socket, newRPCAction).then(() => {
                    internal.log("Sent new name to player:", newName);
                    return { result: ActionResult.PASS_THROUGH };
                }).catch(error => {
                    console.error("Failed to send new name to player:", error);
                });
            }

            try {
                serverData.players.get(serverData.getPlayerBySocket(socket)?.id!)!.name = parsedRPC.name;
            } catch (error) {
                console.error("Error merging player name:", error);
            }
        }
    }

    return { result: ActionResult.PASS_THROUGH };
};