import { Socket } from "socket.io";

export interface Player {
  id: string;
  socket: Socket;
  roomId: string;
  local: boolean;
  hosting: boolean;
  lastMessageTime?: number;
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
