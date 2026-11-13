# Zeze Time

Zeze Time is a personal study companion for tasks, habits, exam dates, focus
sessions, and daily progress. It keeps working in local-only mode and can sync
each account's data privately to Supabase.

## Run it

The Replit web workflow starts the app. For a local development shell:

```sh
pnpm --filter @workspace/dr-hala run dev
```

## Connect Supabase

1. In your Supabase project, open **SQL Editor** and run
   [`supabase/schema.sql`](supabase/schema.sql).
2. In the Supabase project's API settings, copy the project URL and its public
   `anon`/publishable key. Do not use the `service_role` key in this browser app.
3. Add these environment variables in Replit Secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In Supabase Auth, enable email/password sign-in. Add the app's Replit
   development URL to the allowed redirect URLs so email confirmation can return
   to the app.
5. Restart the web app, create an account, and sign in.

The table uses row-level security: each signed-in user can only read and update
their own row. When an account has no cloud record yet, Zeze Time copies any
existing browser-saved data into that account. New accounts otherwise start
with empty lists.

Until both environment variables are present, the app clearly indicates that
data is saved only in the current browser. In that mode, data does not sync
between devices or accounts.

## Checks

```sh
pnpm --filter @workspace/dr-hala run typecheck
pnpm run build
```
