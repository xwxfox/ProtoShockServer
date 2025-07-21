import { Socket } from "socket.io";

export class WebClient {
    connectedWebClients: Map<Socket, Socket> = new Map();
}
