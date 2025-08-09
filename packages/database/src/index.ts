import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './utils/getEnv';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { users } from './models/SavedUsers';
import { playerStats, serverStats, chatMessages, serverEvents, adminActions, bannedPlayers } from './models/PlayerStats';
import { createHash } from 'node:crypto';
import os from 'os';
export * from './models/SavedUsers';
export * from './models/PlayerStats';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const env = loadEnv();

export class ProtoDBClass {
    private db: BetterSQLite3Database | undefined;
    public get database(): BetterSQLite3Database {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.db;
    }

    public async init() {
        if (!fs.existsSync(env.DATABASE_PATH)) {
            console.error(`Database file not found at ${env.DATABASE_PATH}`);
            // We have to create the db and run the migrations.
            this.db = await this.createNewDatabase();
        } else {
            console.log(`Database file found at ${env.DATABASE_PATH}`);
            if (env.DESTRUCTIVE_CREATE_AND_OVERWRITE_DATABASE_ON_STARTUP !== 'true') {
                this.db = await this.loadExistingDatabase();
            } else {
                console.warn('DESTRUCTIVE_CREATE_AND_OVERWRITE_DATABASE_ON_STARTUP is enabled. Existing database will be overwritten.');
                // Delete the existing database file
                fs.unlinkSync(env.DATABASE_PATH);
                this.db = await this.createNewDatabase();
            }
        }
    }

    private async createNewDatabase() {
        if (!fs.existsSync(path.dirname(env.DATABASE_PATH))) {
            fs.mkdirSync(path.dirname(env.DATABASE_PATH), { recursive: true });
        }
        const sqlite = new Database(process.env.DATABASE_PATH);
        sqlite.pragma('journal_mode = WAL');
        sqlite.pragma('foreign_keys = ON');

        const db = drizzle({ client: sqlite });
        // Determine migrations folder with multiple fallbacks
        const candidates = [
            path.join(path.dirname(env.DATABASE_PATH), 'drizzle'),                            // volume side-by-side
            path.resolve(process.cwd(), 'shared/drizzle'),                                    // repo shared folder
            path.resolve('/app/shared/drizzle'),                                              // container seeded location
            path.resolve(__dirname, '../../drizzle')                                          // legacy packaged path
        ];
        const migrationsFolder = candidates.find(p => fs.existsSync(p)) || path.join(path.dirname(env.DATABASE_PATH), 'drizzle');
        await migrate(db, { migrationsFolder });

        console.log('Database created and migrations applied successfully.');
        console.log("Adding admin user...");
        await db.insert(users).values({
            id: 0,
            username: "admin",
            hashedPassword: createHash('sha256').update(`paws-admin`).digest('hex')
        })
        return db;
    }

    private async loadExistingDatabase() {
        const sqlite = new Database(process.env.DATABASE_PATH);
        sqlite.pragma('journal_mode = WAL');
        sqlite.pragma('foreign_keys = ON');

        const db = drizzle({ client: sqlite });
        // Always attempt to apply new migrations on existing database so schema stays current
        try {
            const candidates = [
                path.join(path.dirname(env.DATABASE_PATH), 'drizzle'),
                path.resolve(process.cwd(), 'shared/drizzle'),
                path.resolve('/app/shared/drizzle'),
                path.resolve(__dirname, '../../drizzle')
            ];
            const migrationsFolder = candidates.find(p => fs.existsSync(p)) || path.join(path.dirname(env.DATABASE_PATH), 'drizzle');
            if (fs.existsSync(migrationsFolder)) {
                migrate(db, { migrationsFolder });
            } else {
                console.warn('[database] No migrations folder found for existing database; skipping migrate step.');
            }
        } catch (err) {
            console.error('[database] Error running migrations on existing database:', err);
            throw err;
        }
        console.log('Existing database loaded successfully.');
        return db;
    }
}

async function testDatabase() {
    const protoDB = new ProtoDBClass();
    await protoDB.init();

    console.log("Getting users for testing...");
    const usersList = await protoDB.database.select().from(users);
    console.log("Users:", usersList);
}