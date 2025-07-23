import {
    RPCAction,
    ChatMessageRPC,
    PlayerInfoRPC,
    SyncTransformRPC,
    PlayerSpawnRPC,
    PlayerJoinedRPC,
    SetPlayerNameRPC,
    SyncInfoRPC,
    CustomizationRPC,
    CheatsRPC,
    SwitchWeaponRPC
} from "@socket/types";

/**
 * Utility functions for creating typed RPC actions
 * These provide a clean, type-safe way to create RPC events
 */

/**
 * Create a chat message RPC action
 */
export function createChatMessage(message: string, sender: string = 'server', id: string = ''): RPCAction {
    const rpc: ChatMessageRPC = {
        type: 'chatmessage',
        message
    };

    return {
        action: 'rpc',
        rpc: JSON.stringify(rpc),
        sender,
        id
    };
}

/**
 * Create a player info RPC action
 */
export function createPlayerInfo(
    crouching: boolean,
    sliding: boolean,
    wallrunning: boolean,
    health: number,
    latency: number,
    reloading: boolean,
    aiming: boolean,
    spawnprotection: boolean,
    hasweapons: boolean,
    sender: string,
    id: string = ''
): RPCAction {
    const rpc: PlayerInfoRPC = {
        type: 'playerinfo',
        crouching,
        sliding,
        wallrunning,
        health,
        latency,
        reloading,
        aiming,
        spawnprotection,
        hasweapons
    };

    return {
        action: 'rpc',
        rpc: JSON.stringify(rpc),
        sender,
        id
    };
}

/**
 * Create a sync transform RPC action
 */
export function createSyncTransform(
    objectId: string,
    posx: number,
    posy: number,
    posz: number,
    rotx: number,
    roty: number,
    rotz: number,
    scalex: number = 1,
    scaley: number = 1,
    scalez: number = 1,
    sender: string,
    actionId: string = ''
): RPCAction {
    const rpc: SyncTransformRPC = {
        type: 'SyncTransform',
        id: objectId,
        posx,
        posy,
        posz,
        rotx,
        roty,
        rotz,
        scalex,
        scaley,
        scalez
    };

    return {
        action: 'rpc',
        rpc: JSON.stringify(rpc),
        sender,
        id: actionId
    };
}

/**
 * Create a player spawn RPC action
 */
export function createPlayerSpawn(sender: string, id: string = ''): RPCAction {
    const rpc: PlayerSpawnRPC = {
        type: 'playerspawn'
    };

    return {
        action: 'rpc',
        rpc: JSON.stringify(rpc),
        sender,
        id
    };
}

/**
 * Create a player joined RPC action
 */
export function createPlayerJoined(sender: string, id: string = ''): RPCAction {
    const rpc: PlayerJoinedRPC = {
        type: 'playerjoined'
    };

    return {
        action: 'rpc',
        rpc: JSON.stringify(rpc),
        sender,
        id
    };
}

/**
 * Create a set player name RPC action
 */
export function createSetPlayerName(name: string, sender: string, id: string = ''): RPCAction {
    const rpc: SetPlayerNameRPC = {
        type: 'setplayername',
        name
    };

    return {
        action: 'rpc',
        rpc: JSON.stringify(rpc),
        sender,
        id
    };
}

/**
 * Create a sync info RPC action
 */
export function createSyncInfo(
    k: number,
    d: number,
    team: number,
    lives: number,
    teamscore: any[],
    roundtime: number,
    sender: string,
    id: string = ''
): RPCAction {
    const rpc: SyncInfoRPC = {
        type: 'syncinfo',
        k,
        d,
        team,
        lives,
        teamscore,
        roundtime
    };

    return {
        action: 'rpc',
        rpc: JSON.stringify(rpc),
        sender,
        id
    };
}

/**
 * Create a customization RPC action
 */
export function createCustomization(
    BodyEmissionUrl: string,
    PartsEmissionUrl: string,
    ScreensEmissionUrl: string,
    BodyUrl: string,
    PartsUrl: string,
    ScreensUrl: string,
    sender: string,
    id: string = ''
): RPCAction {
    const rpc: CustomizationRPC = {
        type: 'customization',
        BodyEmissionUrl,
        PartsEmissionUrl,
        ScreensEmissionUrl,
        BodyUrl,
        PartsUrl,
        ScreensUrl
    };

    return {
        action: 'rpc',
        rpc: JSON.stringify(rpc),
        sender,
        id
    };
}

/**
 * Create a cheats RPC action
 */
export function createCheats(enabled: boolean, sender: string, id: string = ''): RPCAction {
    const rpc: CheatsRPC = {
        type: 'cheats',
        enabled
    };

    return {
        action: 'rpc',
        rpc: JSON.stringify(rpc),
        sender,
        id
    };
}

/**
 * Create a switch weapon RPC action
 */
export function createSwitchWeapon(index: number, sender: string, id: string = ''): RPCAction {
    const rpc: SwitchWeaponRPC = {
        type: 'switchweapon',
        index
    };

    return {
        action: 'rpc',
        rpc: JSON.stringify(rpc),
        sender,
        id
    };
}

/**
 * Helper function to create colored chat messages
 */
export function createColoredChatMessage(
    message: string,
    color: 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple' | 'white' = 'white',
    sender: string = 'server',
    id: string = ''
): RPCAction {
    const coloredMessage = `<color=${color}>${message}</color>`;
    return createChatMessage(coloredMessage, sender, id);
}

/**
 * Helper function to create system announcement
 */
export function createSystemAnnouncement(
    message: string,
    sender: string = 'server',
    id: string = ''
): RPCAction {
    const announcement = `<color=yellow>[SYSTEM]</color> ${message}`;
    return createChatMessage(announcement, sender, id);
}

/**
 * Helper function to create welcome message
 */
export function createWelcomeMessage(
    playerName: string,
    sender: string = 'server',
    id: string = ''
): RPCAction {
    const message = `<color=green>${playerName} joined the server! Welcome!</color>`;
    return createChatMessage(message, sender, id);
}

/**
 * Helper function to create disconnect message
 */
export function createDisconnectMessage(
    playerName: string,
    sender: string = 'server',
    id: string = ''
): RPCAction {
    const message = `<color=red>${playerName} left the server.</color>`;
    return createChatMessage(message, sender, id);
}
