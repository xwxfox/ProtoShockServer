import { actionMiddleware } from "@socket/handlers/ActionMiddleware";

import { loggingHandler } from "./Handlers//loggingHandler";
import { chatFilterHandler } from "./Handlers//chatFilterHandler";
import { rateLimitHandler } from "./Handlers//rateLimitHandler";
import { roomValidationHandler } from "./Handlers//roomValidationHandler";
import { welcomeHandler } from "./Handlers//welcomeHandler";
import { chatCommandHandler } from "./Handlers//basicCommandHandler";
import { chatMonitoringHandler } from "./Handlers//chatMonitoringHandler";
import { mergePlayerNameWithPlayerObjectHandler } from "./Handlers//mergeNameToPlayerId";

import { PluginClass, PluginInfo } from "@socket/types/Plugins";
import { Server, Socket } from "socket.io";
import { PluginRegistry } from "@socket/utils/PluginRegistry";

export class ProtoShockBuiltIn implements PluginClass {
    PluginInfo: PluginInfo = {
        id: 'protoshock.builtin',
        name: 'ProtoShock Built-in Handlers',
        description: 'Handles various built-in actions for ProtoShock',
        version: '1.0.0',
        author: 'xwxfox'
    };
    registerHandlers(io?: Server, socket?: Socket): boolean {
        try {
            // Global handlers
            actionMiddleware.registerGlobalHandler(loggingHandler);
            actionMiddleware.registerGlobalHandler(rateLimitHandler);

            // Specific action handlers
            actionMiddleware.registerHandler('createRoom', roomValidationHandler);
            // send hello on room creation too
            actionMiddleware.registerHandler('createRoom', welcomeHandler);
            actionMiddleware.registerHandler('joinRoom', welcomeHandler);

            // RPC handlers
            actionMiddleware.registerRPCHandler('chatmessage', chatFilterHandler);
            actionMiddleware.registerRPCHandler('chatmessage', chatCommandHandler);
            actionMiddleware.registerRPCHandler('chatmessage', chatMonitoringHandler);
            actionMiddleware.registerRPCHandler("setplayername", mergePlayerNameWithPlayerObjectHandler);
            PluginRegistry.pluginLog(this.PluginInfo.name, "Registered built-in action handlers");
            return true;
        } catch (error) {
            PluginRegistry.pluginLog(this.PluginInfo.name, "Failed to register built-in action handlers:", error);
            return false;
        }
    }
}

// Self-register
PluginRegistry.registerPlugin(ProtoShockBuiltIn);