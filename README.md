# Zeze Time

Zeze Time is a personal study companion with a shared photo-and-note board.
Home-page study data stays in browser storage. Board items and photos are stored
in Supabase and shared without accounts or sign-in.

## Run it

The Replit web workflow starts the app. For a local development shell:

```sh
pnpm --filter @workspace/dr-hala run dev
```

## Set up the shared board

1. In the Supabase project, run [`supabase/schema.sql`](supabase/schema.sql)
   once in **SQL Editor**. It creates the board table, public access policies,
   and the photo bucket.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Replit Secrets.
   Use the public anon/publishable key, never the `service_role` key.
3. Restart the web app.

The board is intentionally public: anyone who can reach the app can view,
add, move, and edit its notes, captions, colors, and photos. The app does not
offer a delete action. Do not put private photos or sensitive notes on the
board. Supabase enforces the image type and 10 MB limits for uploads; the app
uses JPEG, PNG, and WebP files.

If Supabase isn't configured yet, the home page still works with local browser
storage and the board shows setup instructions. Board content is never saved
to local storage.

## Checks

```sh
pnpm --filter @workspace/dr-hala run typecheck
PORT=24973 BASE_PATH=/ pnpm --filter @workspace/dr-hala run build
```
