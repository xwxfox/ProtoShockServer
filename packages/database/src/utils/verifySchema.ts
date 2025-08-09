import fs from 'fs';
import path from 'path';
import { loadEnv } from './getEnv';
import { ProtoDBClass } from '../index';

export async function verifySchema() {
    const env = loadEnv();
    const dbPath = env.DATABASE_PATH;
    console.log(`[verify-schema] Using database path: ${dbPath}`);
    const proto = new ProtoDBClass();
    await proto.init();

    // Check required tables exist
    const required = [
        'SAVED_USERS',
        'PLAYER_STATS',
        'SERVER_STATS',
        'CHAT_MESSAGES',
        'SERVER_EVENTS',
        'ADMIN_ACTIONS',
        'BANNED_PLAYERS'
    ];

    // better-sqlite3 pragma table_list
    const rows = (proto as any).database.all?.("SELECT name FROM sqlite_master WHERE type='table'") || [];
    const existing = new Set(rows.map((r: any) => r.name));
    const missing = required.filter(t => !existing.has(t));
    if (missing.length) {
        console.error(`[verify-schema] Missing tables: ${missing.join(', ')}`);
        process.exitCode = 1;
    } else {
        console.log('[verify-schema] All required tables present.');
    }
}

// Allow direct execution
if (process.argv[1] && process.argv[1].endsWith('verifySchema.js')) {
    verifySchema();
}
