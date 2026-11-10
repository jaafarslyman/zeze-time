# Dr. Hala

A bilingual Arabic/English study and wellbeing dashboard for organizing tasks, habits, exams, and focused study sessions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/dr-hala run dev` — run the Dr. Hala web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Dr. Hala stores personal app data in the current browser's local storage; it does not use the API server or database.
- Source: [jaafarslyman/Supebun8](https://github.com/jaafarslyman/Supebun8)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dr-hala/` — Dr. Hala web app, its styles, and static assets
- `lib/api-spec/openapi.yaml` — shared API contract
- `lib/db/src/schema/` — shared database schema

## Architecture decisions

- The Dr. Hala dashboard is client-only; personal data stays in the browser that created it.

## Product

- Manage tasks, habits, and exam dates; use the study timer, calendar, and daily progress summaries.
- Switch between Arabic and English.

## User preferences

_No additional user preferences recorded._

## Gotchas

_No additional project-specific gotchas recorded._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
