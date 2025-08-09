import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import path from 'path';

config();

// For Postgres migrations we just use a dedicated folder in repo
const outDir = process.env.DRIZZLE_OUT || '../../shared/drizzle/pg';

if (!process.env.DATABASE_URL) {
    console.warn('[drizzle-config] DATABASE_URL not set at config load time; drizzle-kit commands must provide it.');
}

export default defineConfig({
    schema: './src/models',
    out: outDir,
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/protoshock'
    }
});
