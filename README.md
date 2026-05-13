<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--                    U P I   I N G E S T O R                        -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<div align="center">

<a href="#"><img src="https://capsule-render.vercel.app/api?type=waving&color=0:ff692d,100:22201d&height=180&section=header&text=UPI%20Ingestor&fontColor=f6f5f3&fontSize=72&fontAlignY=40&desc=Parse%20every%20UPI%20transaction%20from%20Gmail%2C%20automatically&descAlignY=68&descSize=16" width="100%" alt="UPI Ingestor banner"/></a>

<br/>

<p>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-22201d?style=for-the-badge&logo=next.js&logoColor=f6f5f3&labelColor=22201d"/></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-ff692d?style=for-the-badge&logo=react&logoColor=f6f5f3&labelColor=22201d"/></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-2daf6f?style=for-the-badge&logo=typescript&logoColor=f6f5f3&labelColor=22201d"/></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-v4-2daf6f?style=for-the-badge&logo=tailwindcss&logoColor=f6f5f3&labelColor=22201d"/></a>
</p>
<p>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-2daf6f?style=for-the-badge&logo=supabase&logoColor=f6f5f3&labelColor=22201d"/></a>
  <a href="https://developers.google.com/gmail/api"><img src="https://img.shields.io/badge/Gmail-API-ff692d?style=for-the-badge&logo=gmail&logoColor=f6f5f3&labelColor=22201d"/></a>
  <a href="https://core.telegram.org/bots/api"><img src="https://img.shields.io/badge/Telegram-Bot-f2c94c?style=for-the-badge&logo=telegram&logoColor=22201d&labelColor=22201d"/></a>
  <a href="https://vercel.com"><img src="https://img.shields.io/badge/Vercel-Deploy-f6f5f3?style=for-the-badge&logo=vercel&logoColor=22201d&labelColor=22201d"/></a>
</p>

</div>

---

## What it does

Your bank sends a notification email every time you make a UPI payment. UPI Ingestor reads those emails, pulls out the structured data — amount, merchant, timestamp, reference — and gives you a clean searchable dashboard, without any manual entry.

It works in three layers, each independently useful:

<table>
<tr>
<td width="33%" valign="top" align="center">

### Parse + track

Point it at a Gmail label, connect your bank email address, and every UPI transaction is automatically extracted, deduplicated, and stored. Works today with HDFC — parser registry is open for contributions.

</td>
<td width="33%" valign="top" align="center">

### Categorize + learn

Define rules (regex / contains / equals on merchant name) or just let it ask you. Telegram inline keyboards prompt for unknown merchants, and every answer is remembered as a permanent mapping — so each merchant is only categorized once.

</td>
<td width="33%" valign="top" align="center">

### Publish to Monarch

Connect [Monarch Money](https://monarch.com/referral/2zjygvbrc9) and categorized transactions are automatically pushed to your Monarch account via their GraphQL API — no CSV exports, no import steps, no manual matching.

</td>
</tr>
</table>

---

## Monarch Money

If you want automatic expense tracking and net worth alongside your UPI transactions, Monarch Money is the best tool for it. The Monarch publisher is built in and requires no extra configuration — just connect your account in the dashboard and transactions flow in automatically.

<table align="center">
<tr>
<td align="center" style="padding: 20px 32px;">

**[→ Try Monarch Money free](https://monarch.com/referral/2zjygvbrc9)**

<sub>Budgets, net worth, investment tracking, and transactions — in one place.<br/>Use the link above to get started.</sub>

</td>
</tr>
</table>

> If you don't use Monarch, the app is still fully useful as a parser and categorization dashboard. Transactions will accumulate with `pending` or `needs_review` status, which you can browse in the UI. Telegram prompts still work for learning category mappings.

---

## Architecture

```mermaid
flowchart LR
    CRON["Vercel Cron"] --> PIPE
    WEB["Web UI"] --> PIPE
    PIPE["Pipeline"] --> FETCH
    FETCH["Gmail"] -->|raw emails| PARSE
    PARSE["Parser"] -->|transaction| CAT
    CAT{"Categorizer"} -->|hit| PUB
    CAT -->|miss| TG["Telegram Bot"]
    TG -->|user picks| CAT
    TG -.->|saves mapping| DB
    PUB["Monarch"] --> DB
    PARSE --> DB
    DB[("Supabase")]

    classDef entry fill:#ff692d,stroke:#22201d,stroke-width:2px,color:#f6f5f3
    classDef core fill:#22201d,stroke:#ff692d,stroke-width:1px,color:#f6f5f3
    classDef ext fill:#2daf6f,stroke:#22201d,stroke-width:1px,color:#f6f5f3
    classDef store fill:#f2c94c,stroke:#22201d,stroke-width:2px,color:#22201d

    class CRON,WEB entry
    class PIPE,FETCH,PARSE,CAT core
    class TG,PUB ext
    class DB store
```

> Detailed walkthrough → **[docs/architecture.html](docs/architecture.html)** &nbsp;·&nbsp; Service setup reference → **[docs/setup.html](docs/setup.html)**

---

## Quick setup

```bash
# 1. install
git clone <repo-url> && cd upi-ingestor && npm install

# 2. environment
cp .env.example .env.local
# fill in: Supabase URL + anon key, ENCRYPTION_KEY, CRON_SECRET,
#           Google OAuth credentials, Telegram bot token
# MONARCH_GRAPHQL_URL is pre-filled — no change needed

# 3. database — apply all migrations via the Supabase SQL editor
#    or: supabase db push   (requires supabase CLI linked to your project)

# 4. run
npm run dev
```

Full service-by-service setup (Google Cloud Console, Telegram BotFather, Supabase, Monarch, Vercel deployment) → **[docs/setup.html](docs/setup.html)**

<div align="center">
<a href="#"><img src="https://capsule-render.vercel.app/api?type=waving&color=0:22201d,100:ff692d&height=80&section=footer" width="100%" alt="footer wave"/></a>
</div>
