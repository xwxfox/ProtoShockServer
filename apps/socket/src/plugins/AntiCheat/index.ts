import { actionMiddleware } from "@socket/handlers/ActionMiddleware";
import { PluginClass, PluginInfo } from "@socket/types/Plugins";
import { Server, Socket } from "socket.io";
import { PluginRegistry } from "@socket/utils/PluginRegistry";

import { antiCheatHandler } from "./Handlers/antiCheatHandler";

export class AntiCheat implements PluginClass {
    PluginInfo: PluginInfo = {
        id: 'protoshock.anticheat',
        name: 'ProtoShock Anti-Cheat',
        description: 'Handles anti-cheat for ProtoShock - Better than VAC LIVE.',
        version: '1.0.0',
        author: 'xwxfox'
    };
    registerHandlers(io?: Server, socket?: Socket): boolean {
        try {
            actionMiddleware.registerRPCHandler('playerinfo', antiCheatHandler);
            PluginRegistry.pluginLog(this.PluginInfo.name, "Registered action handlers");
            return true;
        } catch (error) {
            PluginRegistry.pluginLog(this.PluginInfo.name, "Failed to register built-in action handlers:", error);
            return false;
        }
    }
}

// Self-register
PluginRegistry.registerPlugin(AntiCheat);