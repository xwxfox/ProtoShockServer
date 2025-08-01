import { Socket } from "socket.io";
import { Player, Room } from "@socket/types/Basics";
import { RPCAction } from "@socket/types/RPC";

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
    scene: string;
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

export interface LeaveRoomAction extends BaseAction {
    action: 'leave';
}

// Union types for type safety
export type Action =
    | GetRoomListAction
    | CreateRoomAction
    | JoinRoomAction
    | GetCurrentPlayersAction
    | RPCAction
    | LeaveRoomAction;


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

export interface EvaluateMiddlewaresOnActionResult {
    processedAction: Action | null;
    additionalActions?: Action[];
    delay?: number;
}