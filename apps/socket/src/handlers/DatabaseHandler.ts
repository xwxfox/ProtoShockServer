import { Socket } from 'socket.io';
import { ProtoDBClass } from '@protoshock/database';
import { playerStats, serverStats, chatMessages, serverEvents, adminActions } from '@protoshock/database';
import { serverData } from '@socket/global';
import { Player, Room, RPC } from '@socket/types';
import { eq, gte, desc, asc } from 'drizzle-orm';

export class DatabaseHandler {
    private db: ProtoDBClass;

    constructor() {
        this.db = new ProtoDBClass();
        this.initDatabase();
    }

    private async initDatabase() {
        await this.db.init();
        console.log('[Database] Database handler initialized');
    }

    async logPlayerJoin(player: Player, room: Room) {
        try {
            await this.db.database.insert(playerStats).values({
                playerId: player.id,
                roomId: player.roomId,
                roomName: room.name,
                joinTime: Date.now(),
                lastUpdated: Date.now(),
            });

            await this.db.database.insert(serverEvents).values({
                eventType: 'player_join',
                playerId: player.id,
                roomId: player.roomId,
                eventData: JSON.stringify({ hosting: player.hosting }),
                timestamp: Date.now(),
            });
        } catch (error) {
            console.error('[Database] Error logging player join:', error);
        }
    }

    async logPlayerLeave(player: Player) {
        try {
            const now = Date.now();

            // Update player stats with leave time
            const playerStatsRecord = await this.db.database
                .select()
                .from(playerStats)
                .where(eq(playerStats.playerId, player.id))
                .orderBy(desc(playerStats.joinTime))
                .limit(1);

            if (playerStatsRecord.length > 0) {
                const session = playerStatsRecord[0];
                const sessionDuration = Math.floor((now - session.joinTime) / 1000);

                await this.db.database
                    .update(playerStats)
                    .set({
                        leaveTime: now,
                        sessionDuration,
                        lastUpdated: now,
                    })
                    .where(eq(playerStats.id, session.id));
            }

            await this.db.database.insert(serverEvents).values({
                eventType: 'player_leave',
                playerId: player.id,
                roomId: player.roomId,
                timestamp: now,
            });
        } catch (error) {
            console.error('[Database] Error logging player leave:', error);
        }
    }

    async updatePlayerStats(playerId: string, playerName: string | null, data: {
        health?: number;
        latency?: number;
        kills?: number;
        deaths?: number;
        damage?: number;
    }) {
        try {
            // Get the latest session for this player
            const latestSession = await this.db.database
                .select()
                .from(playerStats)
                .where(eq(playerStats.playerId, playerId))
                .orderBy(desc(playerStats.joinTime))
                .limit(1);

            if (latestSession.length > 0) {
                const updateData: any = {
                    lastUpdated: Date.now(),
                };

                if (playerName) updateData.playerName = playerName;
                if (data.health !== undefined) updateData.health = data.health;
                if (data.latency !== undefined) updateData.latency = data.latency;
                if (data.kills !== undefined) updateData.kills = (latestSession[0].kills || 0) + data.kills;
                if (data.deaths !== undefined) updateData.deaths = (latestSession[0].deaths || 0) + data.deaths;
                if (data.damage !== undefined) updateData.damage = (latestSession[0].damage || 0) + data.damage;

                await this.db.database
                    .update(playerStats)
                    .set(updateData)
                    .where(eq(playerStats.id, latestSession[0].id));
            }
        } catch (error) {
            console.error('[Database] Error updating player stats:', error);
        }
    }

    async logChatMessage(playerId: string, playerName: string | null, roomId: string, message: string, isAdminMessage = false) {
        try {
            await this.db.database.insert(chatMessages).values({
                playerId,
                playerName,
                roomId,
                message,
                timestamp: Date.now(),
                isAdminMessage: isAdminMessage ? 1 : 0,
            });
        } catch (error) {
            console.error('[Database] Error logging chat message:', error);
        }
    }

    async logServerStats() {
        try {
            const memoryUsage = Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
            const totalPlayers = serverData.getTotalPlayerCount();
            const totalRooms = serverData.rooms.size;
            const uptime = Math.floor(process.uptime());

            await this.db.database.insert(serverStats).values({
                timestamp: Date.now(),
                totalPlayers,
                totalRooms,
                memoryUsage,
                uptime,
            });
        } catch (error) {
            console.error('[Database] Error logging server stats:', error);
        }
    }

    async logAdminAction(adminId: string, action: string, targetId?: string, reason?: string) {
        try {
            await this.db.database.insert(adminActions).values({
                adminId,
                action,
                targetId,
                reason,
                timestamp: Date.now(),
            });
        } catch (error) {
            console.error('[Database] Error logging admin action:', error);
        }
    }

    async getRecentChatMessages(roomId?: string, limit = 50) {
        try {
            if (roomId) {
                return await this.db.database
                    .select()
                    .from(chatMessages)
                    .where(eq(chatMessages.roomId, roomId))
                    .orderBy(desc(chatMessages.timestamp))
                    .limit(limit);
            } else {
                return await this.db.database
                    .select()
                    .from(chatMessages)
                    .orderBy(desc(chatMessages.timestamp))
                    .limit(limit);
            }
        } catch (error) {
            console.error('[Database] Error getting chat messages:', error);
            return [];
        }
    }

    async getPlayerStats(limit = 100) {
        try {
            return await this.db.database
                .select()
                .from(playerStats)
                .orderBy(desc(playerStats.lastUpdated))
                .limit(limit);
        } catch (error) {
            console.error('[Database] Error getting player stats:', error);
            return [];
        }
    }

    async getServerStatsHistory(hours = 24) {
        try {
            const since = Date.now() - (hours * 60 * 60 * 1000);
            return await this.db.database
                .select()
                .from(serverStats)
                .where(gte(serverStats.timestamp, since))
                .orderBy(asc(serverStats.timestamp));
        } catch (error) {
            console.error('[Database] Error getting server stats history:', error);
            return [];
        }
    }

    getDatabase() {
        return this.db.database;
    }
}

export const databaseHandler = new DatabaseHandler();
