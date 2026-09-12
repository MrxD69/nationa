# Nationa

Nationa is a platform for managing companies, compliance cases, and administrative workflows, built on a modern TypeScript stack with Nuxt, Hono, and oRPC.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Nuxt** - The Intuitive Vue Framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **workers** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Running locally

First, install the dependencies:

```bash
pnpm install
```

Two development modes are available.

### Fast local dev

```bash
pnpm dev:local
```

Runs both apps on Bun without Cloudflare: Nuxt on [http://localhost:3001](http://localhost:3001) and the Hono API on [http://localhost:3000](http://localhost:3000). Uses R2 via S3 keys, Supabase Postgres over TCP, and OpenRouter.

### Alchemy / Cloudflare dev

```bash
pnpm dev
```

Runs both apps on the local `workerd` runtime through Alchemy and talks to your Cloudflare account. This is not a production deploy. It requires a configured provider profile:

```bash
alchemy profile edit --profile default --add Cloudflare
```

Run individual processes with `pnpm dev:web` (Nuxt only) or `pnpm dev:server` (API only).

> **Troubleshooting ports:** run only one dev stack at a time. The earlier `pnpm dev` (Alchemy) keeps a watcher alive, so stop it before starting `pnpm dev:local`. If you see `EADDRINUSE` (e.g. `Port 3000 is already in use`), run `pnpm dev:stop` — it runs `lsof -ti:3000 -ti:3001 | xargs -r kill`, killing whatever holds the two dev ports.

### Database

`DATABASE_URL` must be an IPv4-reachable Supabase **pooler** connection string. Apply the schema and seed data with:

```bash
pnpm db:migrate && pnpm db:seed
```

## Environment Configuration

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during installation; run `pnpm run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

For Cloudflare, Alchemy loads and validates deployment inputs with `varlock/auto-load` in its Node/Bun deployment process. Worker code reads native bindings; web clients use the framework's public env API through `src/env.public.ts` where needed. Alchemy supplies resource URLs and managed database credentials. In-Worker Varlock protections are deferred until an official Alchemy integration is available; see [the non-Wrangler deployment guidance](https://varlock.dev/integrations/cloudflare/#non-wrangler-deploy-tools-alchemy-sst-pulumi).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

## Deployment

### Alchemy

- Target: web on Cloudflare + server on Cloudflare
- Configure provider accounts: `cd packages/infra && pnpm exec alchemy profile edit`
- Dev: pnpm run dev
- Deploy: pnpm run deploy
- Destroy: pnpm run destroy

`alchemy profile edit` stores the selected Axiom, Cloudflare, Neon, PlanetScale, and/or Prisma provider profiles under `~/.alchemy`; no provider-specific setup command is required by this scaffold.

Deploys are staged and default to a personal `dev_<username>` stage. For production, run the deploy with an explicit stage from `packages/infra`:

```bash
cd packages/infra && pnpm exec alchemy deploy --stage production
```

### Production origins

- Required after the first deploy: set `CORS_ORIGIN` in `apps/server/.env` to the exact deployed web origin, such as `https://app.example.com`, then deploy the server again.

## Git Hooks and Formatting

- Run checks: `pnpm run check`

## Project Structure

```
nationa/
├── apps/
│   ├── web/         # Frontend application (Nuxt)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── api/         # API layer / business logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications on the local `workerd` runtime via Alchemy/Cloudflare
- `pnpm run dev:local`: Start both applications locally on Bun without Cloudflare
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run dev:types`: Watch API and dependency declarations when running an app individually. The root `dev` command already starts this watcher; installation and builds generate declarations automatically.
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm run check`: Run Oxlint and Oxfmt
