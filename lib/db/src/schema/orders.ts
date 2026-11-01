import { createInsertSchema } from "drizzle-zod";
import { jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import type { ProductExtra } from "./products";

export type OrderFlavorSelection = { name: string; quantity: number };
export type OrderLine = {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  flavors: OrderFlavorSelection[];
  extras: ProductExtra[];
  notes: string;
};

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  fulfillment: text("fulfillment").notNull(),
  address: text("address").notNull().default(""),
  reference: text("reference").notNull().default(""),
  notes: text("notes").notNull().default(""),
  paymentMethod: text("payment_method").notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  items: jsonb("items").$type<OrderLine[]>().notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
