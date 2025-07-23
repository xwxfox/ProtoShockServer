import { Action, ActionContext, ActionResult } from "@socket/types";
import { Socket } from "socket.io";
import { actionMiddleware } from "./ActionMiddleware";
import { registerBuiltinHandlers } from "./BuiltinHandlers";
import fs from "fs";

// Track unique actions for logging (keep existing functionality)
// const uniqueActions = new Set<Action>();

// Initialize handlers on module load
registerBuiltinHandlers();

/**
 * Main action handler that processes all incoming actions through the middleware system
 * Returns the processed action and any additional actions that should be sent to clients
 */
export const handleAction = async (
    socket: Socket,
    action: Action,
    context?: Partial<ActionContext>
): Promise<{ processedAction: Action | null, additionalActions?: Action[] }> => {
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
                console.log(`Action blocked: ${action.action}`, response.reason);
                return { processedAction: null };

            case ActionResult.MODIFY:
                console.log(`Action modified: ${action.action}`, response.reason);
                return {
                    processedAction: response.modifiedAction || null,
                    additionalActions: response.additionalActions
                };

            case ActionResult.SEND_ADDITIONAL:
                console.log(`Sending additional actions for: ${action.action}`);
                return {
                    processedAction: response.modifiedAction || action,
                    additionalActions: response.additionalActions
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

/**
 * Convenience method to handle actions with player context
 */
export const handlePlayerAction = async (
    socket: Socket,
    action: Action,
    player?: any,
    room?: any
) => {
    return handleAction(socket, action, { player, room });
};

/**
 * Legacy wrapper that maintains backward compatibility
 * @deprecated Use the new handleAction which returns both processed and additional actions
 */
export const handleActionLegacy = async (
    socket: Socket,
    action: Action,
    context?: Partial<ActionContext>
): Promise<Action | null> => {
    const result = await handleAction(socket, action, context);
    return result.processedAction;
};

// Re-export middleware for external use
export { actionMiddleware } from "./ActionMiddleware";