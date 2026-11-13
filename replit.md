# Zeze Time

A personal study companion for tasks, habits, exam dates, focus sessions, and daily progress.

## Run & Operate

- The Replit web workflow runs `@workspace/dr-hala`.
- `pnpm --filter @workspace/dr-hala run typecheck` — typecheck the app
- `pnpm run build` — typecheck and build workspace packages
- Supabase is optional for local-only use. For account sign-in and cloud sync, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables and run `supabase/schema.sql` in Supabase SQL Editor.
- Never put a Supabase `service_role` key in browser environment variables.

## Stack

- pnpm workspaces, Node.js, TypeScript, React, Vite, and Tailwind CSS
- Supabase Auth and a row-level-security-protected JSONB record for each account
- Local browser storage remains available until Supabase is configured

## Where things live

- `artifacts/dr-hala/src/App.tsx` — study dashboard and interactions
- `artifacts/dr-hala/src/lib/store.ts` — study data types, validation, and browser persistence
- `artifacts/dr-hala/src/lib/supabase.ts` — public Supabase configuration
- `artifacts/dr-hala/src/components/auth-screen.tsx` — sign-in and account creation
- `supabase/schema.sql` — account data table and row-level security policies

## Architecture decisions

- Supabase is optional so the app remains usable before credentials are configured.
- Cloud data is scoped to the authenticated Supabase user; the browser uses only the public anon/publishable key.

## Product

- Track tasks, habits, upcoming exams, and focus sessions.
- Review daily progress and use the Pomodoro timer.
- Add personal notes and sync account data securely through Supabase when configured.

## User preferences

- The user will add the Supabase environment variables manually.

## Gotchas

- Run `supabase/schema.sql` in the user's Supabase project before signing in with cloud sync enabled.
- The local Supabase URL and anon key are public browser configuration; never use a service-role key here.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- See `README.md` for the Supabase setup steps.
