# Unsaid — Write-or-Lose

> Stop procrastinating. Start writing. You don't get to stop — you either write, or you lose.

**Unsaid** is a writing-challenge web app that helps people overcome procrastination by forcing continuous writing once a session starts. Pick something you've been putting off, choose a challenge mode, and write against an inactivity timer. Stop typing too long and the challenge fails — but your writing is **never** deleted, win or lose.

## Features

- **Zero-friction start** — no account required to write
- **Challenge modes** — Soft / Focus / Hard, each with its own inactivity threshold (config-driven and extensible)
- **Distraction-free editor** — TipTap-based rich text editor with live word count and elapsed time
- **Inactivity timer** — visually intense countdown that ends the challenge if you stop typing
- **Local draft persistence** — private drafts are saved in the browser; nothing is synced without consent
- **Anonymous publishing** — explicit two-step confirmation before anything goes public
- **Public feed** — "Recent Writings" feed with Recent / Popular / Category views
- **Server-side validation** — minimum word count (200) enforced on both client and server

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Editor | [TipTap](https://tiptap.dev) |
| Database | PostgreSQL via [Supabase](https://supabase.com) |
| Local storage | Browser localStorage for private drafts |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Create the database table by running the migration in `supabase/migrations/` against your Supabase project (via the SQL editor or the Supabase CLI).

3. Configure environment variables:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Description |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (Settings → API) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `NEXT_PUBLIC_APP_URL` | App URL, e.g. `http://localhost:3000` |

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
app/
  (marketing)/page.tsx        # Landing page
  write/setup                 # Topic + challenge mode selection
  write/challenge             # Editor + inactivity timer challenge screen
  write/results               # Results + anonymous publish flow
  feed/                       # Recent Writings public feed
  feed/[id]/                  # Public writing detail page
  api/writings/               # POST publish, GET feed
  api/writings/[id]/          # GET single writing, reactions
components/
  editor/                     # TipTap editor component
lib/
  config/                     # Challenge modes, categories, publish rules
  db/                         # Supabase client + queries
  timer/                      # Inactivity timer logic + React hook
  rateLimiter.ts              # API rate limiting
supabase/
  migrations/                 # SQL schema migrations
```

## Privacy & Design Principles

- **Anonymous means anonymous** — published writings store no author identity, IP, email, or device fingerprint.
- **Explicit publishing only** — content appears in the public feed only after two unambiguous confirmations.
- **Never lose work** — drafts persist locally regardless of challenge outcome.
- **Auth-ready architecture** — a nullable `author_id` column and a clean data-access layer keep accounts addable later without a rewrite.

## Documentation

Detailed product and engineering docs live in [`docs/`](docs/):

- [PRD](docs/prd.md) — product vision, goals, and scope
- [Requirements](docs/requirements.md)
- [Tech Stack & Architecture](docs/techstack.md)
- [Frontend Spec](docs/frontend.md)
- [User Flow](docs/flow.md)


## Deployment

The easiest way to deploy is on [Vercel](https://vercel.com). Set the environment variables above in your project settings, then deploy — see the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
