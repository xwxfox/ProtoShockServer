import { ServerState } from '@socket/handlers/ServerState';

import { MessageQueue } from '@socket/handlers/MessageQueue';
import { databaseHandler } from '@socket/handlers/DatabaseHandler';
import { Socket } from 'socket.io';

export class WebClient {
    connectedWebClients: Map<Socket, Socket> = new Map();
}
export const serverData = new ServerState();
export const webclients = new WebClient();
export const messageQueue = new MessageQueue();
export const clientStates = new Map<string, {
    connectedAt: number;
    lastMessageAt: number;
    messageCount: number;
    consecutiveErrors: number;
    isHealthy: boolean;
}>();

export { databaseHandler };

