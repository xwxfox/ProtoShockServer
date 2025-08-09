import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { users } from './models/SavedUsers';
import { playerStats, serverStats, chatMessages, serverEvents, adminActions, bannedPlayers } from './models/PlayerStats';
import { createHash } from 'node:crypto';

export * from './models/SavedUsers';
export * from './models/PlayerStats';

const DEFAULT_DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@db:5432/protoshock';

export class ProtoDBClass {
    private pool: any;
    private db: ReturnType<typeof drizzle> | undefined;
    public get database() {
        if (!this.db) throw new Error('Database not initialized. Call init() first.');
        return this.db;
    }

    public async init() {
        this.pool = new Pool({ connectionString: DEFAULT_DB_URL });
        this.db = drizzle(this.pool);
        const isOwner = (process.env.MIGRATION_OWNER || 'true').toLowerCase() === 'true';
        if (isOwner) {
            const migrationsFolder = this.resolveMigrationsFolder();
            await migrate(this.db, { migrationsFolder });
        } else {
            // Best-effort: only run migrations on owner container; if folder missing just log
            try {
                const migrationsFolder = this.resolveMigrationsFolder();
                // If folder exists we still run them (harmless no-op) to keep schema in sync
                await migrate(this.db, { migrationsFolder });
            } catch (e) {
                console.warn('[database] Skipping migrations (not owner and folder not found).');
            }
        }
        try {
            await this.ensureAdminUser();
        } catch (e) {
            console.warn('[database] ensureAdminUser skipped (possibly before migrations):', (e as Error).message);
        }
    }

    private resolveMigrationsFolder() {
        const moduleDir = path.dirname(fileURLToPath(import.meta.url));
        const candidates = [
            path.resolve(process.cwd(), 'drizzle/pg'),
            path.resolve('drizzle/pg'),
            path.resolve(moduleDir, '../../drizzle/pg'),
            // Support shared location used by Docker images (/app/shared/drizzle/pg)
            path.resolve(process.cwd(), 'shared/drizzle/pg'),
            path.resolve('shared/drizzle/pg'),
            path.resolve(moduleDir, '../../shared/drizzle/pg')
        ];
        const found = candidates.find(p => fs.existsSync(p));
        if (!found) throw new Error('[database] migrations folder not found (expected drizzle/pg). Run migrations generation.');
        return found;
    }

    private async ensureAdminUser() {
        const existing = await this.db!.select().from(users).limit(1);
        if (!existing.length) {
            await this.db!.insert(users).values({
                username: 'admin',
                hashedPassword: createHash('sha256').update('paws-admin').digest('hex')
            });
        }
    }
}

// Optional local test helper (not auto-run)
async function testDatabase() {
    const protoDB = new ProtoDBClass();
    await protoDB.init();
    const usersList = await protoDB.database.select().from(users);
    console.log('Users:', usersList);
}