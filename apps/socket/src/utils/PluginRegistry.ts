import { PluginClass, PluginInfo } from "@socket/types/Plugins";
import Path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);
import fs from 'fs';
import { internal } from "./Logging";
/**
 * Registry for all available plugins (formatters, converters, filters).
 */
export class PluginRegistry {
    private static plugins = new Map<string, new () => PluginClass>();
    // Store info separately for quick lookup
    private static pluginInfos = new Map<string, PluginInfo>();
    private static localPluginsDir: string = "Plugins";

    /**
     * Registers a plugin class.
     */
    static registerPlugin(pluginCtor: new () => PluginClass): void {
        const instance = new pluginCtor();
        const info: PluginInfo = instance.PluginInfo;
        if (this.plugins.has(info.id)) {
            throw new Error(`Plugin with id "${info.id}" already registered.`);
        }
        this.plugins.set(info.id, pluginCtor);
        this.pluginInfos.set(info.id, info); // Store info
        console.log('[PluginRegistry]', `Registered plugin: ${info.id}`);
    }

    /**
     * Retrieves a plugin class by ID.
     * @param id The ID of the plugin.
     * @returns The plugin class if found, otherwise undefined.
     */
    static getPluginClass(id: string): (new () => PluginClass) | undefined {
        return this.plugins.get(id);
    }

    /**
     * Retrieves the PluginInfo for a registered plugin by ID.
     * @param id The ID of the plugin.
     * @returns The PluginInfo object if found, otherwise undefined.
     */
    static getPluginInfo(id: string): PluginInfo | undefined {
        return this.pluginInfos.get(id);
    }

    /**
  * Dynamically loads all plugin modules so they self-register.
  */
    static async loadPlugins(): Promise<void> {
        const pluginsBase = Path.join(__dirname, "../", 'plugins');
        internal.debug('[PluginLoader]', `Loading plugins from: ${pluginsBase}`);
        const dirs = await fs.readdirSync(pluginsBase, { withFileTypes: true });
        for (const pluginDir of dirs) {
            if (pluginDir.isDirectory()) {
                let filePath = Path.join(pluginsBase, pluginDir.name, 'index.ts');
                if (!fs.existsSync(filePath)) {
                    filePath = Path.join(pluginsBase, pluginDir.name, 'index.js');
                    if (!fs.existsSync(filePath)) {
                        internal.debug('[PluginLoader]', `No index.ts found for plugin ${pluginDir.name}`);
                        internal.debug('[PluginLoader]', `No index.js found for plugin ${pluginDir.name}`);
                        continue;
                    }
                }
                try {
                    internal.debug('[PluginLoader]', `Importing plugin module: ${filePath}`);
                    try {
                        await import(pathToFileURL(filePath).href);
                    } catch (importErr) {
                        console.error('[PluginLoader]', `Failed to load plugin module ${filePath}: ${importErr}`);
                    }
                } catch (err) {
                    internal.debug('[PluginLoader]', `No plugin directory (${err}).`);
                }
            }
        }
    }
    /**
     * Returns a list of all registered plugin infos.
     * @returns An array of PluginInfo objects.
     */
    static getPluginList(): PluginInfo[] {
        return Array.from(this.pluginInfos.values());
    }

    /**
     * Returns a list of all registered plugin classes.
     * @returns An array of plugin class constructors.
     */
    static getPluginClassList(): (new () => PluginClass)[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Logs a message with the plugin name as a prefix.
     * @param pluginName The name of the plugin.
     * @param message The message to log.
     */
    static pluginLog(pluginName: string, message: string, ...args: any[]): void {
        console.log(`[${pluginName}] ${message}`, ...args);
    }
}
