import { Player, RoomSummary } from "@socket/types/Basics";

export interface WebClientData {
    rooms: RoomSummary[];
    roomsCount: number;
    players: Player[];
    playerCount: number;
    uptime: string;
    memoryUsage: number;
    countryCode: string;
}
