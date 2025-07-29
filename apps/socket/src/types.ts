import { Socket } from "socket.io";

export interface WebClientData {
  rooms: RoomSummary[];
  roomsCount: number;
  players: any[];
  playerCount: number;
  uptime: string;
  memoryUsage: number;
  countryCode: string;
}

// Base action interface
export interface BaseAction {
  action: string;
  [key: string]: any;
}

// Specific action types
export interface GetRoomListAction extends BaseAction {
  action: 'getroomlist';
  amount?: number;
  emptyonly?: boolean;
}

export interface CreateRoomAction extends BaseAction {
  action: 'createRoom';
  gameversion: string;
  roomName: string;
  scene: number;
  maxplayers: number;
  scenepath: string;
}

export interface JoinRoomAction extends BaseAction {
  action: 'joinRoom';
  roomId: string;
  gameversion: string;
}

export interface GetCurrentPlayersAction extends BaseAction {
  action: 'getcurrentplayers';
}

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

// Union types for type safety
export type Action =
  | GetRoomListAction
  | CreateRoomAction
  | JoinRoomAction
  | GetCurrentPlayersAction
  | RPCAction;

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

// Action handling results
export enum ActionResult {
  PASS_THROUGH = 'pass_through',
  BLOCK = 'block',
  MODIFY = 'modify',
  SEND_ADDITIONAL = 'send_additional'
}

export interface ActionHandlerResponse {
  result: ActionResult;
  modifiedAction?: Action;
  additionalActions?: Action[];
  reason?: string;
  delay?: number; // Optional delay in milliseconds before processing the action
}

// Action handler function type
export type ActionHandler = (
  socket: Socket,
  action: Action,
  context: ActionContext
) => Promise<ActionHandlerResponse> | ActionHandlerResponse;

// Context provided to action handlers
export interface ActionContext {
  player?: Player;
  room?: Room;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Existing interfaces
export interface Player {
  id: string;
  socket: Socket;
  roomId: string;
  local: boolean;
  hosting: boolean;
  lastMessageTime?: number;
  name: "PLAYER" | string;
}

export interface Room {
  id: string;
  name: string;
  scene: string;
  scenepath: string;
  gameversion: string;
  maxplayers: number;
  players: Map<string, Player>;
  playerCount: number;
}

export interface RoomSummary {
  RoomID: string;
  RoomName: string;
  RoomPlayerCount: number;
  RoomPlayerMax: number;
  RoomGameVersion: string;
}

export interface RPCMessage {
  action: 'rpc';
  rpc: string;
  sender: string;
  id: string;
}

export interface RoomInfoMessage {
  action: 'roominfo' | 'currentplayers';
  playerIds: {
    playerId: string;
    local: boolean;
    roomId: string;
  }[];
  scene: string;
  scenepath: string;
  gameversion: string;
  id: string;
}

export interface RoomListMessage {
  action: 'roomlist_roominfo';
  roomName: string;
  roomId: string;
  roomversion: string;
  playercount: number;
}

export interface ServerStats {
  playerCount: number;
  memoryUsage: string;
  countryCode?: string;
  uptime: string;
  rooms: RoomSummary[];
  roomsCount: number;
}

export interface ActionPayload {
  action: string;
  [key: string]: any;
}
