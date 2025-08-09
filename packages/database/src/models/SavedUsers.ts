import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const users = pgTable('saved_users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  hashedPassword: text('hashed_password').notNull(),
});