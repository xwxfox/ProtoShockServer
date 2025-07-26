import { actionMiddleware } from "./ActionMiddleware";

import { loggingHandler } from "./MiddlewareHandlers/loggingHandler";
import { antiCheatHandler } from "./MiddlewareHandlers/antiCheatHandler";
import { chatFilterHandler } from "./MiddlewareHandlers/chatFilterHandler";
import { rateLimitHandler } from "./MiddlewareHandlers/rateLimitHandler";
import { transformThrottleHandler } from "./MiddlewareHandlers/transformThrottleHandler";
import { roomValidationHandler } from "./MiddlewareHandlers/roomValidationHandler";
import { welcomeHandler } from "./MiddlewareHandlers/welcomeHandler";
import { chatCommandHandler } from "./MiddlewareHandlers/basicCommandHandler";
import { transformSmoothingHandler } from "./MiddlewareHandlers/transformSmoothing";

// Register all handlers
export function registerBuiltinHandlers() {
    // Global handlers
    actionMiddleware.registerGlobalHandler(loggingHandler);
    actionMiddleware.registerGlobalHandler(rateLimitHandler);

    // Specific action handlers
    actionMiddleware.registerHandler('createRoom', roomValidationHandler);
    actionMiddleware.registerHandler('joinRoom', welcomeHandler);

    // RPC handlers
    actionMiddleware.registerRPCHandler('chatmessage', chatFilterHandler);
    actionMiddleware.registerRPCHandler('chatmessage', chatCommandHandler);
    actionMiddleware.registerRPCHandler('playerinfo', antiCheatHandler);
    actionMiddleware.registerRPCHandler('SyncTransform', transformThrottleHandler);
    actionMiddleware.registerRPCHandler('SyncTransform', transformSmoothingHandler);

    console.log('Built in action handlers registered!');
}

// Export individual handlers for custom registration
export {
    loggingHandler,
    rateLimitHandler,
    chatFilterHandler,
    antiCheatHandler,
    transformThrottleHandler,
    roomValidationHandler,
    transformSmoothingHandler,
    chatCommandHandler,
    welcomeHandler
};
