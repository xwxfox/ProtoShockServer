import { ProtoDBClass } from '@protoshock/database';
import { playerStats, serverStats, chatMessages, serverEvents, adminActions } from '@protoshock/database';
import { mainServer } from '@socket/global';
import { Player, Room } from '@socket/types';
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
            const nowSec = Math.floor(Date.now() / 1000);
            await this.db.database.insert(playerStats).values({
                playerId: player.id,
                roomId: player.roomId,
                roomName: room.name,
                joinTime: nowSec,
                lastUpdated: nowSec,
            });

            await this.db.database.insert(serverEvents).values({
                eventType: 'player_join',
                playerId: player.id,
                roomId: player.roomId,
                eventData: JSON.stringify({ hosting: player.hosting }),
                timestamp: nowSec,
            });
        } catch (error) {
            console.error('[Database] Error logging player join:', error);
        }
    }

    async logPlayerLeave(player: Player) {
        try {
        const nowSec = Math.floor(Date.now() / 1000);

            // Update player stats with leave time
            const playerStatsRecord = await this.db.database
                .select()
                .from(playerStats)
                .where(eq(playerStats.playerId, player.id))
                .orderBy(desc(playerStats.joinTime))
                .limit(1);

            if (playerStatsRecord.length > 0) {
                const session = playerStatsRecord[0];
        // Support legacy ms-based rows: if joinTime looks like ms, convert on the fly
        const joinTimeSec = session.joinTime > 2000000000 ? Math.floor(session.joinTime / 1000) : session.joinTime;
        const sessionDuration = nowSec - joinTimeSec;

                await this.db.database
                    .update(playerStats)
                    .set({
            leaveTime: nowSec,
                        sessionDuration,
            lastUpdated: nowSec,
                    })
                    .where(eq(playerStats.id, session.id));
            }

            await this.db.database.insert(serverEvents).values({
                eventType: 'player_leave',
                playerId: player.id,
                roomId: player.roomId,
        timestamp: nowSec,
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
                    lastUpdated: Math.floor(Date.now() / 1000),
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
                timestamp: Math.floor(Date.now() / 1000),
                isAdminMessage
            });
        } catch (error) {
            console.error('[Database] Error logging chat message:', error);
        }
    }

    async logServerStats() {
        try {
            const memoryUsage = Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
            const totalPlayers = mainServer.getTotalPlayerCount();
            const totalRooms = mainServer.rooms.size;
            const uptime = Math.floor(process.uptime());
            const nowSec = Math.floor(Date.now() / 1000);

            await this.db.database.insert(serverStats).values({
                timestamp: nowSec,
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
                timestamp: Math.floor(Date.now() / 1000),
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
            const since = Math.floor(Date.now() / 1000) - (hours * 60 * 60);
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
