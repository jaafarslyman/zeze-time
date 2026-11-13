# Zeze Time

A two-page study companion with a shared photo-and-note keepsake board.

## Run & Operate

- The Replit web workflow runs `@workspace/dr-hala`.
- `pnpm --filter @workspace/dr-hala run typecheck` — typecheck the app.
- `PORT=24973 BASE_PATH=/ pnpm --filter @workspace/dr-hala run build` — build the web app.
- The user will add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` manually, then run `supabase/schema.sql` in Supabase SQL Editor.
- Never put a Supabase `service_role` key in browser environment variables.

## Stack

- pnpm workspaces, Node.js, TypeScript, React, Vite, and Tailwind CSS.
- Supabase public anon client for the shared board table and public photo bucket.
- Home-page study data stays in browser local storage.

## Where things live

- `artifacts/dr-hala/src/App.tsx` — home page, routes, and icon-only bottom navigation.
- `artifacts/dr-hala/src/lib/store.ts` — home-page data types, validation, and browser persistence.
- `artifacts/dr-hala/src/lib/supabase.ts` — public Supabase configuration.
- `artifacts/dr-hala/src/pages/BoardPage.tsx` — board UI and interaction states.
- `artifacts/dr-hala/src/pages/BoardPageContainer.tsx` — board database and photo-storage operations.
- `artifacts/dr-hala/src/lib/board-types.ts` — shared board types and color palettes.
- `supabase/schema.sql` — board table, anonymous policies, and photo bucket.

## Architecture decisions

- There are no user accounts or sign-in screens.
- Home-page data remains local; board notes, captions, colors, positions, and photos use Supabase.
- The board is intentionally public to anonymous visitors; anyone who reaches the app can add, edit, and move board items.

## Gotchas

- Run `supabase/schema.sql` before using the board, and configure both public Supabase environment variables.
- Do not store private photos or sensitive notes on the board; its bucket is public by design.
- The local Supabase URL and anon key are public browser configuration; never use a service-role key here.

## Pointers

- See the `pnpm-workspace` skill for workspace structure and package details.
- See `README.md` for setup steps and the public-board warning.
