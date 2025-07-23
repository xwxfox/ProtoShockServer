import { Socket } from "socket.io";
import {
    Action,
    ActionHandler,
    ActionHandlerResponse,
    ActionContext,
    ActionResult,
    RPCAction,
    RPC,
    BaseRPC
} from "@socket/types";

/**
 * Action Middleware System
 * 
 * Provides a flexible way to handle, modify, block, or pass through actions.
 * Handlers can be registered for specific action types or patterns.
 */
export class ActionMiddleware {
    private handlers = new Map<string, ActionHandler[]>();
    private globalHandlers: ActionHandler[] = [];
    private rpcHandlers = new Map<string, ActionHandler[]>();

    /**
     * Register a handler for a specific action type
     */
    registerHandler(actionType: string, handler: ActionHandler): void {
        if (!this.handlers.has(actionType)) {
            this.handlers.set(actionType, []);
        }
        this.handlers.get(actionType)!.push(handler);
    }

    /**
     * Register a handler that runs for all actions
     */
    registerGlobalHandler(handler: ActionHandler): void {
        this.globalHandlers.push(handler);
    }

    /**
     * Register a handler for specific RPC types
     */
    registerRPCHandler(rpcType: string, handler: ActionHandler): void {
        if (!this.rpcHandlers.has(rpcType)) {
            this.rpcHandlers.set(rpcType, []);
        }
        this.rpcHandlers.get(rpcType)!.push(handler);
    }

    /**
     * Process an action through the middleware chain
     */
    async processAction(
        socket: Socket,
        action: Action,
        context: ActionContext
    ): Promise<ActionHandlerResponse> {
        let currentAction = action;
        let additionalActions: Action[] = [];

        // Run global handlers first
        for (const handler of this.globalHandlers) {
            const response = await handler(socket, currentAction, context);

            if (response.result === ActionResult.BLOCK) {
                return response;
            }

            if (response.result === ActionResult.MODIFY && response.modifiedAction) {
                currentAction = response.modifiedAction;
            }

            if (response.additionalActions) {
                additionalActions.push(...response.additionalActions);
            }
        }

        // Run specific action handlers
        const actionHandlers = this.handlers.get(currentAction.action) || [];
        for (const handler of actionHandlers) {
            const response = await handler(socket, currentAction, context);

            if (response.result === ActionResult.BLOCK) {
                return response;
            }

            if (response.result === ActionResult.MODIFY && response.modifiedAction) {
                currentAction = response.modifiedAction;
            }

            if (response.additionalActions) {
                additionalActions.push(...response.additionalActions);
            }
        }

        // Handle RPC actions specially
        if (currentAction.action === 'rpc') {
            const rpcAction = currentAction as RPCAction;
            const parsedRPC = this.parseRPC(rpcAction.rpc);

            if (parsedRPC) {
                const rpcHandlers = this.rpcHandlers.get(parsedRPC.type) || [];
                for (const handler of rpcHandlers) {
                    // Create a temporary action with parsed RPC for easier handling
                    const rpcContext = { ...context, parsedRPC };
                    const response = await handler(socket, currentAction, rpcContext);

                    if (response.result === ActionResult.BLOCK) {
                        return response;
                    }

                    if (response.result === ActionResult.MODIFY && response.modifiedAction) {
                        currentAction = response.modifiedAction;
                    }

                    if (response.additionalActions) {
                        additionalActions.push(...response.additionalActions);
                    }
                }
            }
        }

        return {
            result: additionalActions.length > 0 ? ActionResult.SEND_ADDITIONAL : ActionResult.PASS_THROUGH,
            modifiedAction: currentAction,
            additionalActions
        };
    }

    /**
     * Parse RPC string into typed object
     */
    parseRPC(rpcString: string): RPC | null {
        try {
            const parsed = JSON.parse(rpcString);
            return parsed as RPC;
        } catch (error) {
            console.warn('Failed to parse RPC:', rpcString, error);
            return null;
        }
    }

    /**
     * Create RPC action from RPC object
     */
    createRPCAction(rpc: RPC, sender: string, id: string = ''): RPCAction {
        return {
            action: 'rpc',
            rpc: JSON.stringify(rpc),
            sender,
            id
        };
    }

    /**
     * Utility to check if action is of specific type
     */
    isActionType<T extends Action>(action: Action, type: string): action is T {
        return action.action === type;
    }

    /**
     * Utility to check if RPC is of specific type
     */
    isRPCType<T extends RPC>(rpc: BaseRPC, type: string): rpc is T {
        return rpc.type === type;
    }
}

// Create a default instance
export const actionMiddleware = new ActionMiddleware();

/**
 * Convenience decorators for easy handler registration
 */
export function HandleAction(actionType: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        // Register the handler when the decorator is applied
        actionMiddleware.registerHandler(actionType, originalMethod);

        return descriptor;
    };
}

export function HandleRPC(rpcType: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        // Register the RPC handler when the decorator is applied
        actionMiddleware.registerRPCHandler(rpcType, originalMethod);

        return descriptor;
    };
}

export function HandleGlobal() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        // Register the global handler when the decorator is applied
        actionMiddleware.registerGlobalHandler(originalMethod);

        return descriptor;
    };
}
