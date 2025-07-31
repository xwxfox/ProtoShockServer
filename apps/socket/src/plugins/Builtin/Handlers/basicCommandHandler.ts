import { ActionHandler, RPCAction, ActionResult } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";
import { createSystemAnnouncement, createColoredChatMessage } from "@socket/utils/RPCFactory";

export const chatCommandHandler: ActionHandler = (socket, action, context) => {
    if (action.action === 'rpc') {
        const rpcAction = action as RPCAction;
        const parsedRPC = actionMiddleware.parseRPC(rpcAction.rpc);

        if (parsedRPC && parsedRPC.type === 'chatmessage') {
            const message = (parsedRPC as any).message;
            // we need to parse it and remove player name from the chat message
            const chatMessage = {
                sender: parsedRPC.message.split(':')[0], // Extract sender name from message
                message: parsedRPC.message.replace(/^[^:]+: \s*/, ''), // Remove sender name from message
            }

            // Handle commands
            if (chatMessage.message.startsWith('/')) {
                const [command, ...args] = chatMessage.message.slice(1).split(' ');

                switch (command.toLowerCase()) {
                    case 'help':
                        console.log("help command received");
                        return {
                            result: ActionResult.SEND_ADDITIONAL,
                            additionalActions: [
                                createSystemAnnouncement('Available commands: /help, /time, /players')
                            ]
                        };

                    case 'time':
                        const time = new Date().toLocaleTimeString();
                        return {
                            result: ActionResult.SEND_ADDITIONAL,
                            additionalActions: [
                                createColoredChatMessage(`Current time: ${time}`, 'blue')
                            ]
                        };

                    case 'players':
                        // This would normally get player count from game state
                        return {
                            result: ActionResult.SEND_ADDITIONAL,
                            additionalActions: [
                                createColoredChatMessage('Players online: 1', 'green')
                            ]
                        };

                    default:
                        return {
                            result: ActionResult.SEND_ADDITIONAL,
                            additionalActions: [
                                createColoredChatMessage(`Unknown command: /${command}`, 'red')
                            ]
                        };
                }
            }
        }
    }

    return { result: ActionResult.PASS_THROUGH };
};