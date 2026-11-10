# zeze time

An English-only, one-page study companion with encouraging notes, task and habit tracking, exam reminders, and a focus timer.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/dr-hala run dev` — run the zeze time web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- zeze time stores personal app data in the current browser's local storage; it does not use the API server or database.
- Source: [jaafarslyman/Supebun8](https://github.com/jaafarslyman/Supebun8)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dr-hala/` — zeze time web app, its styles, and static assets
- `lib/api-spec/openapi.yaml` — shared API contract
- `lib/db/src/schema/` — shared database schema

## Architecture decisions

- The app is client-only; personal data stays in the browser that created it.

## Product

- Manage tasks, habits, and exam dates; use the study timer, calendar, and daily progress summaries.
- Read encouraging notes in a single English-language experience.
- Brand direction: “zeze time” is an affectionate study companion made for the user's girlfriend, with a white, pink, and baby-blue palette and an orange cat mascot.

## User preferences

_No additional user preferences recorded._

## Gotchas

_No additional project-specific gotchas recorded._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
