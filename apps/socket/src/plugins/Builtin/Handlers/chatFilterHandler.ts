import { ActionHandler, RPCAction, ChatMessageRPC, ActionResult } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";

// Chat filter handler - modifies chat messages
export const chatFilterHandler: ActionHandler = (socket, action, context) => {
    if (action.action === 'rpc') {
        const rpcAction = action as RPCAction;
        const parsedRPC = actionMiddleware.parseRPC(rpcAction.rpc);

        if (parsedRPC && actionMiddleware.isRPCType<ChatMessageRPC>(parsedRPC, 'chatmessage')) {
            // Filter profanity 
            const profanityRegexArray = [
                /owo/gi,
                /knot/gi,
                /uwu/gi,
                /nya/gi,
                /meow/gi
            ]

            // Run the regexes on the message to check for matches
            let shouldFilterMessage = false;

            for (const regex of profanityRegexArray) {
                if (regex.test(parsedRPC.message)) {
                    shouldFilterMessage = true;
                    break;
                }
            }

            if (shouldFilterMessage) {
                const modifiedRPC: ChatMessageRPC = {
                    ...parsedRPC,
                    message: "<color=red>stop being gay in proto chat</color>"
                };

                const modifiedAction = actionMiddleware.createRPCAction(
                    modifiedRPC,
                    rpcAction.sender,
                    rpcAction.id
                );

                return {
                    result: ActionResult.MODIFY,
                    modifiedAction,
                    reason: 'Filtered inappropriate content'
                };
            } else {
                return { result: ActionResult.PASS_THROUGH };
            }
        }
    }

    return { result: ActionResult.PASS_THROUGH };
};