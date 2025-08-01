import { ActionHandler, RPCAction, ChatMessageRPC, ActionResult, ChatMonitoringMessage } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";
import { mainServer } from "@socket/global";
import { cleanChatMessage } from "@socket/utils/Formatters";

// Chat filter handler - modifies chat messages
export const chatMonitoringHandler: ActionHandler = (socket, action, context) => {
    if (action.action === 'rpc') {
        const rpcAction = action as RPCAction;
        const parsedRPC = actionMiddleware.parseRPC(rpcAction.rpc);

        if (parsedRPC && actionMiddleware.isRPCType<ChatMessageRPC>(parsedRPC, 'chatmessage')) {
            const roomInfo = mainServer.rooms.get(mainServer.getPlayerBySocket(socket)?.roomId ?? '');
            // this is a chat message
            socket.broadcast.emit("forwardedChatMessage", {
                senderId: rpcAction.sender,
                message: cleanChatMessage(parsedRPC.message), // Remove sender name from message
                roomId: roomInfo?.id || null,
                roomName: roomInfo?.name || "Unknown",
                timestamp: Date.now(),
                senderName: mainServer.players.get(rpcAction.sender)?.name || "Unknown"
            } as ChatMonitoringMessage);
            return { result: ActionResult.PASS_THROUGH };
        }
    }

    return { result: ActionResult.PASS_THROUGH };
};