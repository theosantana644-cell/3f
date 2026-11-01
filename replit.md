# Lanche da Casa

Loja de delivery para crepes, mini pastéis e batatas, com pedidos enviados pelo WhatsApp e painel administrativo.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — PostgreSQL connection string; `SESSION_SECRET` — assinatura das sessões administrativas

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — contrato da API
- `lib/db/src/schema/` — tabelas de produtos, loja, pedidos e administrador
- `artifacts/api-server/src/routes/delivery.ts` — endpoints do delivery
- `artifacts/api-server/src/lib/seed-store.ts` — catálogo inicial, criado apenas na primeira inicialização
- `artifacts/lanche-delivery/src/App.tsx` — loja, carrinho, checkout e painel
- `artifacts/lanche-delivery/src/index.css` — identidade visual e responsividade
- `artifacts/lanche-delivery/public/products/` — fotos ilustrativas iniciais

## Architecture decisions

- O primeiro acesso a `/admin` cria a senha; não há credencial administrativa padrão.
- O servidor valida as seleções e recalcula os valores do pedido usando os preços atuais do catálogo.
- O pedido é gravado no banco antes de abrir a conversa do WhatsApp; o telefone comercial deve ser configurado no painel.
- Logo e fotos comerciais podem ser substituídas por URLs no painel; as imagens atuais são ilustrativas.

## Product

Clientes consultam o cardápio, montam combos, personalizam batatas, revisam o pedido e o enviam pelo WhatsApp. A equipe administra produtos, preços, identidade, taxa de entrega e pedidos registrados.

## User preferences

- Manter a solução simples, responsiva para Android e sem serviços ou APIs pagas desnecessárias.

## Gotchas

- Configure o número do WhatsApp e a taxa de entrega em `/admin` antes de receber pedidos.
- A senha administrativa exige pelo menos 8 caracteres e é armazenada como hash; as sessões usam `SESSION_SECRET`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
