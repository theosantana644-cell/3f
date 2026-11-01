import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const adminCredentialsTable = pgTable("admin_credentials", {
  id: integer("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
});
