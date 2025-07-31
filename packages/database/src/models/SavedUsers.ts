import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core"

export const users = sqliteTable('SAVED_USERS', {
  id: integer().primaryKey().notNull(),
  username: text().notNull(),
  hashedPassword: text().notNull(),
});