import { Socket } from "socket.io";

export class MessageQueue {
    MessagesToSend: Map<Socket, any[]> = new Map();
}
