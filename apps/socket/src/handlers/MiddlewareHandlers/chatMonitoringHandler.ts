import { ActionHandler, RPCAction, ChatMessageRPC, ActionResult } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";
import { serverData } from "@socket/global";
import { cleanChatMessage } from "@socket/utils/Formatters";
export interface ChatMonitoringMessage {
    senderId: string;
    message: string;
    roomId: string | null; // Room ID or null if not in a room
    roomName: string; // Optional room name for better readability
    timestamp: number; // Unix timestamp
    senderName: string;
}
// Chat filter handler - modifies chat messages
export const chatMonitoringHandler: ActionHandler = (socket, action, context) => {
    if (action.action === 'rpc') {
        const rpcAction = action as RPCAction;
        const parsedRPC = actionMiddleware.parseRPC(rpcAction.rpc);

        if (parsedRPC && actionMiddleware.isRPCType<ChatMessageRPC>(parsedRPC, 'chatmessage')) {
            const roomInfo = serverData.rooms.get(serverData.getPlayerBySocket(socket)?.roomId ?? '');
            // this is a chat message
            socket.broadcast.emit("forwardedChatMessage", {
                senderId: rpcAction.sender,
                message: cleanChatMessage(parsedRPC.message), // Remove sender name from message
                roomId: roomInfo?.id || null,
                roomName: roomInfo?.name || "Unknown",
                timestamp: Date.now(),
                senderName: serverData.players.get(rpcAction.sender)?.name || "Unknown"
            } as ChatMonitoringMessage);
            return { result: ActionResult.PASS_THROUGH };
        }
    }

    return { result: ActionResult.PASS_THROUGH };
};