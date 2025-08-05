export interface ServerInfo {
    Name: string; // Server name
    Version: string; // Server version
    Icon: string | false; // Base64 encoded string or false if no icon
    Description: string; // Server description
    Port: number;
    OnlinePlayers: number;
    MaxPlayers: number;
    Modded: boolean; // Not really used yet, but prolly will in the future
    Host: string;
    CountryCode: string;
    SupportedVersions: string[]; // Arr of supported game client versions
}