import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  CreateOrderBody,
  CreateOrderResponse,
  CreateProductBody,
  CreateProductResponse,
  DeleteProductParams,
  GetAdminStatusResponse,
  GetStoreResponse,
  ListAdminOrdersResponse,
  ListAdminProductsResponse,
  LoginAdminBody,
  LoginAdminResponse,
  LogoutAdminResponse,
  SetupAdminBody,
  SetupAdminResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
  UpdateStoreBody,
  UpdateStoreResponse,
} from "@workspace/api-zod";
import {
  adminCredentialsTable,
  db,
  ordersTable,
  productsTable,
  storeSettingsTable,
  type OrderLine,
  type Product,
  type ProductExtra,
} from "@workspace/db";

const router: IRouter = Router();
const SESSION_COOKIE = "delivery_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be configured for admin sessions.");
  return secret;
}

function money(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function toProduct(row: Product) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: money(row.price),
    imageUrl: row.imageUrl,
    category: row.category,
    active: row.active,
    unitCount: row.unitCount,
    flavors: row.flavors,
    extras: row.extras,
  };
}

function toSettings(row: typeof storeSettingsTable.$inferSelect) {
  return {
    name: row.name,
    tagline: row.tagline,
    logoUrl: row.logoUrl,
    whatsappNumber: row.whatsappNumber,
    deliveryFee: money(row.deliveryFee),
  };
}

function toOrder(row: typeof ordersTable.$inferSelect) {
  return {
    id: row.id,
    customerName: row.customerName,
    phone: row.phone,
    fulfillment: row.fulfillment,
    address: row.address,
    reference: row.reference,
    notes: row.notes,
    paymentMethod: row.paymentMethod,
    deliveryFee: money(row.deliveryFee),
    items: row.items,
    subtotal: money(row.subtotal),
    total: money(row.total),
    createdAt: row.createdAt.toISOString(),
  };
}

function cookieValue(req: Request): string | undefined {
  const cookies = req.headers.cookie?.split(";") ?? [];
  const cookie = cookies.find((part) => part.trim().startsWith(`${SESSION_COOKIE}=`));
  return cookie?.trim().slice(SESSION_COOKIE.length + 1);
}

function validSession(req: Request): boolean {
  const token = cookieValue(req);
  if (!token) return false;
  const [rawExpiry, signature, extra] = token.split(".");
  if (extra !== undefined || !rawExpiry || !signature) return false;
  const expiry = Number(rawExpiry);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  const expected = createHmac("sha256", sessionSecret()).update(`admin:${rawExpiry}`).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function setAdminCookie(req: Request, res: Response): void {
  const expiry = String(Date.now() + SESSION_SECONDS * 1000);
  const signature = createHmac("sha256", sessionSecret()).update(`admin:${expiry}`).digest("base64url");
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = req.secure || forwardedProto === "https" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${expiry}.${signature}; Path=/api; Max-Age=${SESSION_SECONDS}; HttpOnly; SameSite=Lax${secure}`,
  );
}

function clearAdminCookie(req: Request, res: Response): void {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = req.secure || forwardedProto === "https" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/api; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
  );
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!validSession(req)) {
    res.status(401).json({ error: "Entre no painel para continuar." });
    return;
  }
  next();
}

function checkLoginLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    next();
    return;
  }
  if (current.count >= 8) {
    res.status(429).json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." });
    return;
  }
  current.count += 1;
  next();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, encodedHash: string): boolean {
  const [salt, hash] = encodedHash.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function parseProductInput(body: unknown) {
  return CreateProductBody.safeParse(body);
}

function productInvariantError(product: {
  category: string;
  unitCount: number | null;
  flavors: string[];
  extras: ProductExtra[];
}): string | null {
  const expectedUnits = product.category === "MINI_PASTEIS_6"
    ? 6
    : product.category === "MINI_PASTEIS_12"
      ? 12
      : null;
  if (expectedUnits !== null && product.unitCount !== expectedUnits) {
    return `Este combo precisa ter ${expectedUnits} unidades.`;
  }
  if (expectedUnits !== null && product.flavors.length === 0) {
    return "Adicione ao menos um sabor para permitir a escolha do cliente.";
  }
  if (new Set(product.flavors).size !== product.flavors.length) {
    return "Remova os sabores duplicados.";
  }
  if (new Set(product.extras.map((extra) => extra.name)).size !== product.extras.length) {
    return "Remova os adicionais duplicados.";
  }
  return null;
}

router.get("/store", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(storeSettingsTable).where(eq(storeSettingsTable.id, 1)).limit(1);
  if (!settings) {
    res.status(503).json({ error: "A loja ainda não foi inicializada." });
    return;
  }
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.active, true))
    .orderBy(productsTable.id);
  res.json(GetStoreResponse.parse({ settings: toSettings(settings), products: products.map(toProduct) }));
});

router.get("/admin/status", async (req, res): Promise<void> => {
  const [credential] = await db.select({ id: adminCredentialsTable.id }).from(adminCredentialsTable).limit(1);
  res.json(GetAdminStatusResponse.parse({
    setupRequired: !credential,
    authenticated: validSession(req),
  }));
});

router.post("/admin/setup", checkLoginLimit, async (req, res): Promise<void> => {
  const input = SetupAdminBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const [existing] = await db.select({ id: adminCredentialsTable.id }).from(adminCredentialsTable).limit(1);
  if (existing) {
    res.status(409).json({ error: "A senha administrativa já foi configurada." });
    return;
  }
  const [created] = await db
    .insert(adminCredentialsTable)
    .values({ id: 1, passwordHash: hashPassword(input.data.password) })
    .onConflictDoNothing()
    .returning({ id: adminCredentialsTable.id });
  if (!created) {
    res.status(409).json({ error: "Não foi possível configurar a senha. Tente novamente." });
    return;
  }
  setAdminCookie(req, res);
  res.json(SetupAdminResponse.parse({ setupRequired: false, authenticated: true }));
});

router.post("/admin/login", checkLoginLimit, async (req, res): Promise<void> => {
  const input = LoginAdminBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const [credential] = await db.select().from(adminCredentialsTable).limit(1);
  if (!credential || !verifyPassword(input.data.password, credential.passwordHash)) {
    res.status(401).json({ error: "Senha incorreta." });
    return;
  }
  loginAttempts.delete(req.ip ?? "unknown");
  setAdminCookie(req, res);
  res.json(LoginAdminResponse.parse({ setupRequired: false, authenticated: true }));
});

router.post("/admin/logout", (_req, res): void => {
  clearAdminCookie(_req, res);
  res.json(LogoutAdminResponse.parse({ ok: true }));
});

router.patch("/admin/store", requireAdmin, async (req, res): Promise<void> => {
  const input = UpdateStoreBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const [updated] = await db
    .update(storeSettingsTable)
    .set({
      ...input.data,
      deliveryFee: input.data.deliveryFee.toFixed(2),
    })
    .where(eq(storeSettingsTable.id, 1))
    .returning();
  if (!updated) {
    res.status(503).json({ error: "Configurações da loja indisponíveis." });
    return;
  }
  res.json(UpdateStoreResponse.parse(toSettings(updated)));
});

router.get("/admin/products", requireAdmin, async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(productsTable.id);
  res.json(ListAdminProductsResponse.parse(products.map(toProduct)));
});

router.post("/admin/products", requireAdmin, async (req, res): Promise<void> => {
  const input = parseProductInput(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const invariantError = productInvariantError(input.data);
  if (invariantError) {
    res.status(400).json({ error: invariantError });
    return;
  }
  const [created] = await db
    .insert(productsTable)
    .values({ ...input.data, price: input.data.price.toFixed(2) })
    .returning();
  res.status(201).json(CreateProductResponse.parse(toProduct(created)));
});

router.put("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  const input = UpdateProductBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const invariantError = productInvariantError(input.data);
  if (invariantError) {
    res.status(400).json({ error: invariantError });
    return;
  }
  const [updated] = await db
    .update(productsTable)
    .set({ ...input.data, price: input.data.price.toFixed(2) })
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Produto não encontrado." });
    return;
  }
  res.json(UpdateProductResponse.parse(toProduct(updated)));
});

router.delete("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning({ id: productsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Produto não encontrado." });
    return;
  }
  res.status(204).end();
});

router.post("/orders", async (req, res): Promise<void> => {
  const input = CreateOrderBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  if (!input.data.customerName.trim() || input.data.phone.replace(/\D/g, "").length < 8) {
    res.status(400).json({ error: "Informe nome e telefone válidos." });
    return;
  }
  if (input.data.fulfillment === "DELIVERY" && input.data.address.trim().length < 5) {
    res.status(400).json({ error: "Informe o endereço completo para entrega." });
    return;
  }
  if (input.data.items.some((line) => line.quantity > 99)) {
    res.status(400).json({ error: "A quantidade máxima por item é 99." });
    return;
  }
  const [settings] = await db.select().from(storeSettingsTable).where(eq(storeSettingsTable.id, 1)).limit(1);
  if (!settings) {
    res.status(503).json({ error: "A loja ainda não foi inicializada." });
    return;
  }
  const ids = [...new Set(input.data.items.map((item) => item.productId))];
  const products = await db
    .select()
    .from(productsTable)
    .where(and(inArray(productsTable.id, ids), eq(productsTable.active, true)));
  const byId = new Map(products.map((product) => [product.id, product]));
  if (byId.size !== ids.length) {
    res.status(400).json({ error: "Um ou mais produtos não estão mais disponíveis." });
    return;
  }

  const lines: OrderLine[] = [];
  for (const line of input.data.items) {
    const product = byId.get(line.productId)!;
    const validFlavors = line.flavors.every((selection) => product.flavors.includes(selection.name));
    const flavorCount = line.flavors.reduce((sum, selection) => sum + selection.quantity, 0);
    const isCombo = product.category === "MINI_PASTEIS_6" || product.category === "MINI_PASTEIS_12";
    if (!validFlavors || (isCombo && (product.unitCount == null || flavorCount !== product.unitCount * line.quantity)) || (!isCombo && line.flavors.length > 0)) {
      res.status(400).json({ error: `Confira os sabores selecionados para ${product.name}.` });
      return;
    }
    const chosenExtras: ProductExtra[] = [];
    for (const name of line.extras) {
      const extra = product.extras.find((candidate) => candidate.name === name);
      if (!extra || chosenExtras.some((candidate) => candidate.name === name)) {
        res.status(400).json({ error: `Adicional inválido para ${product.name}.` });
        return;
      }
      chosenExtras.push(extra);
    }
    const unitPrice = money(product.price) + chosenExtras.reduce((sum, extra) => sum + extra.price, 0);
    const subtotal = Math.round(unitPrice * line.quantity * 100) / 100;
    lines.push({
      productId: product.id,
      name: product.name,
      unitPrice: Math.round(unitPrice * 100) / 100,
      quantity: line.quantity,
      subtotal,
      flavors: line.flavors,
      extras: chosenExtras,
      notes: line.notes,
    });
  }

  const subtotal = Math.round(lines.reduce((sum, line) => sum + line.subtotal, 0) * 100) / 100;
  const deliveryFee = input.data.fulfillment === "DELIVERY" ? money(settings.deliveryFee) : 0;
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;
  const [created] = await db
    .insert(ordersTable)
    .values({
      ...input.data,
      customerName: input.data.customerName.trim(),
      phone: input.data.phone.trim(),
      address: input.data.fulfillment === "DELIVERY" ? input.data.address.trim() : "",
      reference: input.data.fulfillment === "DELIVERY" ? input.data.reference.trim() : "",
      notes: input.data.notes.trim(),
      items: lines,
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      total: total.toFixed(2),
    })
    .returning();
  res.status(201).json(CreateOrderResponse.parse(toOrder(created)));
});

router.get("/admin/orders", requireAdmin, async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(100);
  res.json(ListAdminOrdersResponse.parse(orders.map(toOrder)));
});

export default router;
