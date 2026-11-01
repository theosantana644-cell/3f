import { createInsertSchema } from "drizzle-zod";
import { integer, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const storeSettingsTable = pgTable("store_settings", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  logoUrl: text("logo_url"),
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertStoreSettingsSchema = createInsertSchema(storeSettingsTable).omit({ id: true });
export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;
export type StoreSettings = typeof storeSettingsTable.$inferSelect;
