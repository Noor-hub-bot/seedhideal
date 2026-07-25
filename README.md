# SeedhiDeal

A trust-first marketplace for verified private-owner car listings in Pakistan. Built with
Next.js (App Router), Drizzle ORM on Postgres (Neon), and Tailwind CSS.

## Getting started

1. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` at minimum. Leave
   `OTP_DEV_MODE=true` for local development — no real SMS provider is wired up yet, so
   sign-in codes are printed to the server console instead of being sent (see
   `src/lib/sms.ts`).
2. Install dependencies and push the schema:
   ```bash
   npm install
   npm run db:push
   ```
3. (Optional) Seed some demo data — one admin, one verified seller, six active listings:
   ```bash
   npm run db:seed
   ```
   Sign in as the admin with `+92 300 0000000` or the seller with `+92 300 0000001`; the
   OTP code prints in the terminal running `npm run dev`.
4. Start the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` / `npm run start` — production build and start
- `npm run lint` — ESLint
- `npm run db:push` — push `src/db/schema.ts` to the database (Drizzle Kit)
- `npm run db:seed` — run `src/db/seed.ts`

## Project layout

- `src/app` — routes (App Router). Server Components read from `src/db` directly; mutations
  go through Server Actions in `src/lib/actions/*.ts`.
- `src/db/schema.ts` — Drizzle schema, single source of truth for the Postgres schema.
- `src/lib/auth.ts` — phone/OTP session auth (cookie-based sessions, no passwords).
- `src/lib/storage.ts` — listing-photo and verification-document uploads; falls back to
  local disk (`public/uploads`, `private-uploads`) when `STORAGE_BUCKET` isn't set, otherwise
  uploads to S3/R2 (see `.env.example`).
- `src/components/ui.tsx` — shared design-system primitives (Button, Card, Badge, etc.).

## Object storage

Listing photos and verification documents can be stored locally (default, for development)
or in Cloudflare R2 / AWS S3 — both speak the S3 API. See the `STORAGE_*` variables in
`.env.example`.

## Scheduled jobs

`GET /api/cron/sweep-listings` expires listings past their active period. It requires a
`Authorization: Bearer $CRON_SECRET` header — set `CRON_SECRET` and point any scheduler at
it (Vercel Cron is preconfigured in `vercel.json`; any other scheduler works too).

## Deploying

The easiest path is [Vercel](https://vercel.com/new). Set the environment variables from
`.env.example` in the project settings, including `CRON_SECRET` if you want the expiry sweep
to run automatically.
