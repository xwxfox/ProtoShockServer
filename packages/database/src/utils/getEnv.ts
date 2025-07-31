import { config, DotenvConfigOutput } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '../../');

export const loadEnv = (): EnvVariables => {
    const envFileToUse = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
    const loadedEnv: DotenvConfigOutput = config({ path: path.resolve(baseDir, envFileToUse) });
    if (loadedEnv.error) {
        throw new Error(`Failed to load environment variables from ${envFileToUse}: ${loadedEnv.error.message}`);
    }

    if (!loadedEnv.parsed) {
        throw new Error(`No environment variables found in ${envFileToUse}`);
    }
    return (loadedEnv.parsed ? loadedEnv.parsed : {}) as unknown as EnvVariables;
}

export interface EnvVariables {
    DATABASE_PATH: string;
    DESTRUCTIVE_CREATE_AND_OVERWRITE_DATABASE_ON_STARTUP?: string;
}