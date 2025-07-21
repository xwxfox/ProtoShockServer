import { ServerState } from '@socket/handlers/ServerState';
import { WebClient } from '@socket/handlers/WebClient';
import { MessageQueue } from '@socket/handlers/MessageQueue';

export const serverData = new ServerState();
export const webclients = new WebClient();
export const messageQueue = new MessageQueue();

