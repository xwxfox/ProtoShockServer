import { Server, Socket } from "socket.io";
import { handleAction } from "@socket/handlers/ActionHandler";
import { sendCompressedMessage } from "@socket/utils/CompressedServerIO";
import { runAction } from "@socket/utils/MainServerActionHandler";
import * as zlib from 'zlib';
import { clientStates } from "@socket/global";
import { createChatMessage } from "@socket/utils/RPCFactory";

// Pre-compute CRC32 table for fast validation (prevents most corrupted buffers)
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
        crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    CRC32_TABLE[i] = crc;
}

function fastCRC32(buffer: Buffer, start = 0, end = buffer.length): number {
    let crc = 0xFFFFFFFF;
    for (let i = start; i < end; i++) {
        crc = CRC32_TABLE[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Fast buffer validation that catches corruption before calling zlib
function validateBuffer(buffer: Buffer): { isValid: boolean; type: 'gzip' | 'deflate' | 'raw'; reason?: string } {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 2) {
        return { isValid: false, type: 'raw', reason: 'Invalid buffer' };
    }

    // Quick corruption checks
    const first4 = buffer.readUInt32BE(0);

    // Check for obvious corruption patterns
    if (first4 === 0x00000000 || first4 === 0xFFFFFFFF) {
        return { isValid: false, type: 'raw', reason: 'Corruption pattern detected' };
    }

    // GZIP validation
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
        if (buffer.length < 18) { // Minimum: 10 byte header + some data + 8 byte trailer
            return { isValid: false, type: 'raw', reason: 'Gzip too small' };
        }

        const method = buffer[2];
        const flags = buffer[3];

        if (method !== 8) {
            return { isValid: false, type: 'raw', reason: 'Invalid gzip method' };
        }

        if (flags > 31) {
            return { isValid: false, type: 'raw', reason: 'Invalid gzip flags' };
        }

        // Quick trailer validation - check if CRC32 and ISIZE look reasonable
        const crc32Pos = buffer.length - 8;
        const isizePos = buffer.length - 4;

        const crc32 = buffer.readUInt32LE(crc32Pos);
        const isize = buffer.readUInt32LE(isizePos);

        // Basic sanity checks - these values shouldn't be extreme
        if (isize > 100 * 1024 * 1024) { // More than 100MB uncompressed is suspicious
            return { isValid: false, type: 'raw', reason: 'Suspicious uncompressed size' };
        }

        return { isValid: true, type: 'gzip' };
    }

    // DEFLATE/ZLIB validation
    if (buffer[0] === 0x78) {
        const flg = buffer[1];

        // Check header checksum (must be divisible by 31)
        const header = (buffer[0] << 8) | buffer[1];
        if (header % 31 !== 0) {
            return { isValid: false, type: 'raw', reason: 'Invalid zlib checksum' };
        }

        // Validate compression method and window size
        const cm = buffer[0] & 0x0F;
        const cinfo = (buffer[0] & 0xF0) >> 4;

        if (cm !== 8 || cinfo > 7) {
            return { isValid: false, type: 'raw', reason: 'Invalid zlib parameters' };
        }

        return { isValid: true, type: 'deflate' };
    }

    return { isValid: false, type: 'raw', reason: 'Not compressed data' };
}

// High-performance synchronous decompression with safety guards
function safeSyncDecompress(buffer: Buffer): string | null {
    const validation = validateBuffer(buffer);

    if (!validation.isValid) {
        // Treat as raw text
        try {
            return buffer.toString('utf8');
        } catch (err) {
            console.error('[Decompress] Raw text conversion failed:', err);
            return null;
        }
    }

    try {
        let result: Buffer;

        if (validation.type === 'gzip') {
            // Use synchronous gunzip with strict limits
            result = zlib.gunzipSync(buffer, {
                maxOutputLength: 50 * 1024 * 1024, // 50MB max
                chunkSize: 64 * 1024
            });
        } else if (validation.type === 'deflate') {
            // Use synchronous inflate with strict limits
            result = zlib.inflateSync(buffer, {
                maxOutputLength: 50 * 1024 * 1024, // 50MB max
                chunkSize: 64 * 1024
            });
        } else {
            return buffer.toString('utf8');
        }

        return result.toString('utf8');

    } catch (err: any) {
        console.error('[Decompress] Sync decompression failed:', err.message);

        // Fallback to raw text
        try {
            return buffer.toString('utf8');
        } catch (fallbackErr) {
            console.error('[Decompress] Fallback failed:', fallbackErr);
            return null;
        }
    }
}

// Detect and handle zombie connections efficiently
function isZombieConnection(socket: Socket): boolean {
    const clientState = clientStates.get(socket.id);
    if (!clientState) return false;

    const now = Date.now();
    const timeSinceConnect = now - clientState.connectedAt;

    // If client connected very recently but is sending messages immediately,
    // it might be a zombie from a previous session
    if (timeSinceConnect < 500 && clientState.messageCount > 5) {
        return true;
    }

    // If client has too many consecutive errors, it's probably corrupted
    if (clientState.consecutiveErrors > 3) {
        return true;
    }

    return false;
}

export default (io: Server, socket: Socket) => {
    socket.on("message", async (compressedMessage) => {
        const clientState = clientStates.get(socket.id);
        if (!clientState) {
            console.error('[Message Error] No client state for', socket.id);
            return;
        }

        const startTime = process.hrtime.bigint();

        try {
            // Update client state
            clientState.messageCount++;
            clientState.lastMessageAt = Date.now();

            // Check for zombie connection (fast check)
            if (isZombieConnection(socket)) {
                console.log('[Zombie] Detected zombie connection, forcing disconnect:', socket.id);
                const errormessage = createChatMessage("[Error] Socket not connected. Please reconnect.", 'system', "Socket Error");
                // Send error message to the client
                sendCompressedMessage(socket, errormessage);

                // ask client nicely to fuck off
                socket.disconnect(true);
                socket.client._disconnect(); // Ensure client state is cleaned up
                clientStates.delete(socket.id);
                return;
            }

            // Fast input validation
            if (!compressedMessage || !Buffer.isBuffer(compressedMessage) || compressedMessage.length === 0) {
                console.error('[Message Error] Invalid message from', socket.id);
                clientState.consecutiveErrors++;
                return;
            }

            // Size check (very fast)
            if (compressedMessage.length > 10 * 1024 * 1024) { // 10MB limit
                console.error('[Message Error] Message too large:', compressedMessage.length, 'from', socket.id);
                clientState.consecutiveErrors++;
                socket.disconnect(true);
                return;
            }

            // Fast decompression
            const decompressedMessage = safeSyncDecompress(compressedMessage);

            if (!decompressedMessage) {
                console.error('[Message Error] Failed to decompress message from', socket.id);
                clientState.consecutiveErrors++;
                return;
            }

            // Process the message
            await processMessage(decompressedMessage, socket);

            // Reset error count on success
            clientState.consecutiveErrors = 0;
            clientState.isHealthy = true;

            // Performance logging (only log slow operations)
            const endTime = process.hrtime.bigint();
            const durationMs = Number(endTime - startTime) / 1000000;
            if (durationMs > 10) { // Only log if it took more than 10ms
                console.log(`[Performance] Message processing took ${durationMs.toFixed(2)}ms for ${socket.id}`);
            }

        } catch (overallErr: any) {
            console.error('[Critical Error] Unexpected error processing message from', socket.id, ':', overallErr.message);

            if (clientState) {
                clientState.consecutiveErrors++;
                clientState.isHealthy = false;

                // Disconnect clients with too many errors
                if (clientState.consecutiveErrors > 5) {
                    console.log('[Error Threshold] Disconnecting problematic client:', socket.id);
                    socket.disconnect(true);
                    clientStates.delete(socket.id);
                }
            }
        }
    });
};

async function processMessage(decompressedMessage: string, socket: Socket) {
    try {
        // Fast input validation
        if (!decompressedMessage || typeof decompressedMessage !== 'string') {
            return;
        }

        // Efficient message splitting and filtering
        const messageList = decompressedMessage.split('\n');
        const filteredMessageList: string[] = [];

        // Pre-filter messages efficiently
        for (let i = 0; i < messageList.length; i++) {
            const msg = messageList[i];
            if (msg && msg.trim() !== '') {
                filteredMessageList.push(msg);
            }
        }

        if (filteredMessageList.length === 0) {
            return;
        }

        // Process messages efficiently
        for (let i = 0; i < filteredMessageList.length; i++) {
            const element = filteredMessageList[i];

            try {
                const data = JSON.parse(element);

                if (!data || typeof data !== 'object') {
                    continue;
                }

                const result = await handleAction(socket, data);

                // Handle the main processed action
                if (result?.processedAction) {
                    runAction(socket, result.processedAction);
                }

                // Handle additional actions efficiently
                if (result?.additionalActions && result?.additionalActions?.length > 0) {
                    const delay = result.delay;

                    if (delay && delay > 0) {
                        // Batch delayed actions to reduce timer overhead
                        setTimeout(() => {
                            for (const action of result.additionalActions ?? []) {
                                try {
                                    runAction(socket, action);
                                } catch (err: any) {
                                    console.error('[Delayed Action Error]:', err.message);
                                }
                            }
                        }, delay);
                    } else {
                        // Execute immediately
                        for (const action of result.additionalActions) {
                            try {
                                runAction(socket, action);
                            } catch (err: any) {
                                console.error('[Action Error]:', err.message);
                            }
                        }
                    }
                }
            } catch (parseErr: any) {
                console.error(`[Parse Error] Error at index ${i}:`, parseErr.message);
            }
        }
    } catch (processErr: any) {
        console.error("[Process Error]:", processErr.message);
    }
}