import { actionMiddleware } from "@socket/handlers/ActionMiddleware";
import { PluginClass, PluginInfo } from "@socket/types/Plugins";
import { Server, Socket } from "socket.io";
import { PluginRegistry } from "@socket/utils/PluginRegistry";

import { transformThrottleHandler } from "./Handlers//transformThrottleHandler";
import { transformSmoothingHandler } from "./Handlers//transformSmoothing";

export class ProtoShockMovementSmoothing implements PluginClass {
    PluginInfo: PluginInfo = {
        id: 'protoshock.movementSmoothing',
        name: 'ProtoShock Movement Smoothing',
        description: 'Handles movement smoothing for ProtoShock',
        version: '1.0.0',
        author: 'xwxfox'
    };
    registerHandlers(io?: Server, socket?: Socket): boolean {
        try {
            actionMiddleware.registerRPCHandler('SyncTransform', transformThrottleHandler);
            actionMiddleware.registerRPCHandler('SyncTransform', transformSmoothingHandler);
            PluginRegistry.pluginLog(this.PluginInfo.name, "Registered action handlers");
            return true;
        } catch (error) {
            PluginRegistry.pluginLog(this.PluginInfo.name, "Failed to register action handlers:", error);
            return false;
        }
    }
}

// Self-register
PluginRegistry.registerPlugin(ProtoShockMovementSmoothing);