import { defineConfig } from "drizzle-kit";
import path from 'path';
import { config } from "dotenv";

config({ path: ".env.production" });

// Allow overriding output directory explicitly (useful in container builds)
// Priority: DRIZZLE_OUT > derived from DATABASE_PATH > default 'shared/drizzle'
const derivedOut = process.env.DATABASE_PATH
    ? path.join(path.dirname(process.env.DATABASE_PATH), 'drizzle')
    : 'shared/drizzle';
const outDir = process.env.DRIZZLE_OUT || derivedOut;

export default defineConfig({
    schema: "./src/models",
    out: outDir,
    dialect: "sqlite"
});
