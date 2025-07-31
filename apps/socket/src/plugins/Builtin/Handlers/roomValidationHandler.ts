import { ActionHandler, CreateRoomAction, ActionResult } from "@socket/types";
import { actionMiddleware } from "@socket/handlers/ActionMiddleware";

// Room validation handler - validates room creation
export const roomValidationHandler: ActionHandler = (socket, action, context) => {
    if (actionMiddleware.isActionType<CreateRoomAction>(action, 'createRoom')) {
        // Validate room name
        if (!action.roomName || action.roomName.trim().length < 3) {
            return {
                result: ActionResult.BLOCK,
                reason: 'Room name must be at least 3 characters'
            };
        }

        // Validate max players
        if (action.maxplayers < 1 || action.maxplayers > 64) {
            return {
                result: ActionResult.BLOCK,
                reason: 'Max players must be between 1 and 64'
            };
        }

        // Auto-sanitize room name
        const sanitizedName = action.roomName.trim().replace(/[<>]/g, '');
        if (sanitizedName !== action.roomName) {
            return {
                result: ActionResult.MODIFY,
                modifiedAction: {
                    ...action,
                    roomName: sanitizedName
                },
                reason: 'Sanitized room name'
            };
        }
    }

    return { result: ActionResult.PASS_THROUGH };
};
