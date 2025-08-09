import { config, DotenvConfigOutput } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '../../');

/**
 * Load environment variables for the database package.
 *
 * Priority order:
 * 1. Existing process.env values (injected by Docker / host environment)
 * 2. Values from .env.production or .env.development if the file exists
 * 3. Safe defaults (for DATABASE_PATH only)
 *
 * Previous implementation enforced presence of an env file which blocks
 * containerized deployments where we rely on docker-compose provided env.
 */
export const loadEnv = (): EnvVariables => {
    const envFileToUse = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
    const candidatePath = path.resolve(baseDir, envFileToUse);

    let parsed: Record<string, string> | undefined;
    if (fs.existsSync(candidatePath)) {
        const loadedEnv: DotenvConfigOutput = config({ path: candidatePath });
        if (!loadedEnv.error) {
            parsed = loadedEnv.parsed as Record<string, string> | undefined;
        }
    }

    // Merge order: parsed file values -> existing process.env (process.env wins)
    const merged: Record<string, string> = {
        ...(parsed || {}),
        // Copy only known vars from process.env to avoid pulling in everything implicitly
        ...(process.env.DATABASE_PATH ? { DATABASE_PATH: process.env.DATABASE_PATH } : {}),
        ...(process.env.DESTRUCTIVE_CREATE_AND_OVERWRITE_DATABASE_ON_STARTUP ? { DESTRUCTIVE_CREATE_AND_OVERWRITE_DATABASE_ON_STARTUP: process.env.DESTRUCTIVE_CREATE_AND_OVERWRITE_DATABASE_ON_STARTUP } : {}),
    };

    // Provide a default path if none supplied (suitable for Docker volume mount)
    if (!merged.DATABASE_PATH) {
        merged.DATABASE_PATH = '/app/shared/magic.db';
        // Also reflect back into process.env so downstream code using process.env.* stays consistent
        process.env.DATABASE_PATH = merged.DATABASE_PATH;
    }

    const result: EnvVariables = {
        DATABASE_PATH: merged.DATABASE_PATH,
        DESTRUCTIVE_CREATE_AND_OVERWRITE_DATABASE_ON_STARTUP: merged.DESTRUCTIVE_CREATE_AND_OVERWRITE_DATABASE_ON_STARTUP
    };
    return result;
};

export interface EnvVariables {
    DATABASE_PATH: string;
    DESTRUCTIVE_CREATE_AND_OVERWRITE_DATABASE_ON_STARTUP?: string;
}