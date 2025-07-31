import { BaseAction } from "@socket/types/Actions";

// RPC Action and its nested types
export interface RPCAction extends BaseAction {
    action: 'rpc';
    rpc: string; // JSON string containing the actual RPC data
    sender: string;
    id: string;
}

// Parsed RPC types (from the rpc string)
export interface BaseRPC {
    type: string;
    [key: string]: any;
}

export interface PlayerSpawnRPC extends BaseRPC {
    type: 'playerspawn';
}

export interface ChatMessageRPC extends BaseRPC {
    type: 'chatmessage';
    message: string;
}

export interface PlayerJoinedRPC extends BaseRPC {
    type: 'playerjoined';
}

export interface SetPlayerNameRPC extends BaseRPC {
    type: 'setplayername';
    name: string;
}

export interface SyncInfoRPC extends BaseRPC {
    type: 'syncinfo';
    k: number;
    d: number;
    team: number;
    lives: number;
    teamscore: any[];
    roundtime: number;
}

export interface CustomizationRPC extends BaseRPC {
    type: 'customization';
    BodyEmissionUrl: string;
    PartsEmissionUrl: string;
    ScreensEmissionUrl: string;
    BodyUrl: string;
    PartsUrl: string;
    ScreensUrl: string;
}

export interface CheatsRPC extends BaseRPC {
    type: 'cheats';
    enabled: boolean;
}

export interface PlayerInfoRPC extends BaseRPC {
    type: 'playerinfo';
    crouching: boolean;
    sliding: boolean;
    wallrunning: boolean;
    health: number;
    latency: number;
    reloading: boolean;
    aiming: boolean;
    spawnprotection: boolean;
    hasweapons: boolean;
}

export interface SwitchWeaponRPC extends BaseRPC {
    type: 'switchweapon';
    index: number;
}

export interface SyncTransformRPC extends BaseRPC {
    type: 'SyncTransform';
    id: string;
    posx: number;
    posy: number;
    posz: number;
    rotx: number;
    roty: number;
    rotz: number;
    scalex: number;
    scaley: number;
    scalez: number;
}

export type RPC =
    | PlayerSpawnRPC
    | ChatMessageRPC
    | PlayerJoinedRPC
    | SetPlayerNameRPC
    | SyncInfoRPC
    | CustomizationRPC
    | CheatsRPC
    | PlayerInfoRPC
    | SwitchWeaponRPC
    | SyncTransformRPC;

