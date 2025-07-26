import { defineConfig } from "drizzle-kit";
import path from 'path';
import { config } from "dotenv";

config({ path: ".env.production" });

export default defineConfig({
    schema: "./src/models",
    out: path.join(path.dirname(process.env.DATABASE_PATH || ""), 'drizzle'),
    dialect: "sqlite"
});
