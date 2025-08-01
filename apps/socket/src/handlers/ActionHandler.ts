import { Action, ActionContext, EvaluateMiddlewaresOnActionResult, ActionResult } from "@socket/types";
import { Socket } from "socket.io";
import { actionMiddleware } from "./ActionMiddleware";
import { internal } from "@socket/utils/Logging";

/**
 * Main action handler that processes all incoming actions through the middleware system
 * Returns the processed action and any additional actions that should be sent to clients
 */
export const evaluateMiddlewaresOnAction = async (
    socket: Socket,
    action: Action,
    context?: Partial<ActionContext>
): Promise<EvaluateMiddlewaresOnActionResult> => {
    // Create action context
    const actionContext: ActionContext = {
        timestamp: Date.now(),
        ...context
    };

    try {
        // Process through middleware
        const response = await actionMiddleware.processAction(socket, action, actionContext);

        // Handle the response
        switch (response.result) {
            case ActionResult.BLOCK:
                internal.log(`Action blocked: ${action.action}`, response.reason);
                return { processedAction: null };

            case ActionResult.MODIFY:
                internal.log(`Action modified: ${action.action}`, response.reason);
                return {
                    processedAction: response.modifiedAction || null,
                    additionalActions: response.additionalActions
                };

            case ActionResult.SEND_ADDITIONAL:
                internal.log(`Sending additional actions for: ${action.action}`);
                return {
                    processedAction: response.modifiedAction || action,
                    additionalActions: response.additionalActions,
                    delay: response.delay || 0
                };

            case ActionResult.PASS_THROUGH:
            default:
                return {
                    processedAction: response.modifiedAction || action,
                    additionalActions: response.additionalActions
                };
        }
    } catch (error) {
        console.error('Error processing action:', error);
        return { processedAction: action }; // Fall back to original action
    }
};