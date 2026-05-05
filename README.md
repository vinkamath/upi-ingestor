# UPI Ingestor

Next.js + Supabase app that parses UPI transaction emails from Gmail, categorizes them via user-defined rules/mappings, and publishes to Monarch with Telegram human-in-the-loop for unknown categories.

## Stack
- Next.js 16 App Router (single Vercel deployment)
- Supabase Auth + Postgres + RLS
- Gmail API polling
- Telegram bot webhook
- Monarch GraphQL publisher adapter

## Setup
1. Install deps:
   - `npm install`
2. Copy env:
   - `cp .env.example .env.local`
3. Fill `.env.local` values.
4. Apply SQL migration from `supabase/migrations/202605051230_init.sql`.
5. Run:
   - `npm run dev`

## Core routes
- `GET /api/cron/poll` (requires `Authorization: Bearer <CRON_SECRET>`)
- `POST /api/gmail/fetch-now`
- `POST /api/telegram/webhook`
- `GET/POST /api/rules`
- `DELETE /api/rules/:id`
- `GET /api/transactions`

## Notes
- Gmail parsing currently includes an initial HDFC-focused parser in `src/lib/parsers/hdfc.ts`.
- Unknown categories trigger Telegram inline prompts and persist learned `merchant_mappings`.
- Monarch integration uses a minimal GraphQL publisher surface and is intentionally adapter-based so other publishers can be added.
