import fs from 'fs';
import path from 'path';
import { loadEnv } from './utils/getEnv';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { users } from './models/SavedUsers';
import { createHash } from 'node:crypto';
import os from 'os';
export * from './models/SavedUsers';
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
        await migrate(db, { migrationsFolder: path.join(path.dirname(env.DATABASE_PATH), 'drizzle') });

        console.log('Database created and migrations applied successfully.');
        console.log("Adding admin user...");
        await db.insert(users).values({
            id: 0,
            username: "admin",
            hashedPassword: createHash('sha256').update(`${os.hostname()}-admin`).digest('hex')
        })
        return db;
    }

    private async loadExistingDatabase() {
        const sqlite = new Database(process.env.DATABASE_PATH);
        sqlite.pragma('journal_mode = WAL');
        sqlite.pragma('foreign_keys = ON');

        const db = drizzle({ client: sqlite });
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