import { Socket } from 'socket.io';
import { databaseHandler } from '@socket/global';
import { Action, RPC, PlayerInfoRPC, ChatMessageRPC, SetPlayerNameRPC } from '@socket/types';
import { ActionResult, ActionHandlerResponse, ActionContext } from '@socket/types';

export async function dataTrackingMiddleware(
    socket: Socket,
    action: Action,
    context: ActionContext
): Promise<ActionHandlerResponse> {

    try {
        // Track RPC messages for player stats
        if (action.action === 'rpc') {
            const rpcData: RPC = JSON.parse(action.rpc);

            // Track player info updates (health, latency, etc.)
            if (rpcData.type === 'playerinfo') {
                const playerInfo = rpcData as PlayerInfoRPC;
                if (context.player) {
                    await databaseHandler.updatePlayerStats(
                        context.player.id,
                        null,
                        {
                            health: playerInfo.health,
                            latency: playerInfo.latency,
                        }
                    );
                }
            }

            // Track chat messages
            if (rpcData.type === 'chatmessage') {
                const chatMessage = rpcData as ChatMessageRPC;
                if (context.player && context.room) {
                    await databaseHandler.logChatMessage(
                        context.player.id,
                        null, // We'll get the name from another RPC
                        context.room.id,
                        chatMessage.message
                    );
                }
            }

            // Track player name changes
            if (rpcData.type === 'setplayername') {
                const nameRPC = rpcData as SetPlayerNameRPC;
                if (context.player) {
                    await databaseHandler.updatePlayerStats(
                        context.player.id,
                        nameRPC.name,
                        {}
                    );
                }
            }
        }
    } catch (error) {
        console.error('[DataTracking] Error in data tracking middleware:', error);
    }

    // Always pass through - this is just for tracking
    return {
        result: ActionResult.PASS_THROUGH
    };
}
