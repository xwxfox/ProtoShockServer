import { ActionHandler, ActionResult, RPCAction } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";
import { createSyncTransform } from "@socket/utils/RPCFactory";

/**
 * Transform Smoothing
 * Smooth out jerky movements by interpolating positions
 */
let lastPositions = new Map<string, { x: number, y: number, z: number, time: number }>();

export const transformSmoothingHandler: ActionHandler = (socket, action, context) => {
    if (action.action === 'rpc') {
        const rpcAction = action as RPCAction;
        const parsedRPC = actionMiddleware.parseRPC(rpcAction.rpc);

        if (parsedRPC && parsedRPC.type === 'SyncTransform') {
            const transform = parsedRPC as any;
            const key = `${rpcAction.sender}_${transform.id}`;
            const now = Date.now();

            const lastPos = lastPositions.get(key);
            if (lastPos) {
                const timeDiff = now - lastPos.time;
                const distance = Math.sqrt(
                    Math.pow(transform.posx - lastPos.x, 2) +
                    Math.pow(transform.posy - lastPos.y, 2) +
                    Math.pow(transform.posz - lastPos.z, 2)
                );

                // If movement is too fast (teleporting), limit it
                const maxSpeed = 50; // units per second
                const maxDistance = (maxSpeed * timeDiff) / 1000;

                if (distance > maxDistance && timeDiff < 1000) {
                    // Interpolate position
                    const ratio = maxDistance / distance;
                    const smoothedTransform = createSyncTransform(
                        transform.id,
                        lastPos.x + (transform.posx - lastPos.x) * ratio,
                        lastPos.y + (transform.posy - lastPos.y) * ratio,
                        lastPos.z + (transform.posz - lastPos.z) * ratio,
                        transform.rotx,
                        transform.roty,
                        transform.rotz,
                        transform.scalex,
                        transform.scaley,
                        transform.scalez,
                        rpcAction.sender
                    );

                    lastPositions.set(key, {
                        x: smoothedTransform.posx,
                        y: smoothedTransform.posy,
                        z: smoothedTransform.posz,
                        time: now
                    });

                    return {
                        result: ActionResult.MODIFY,
                        modifiedAction: smoothedTransform,
                        reason: 'Smoothed excessive movement'
                    };
                }
            }

            lastPositions.set(key, {
                x: transform.posx,
                y: transform.posy,
                z: transform.posz,
                time: now
            });
        }
    }

    return { result: ActionResult.PASS_THROUGH };
};