import { pgTable, serial, text, integer, real, boolean, bigint } from 'drizzle-orm/pg-core';

export const playerStats = pgTable('player_stats', {
    id: serial('id').primaryKey(),
    playerId: text('player_id').notNull(),
    playerName: text('player_name'),
    roomId: text('room_id').notNull(),
    roomName: text('room_name'),
    kills: integer('kills').default(0),
    deaths: integer('deaths').default(0),
    damage: real('damage').default(0),
    health: real('health').default(100),
    latency: integer('latency').default(0),
    joinTime: bigint('join_time', { mode: 'number' }).notNull(),
    leaveTime: bigint('leave_time', { mode: 'number' }),
    sessionDuration: integer('session_duration').default(0),
    lastUpdated: bigint('last_updated', { mode: 'number' }).notNull(),
});

export const serverStats = pgTable('server_stats', {
    id: serial('id').primaryKey(),
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
    totalPlayers: integer('total_players').notNull(),
    totalRooms: integer('total_rooms').notNull(),
    memoryUsage: real('memory_usage').notNull(),
    cpuUsage: real('cpu_usage').default(0),
    uptime: integer('uptime').notNull(),
});

export const chatMessages = pgTable('chat_messages', {
    id: serial('id').primaryKey(),
    playerId: text('player_id').notNull(),
    playerName: text('player_name'),
    roomId: text('room_id').notNull(),
    message: text('message').notNull(),
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
    isAdminMessage: boolean('is_admin_message').default(false),
});

export const serverEvents = pgTable('server_events', {
    id: serial('id').primaryKey(),
    eventType: text('event_type').notNull(),
    playerId: text('player_id'),
    roomId: text('room_id'),
    eventData: text('event_data'),
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
});

export const adminActions = pgTable('admin_actions', {
    id: serial('id').primaryKey(),
    adminId: text('admin_id').notNull(),
    action: text('action').notNull(),
    targetId: text('target_id'),
    reason: text('reason'),
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
});

export const bannedPlayers = pgTable('banned_players', {
    id: serial('id').primaryKey(),
    playerId: text('player_id').notNull(),
    playerName: text('player_name'),
    bannedBy: text('banned_by').notNull(),
    reason: text('reason'),
    bannedAt: bigint('banned_at', { mode: 'number' }).notNull(),
    expiresAt: bigint('expires_at', { mode: 'number' }),
    isActive: boolean('is_active').default(true),
});
