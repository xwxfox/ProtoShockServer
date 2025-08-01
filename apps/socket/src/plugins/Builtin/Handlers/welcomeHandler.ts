import { ActionHandler, ActionHandlerResponse, ActionResult } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";

// Welcome message handler - sends additional actions
export const welcomeHandler: ActionHandler = (socket, action, context): ActionHandlerResponse => {
    if (action.action === 'joinRoom' || action.action === 'createRoom') {
        const welcomeMessage = actionMiddleware.createRPCAction(
            {
                type: 'chatmessage',
                message: `<color=green>Welcome to the server!</color>`
            },
            'server',
            ''
        );

        return {
            result: ActionResult.SEND_ADDITIONAL,
            additionalActions: [welcomeMessage],
            delay: 1000
        };
    }

    return { result: ActionResult.PASS_THROUGH };
};
