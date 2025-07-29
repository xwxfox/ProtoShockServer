import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core"

export const playerStats = sqliteTable('PLAYER_STATS', {
    id: integer().primaryKey().notNull(),
    playerId: text().notNull(),
    playerName: text(),
    roomId: text().notNull(),
    roomName: text(),
    kills: integer().default(0),
    deaths: integer().default(0),
    damage: real().default(0),
    health: real().default(100),
    latency: integer().default(0),
    joinTime: integer().notNull(), // Unix timestamp
    leaveTime: integer(), // Unix timestamp
    sessionDuration: integer().default(0), // in seconds
    lastUpdated: integer().notNull(), // Unix timestamp
});

export const serverStats = sqliteTable('SERVER_STATS', {
    id: integer().primaryKey().notNull(),
    timestamp: integer().notNull(), // Unix timestamp
    totalPlayers: integer().notNull(),
    totalRooms: integer().notNull(),
    memoryUsage: real().notNull(),
    cpuUsage: real().default(0),
    uptime: integer().notNull(),
});

export const chatMessages = sqliteTable('CHAT_MESSAGES', {
    id: integer().primaryKey().notNull(),
    playerId: text().notNull(),
    playerName: text(),
    roomId: text().notNull(),
    message: text().notNull(),
    timestamp: integer().notNull(), // Unix timestamp
    isAdminMessage: integer().default(0), // 0 = player, 1 = admin
});

export const serverEvents = sqliteTable('SERVER_EVENTS', {
    id: integer().primaryKey().notNull(),
    eventType: text().notNull(), // 'player_join', 'player_leave', 'room_created', 'room_destroyed', 'admin_action'
    playerId: text(),
    roomId: text(),
    eventData: text(), // JSON string for additional data
    timestamp: integer().notNull(), // Unix timestamp
});

export const adminActions = sqliteTable('ADMIN_ACTIONS', {
    id: integer().primaryKey().notNull(),
    adminId: text().notNull(),
    action: text().notNull(), // 'kick_player', 'ban_player', 'send_message', 'shutdown_server'
    targetId: text(), // player or room ID
    reason: text(),
    timestamp: integer().notNull(), // Unix timestamp
});

export const bannedPlayers = sqliteTable('BANNED_PLAYERS', {
    id: integer().primaryKey().notNull(),
    playerId: text().notNull(),
    playerName: text(),
    bannedBy: text().notNull(),
    reason: text(),
    bannedAt: integer().notNull(), // Unix timestamp
    expiresAt: integer(), // Unix timestamp, null for permanent
    isActive: integer().default(1), // 0 = inactive, 1 = active
});
