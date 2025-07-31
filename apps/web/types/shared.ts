
export interface ChatMonitoringMessage {
    senderId: string;
    message: string;
    roomId: string | null; // Room ID or null if not in a room
    roomName: string; // Optional room name for better readability
    timestamp: number; // Unix timestamp
    senderName: string; // Name of the sender
}