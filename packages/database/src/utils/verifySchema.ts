import { ProtoDBClass } from '../index';

export async function verifySchema() {
    const proto = new ProtoDBClass();
    await proto.init();

    // Expected table names in Postgres (lowercase as defined in pg-core schemas)
    const required = [
        'saved_users',
        'player_stats',
        'server_stats',
        'chat_messages',
        'server_events',
        'admin_actions',
        'banned_players'
    ];

    const result = await (proto as any).database.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    );
    const existing = new Set(result.rows ? result.rows.map((r: any) => r.table_name) : []);
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
