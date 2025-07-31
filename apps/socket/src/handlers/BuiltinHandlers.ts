import { actionMiddleware } from "@socket/handlers/ActionMiddleware";

import { loggingHandler } from "@socket/handlers/MiddlewareHandlers/loggingHandler";
import { antiCheatHandler } from "@socket/handlers/MiddlewareHandlers/antiCheatHandler";
import { chatFilterHandler } from "@socket/handlers/MiddlewareHandlers/chatFilterHandler";
import { rateLimitHandler } from "@socket/handlers/MiddlewareHandlers/rateLimitHandler";
import { transformThrottleHandler } from "@socket/handlers/MiddlewareHandlers/transformThrottleHandler";
import { roomValidationHandler } from "@socket/handlers/MiddlewareHandlers/roomValidationHandler";
import { welcomeHandler } from "@socket/handlers/MiddlewareHandlers/welcomeHandler";
import { chatCommandHandler } from "@socket/handlers/MiddlewareHandlers/basicCommandHandler";
import { transformSmoothingHandler } from "@socket/handlers/MiddlewareHandlers/transformSmoothing";
import { chatMonitoringHandler } from "@socket/handlers/MiddlewareHandlers/chatMonitoringHandler";
import { mergePlayerNameWithPlayerObjectHandler } from "@socket/handlers/MiddlewareHandlers/mergeNameToPlayerId";

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
    actionMiddleware.registerRPCHandler('chatmessage', chatMonitoringHandler);
    actionMiddleware.registerRPCHandler('playerinfo', antiCheatHandler);
    actionMiddleware.registerRPCHandler('SyncTransform', transformThrottleHandler);
    actionMiddleware.registerRPCHandler('SyncTransform', transformSmoothingHandler);
    actionMiddleware.registerRPCHandler("setplayername", mergePlayerNameWithPlayerObjectHandler);
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
