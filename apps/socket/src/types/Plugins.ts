import { Socket, Server } from "socket.io";

/**
 * Metadata common to all plugins.
 */
export interface PluginInfo {
    id: string;
    name: string;
    description: string;
    author: string;
    version: string;
}

export interface PluginClass {
    PluginInfo: PluginInfo;

    /**
     * Registers the plugin's event handlers with the given Socket.IO server and socket.
     * @param io The Socket.IO server instance.
     * @param socket The Socket.IO socket instance.
     * @returns True if the plugin was successfully registered, false otherwise.
     */
    registerHandlers(io?: Server, socket?: Socket): boolean;
}