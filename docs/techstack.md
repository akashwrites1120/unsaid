# Write-or-Lose — Tech Stack & Architecture

## 1. Overview

V1 is a Next.js full-stack app with no authentication, local-first private drafts, and a Postgres-backed public feed for explicitly published writings.

## 2. Frontend

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | SSR for public pages (feed, writing detail) aids sharing/SEO; client components for the editor/challenge flow. |
| Language | TypeScript | End-to-end type safety across editor state, API routes, and DB models. |
| Styling | Tailwind CSS | Utility-first, fast iteration on a minimal/intense visual identity. |
| Editor | TipTap (preferred) or Lexical | Rich text editor; needs reliable low-level keystroke/activity events for the inactivity timer. TipTap suggested as the default given simpler event hooks via ProseMirror transactions. |
| Local persistence | localStorage / IndexedDB | IndexedDB preferred for larger/structured draft data; localStorage acceptable for small session flags/config. |

## 3. Backend

- **Next.js API routes / Server Actions** for V1 — no separate backend service needed.
- Responsibilities:
  - Accept a "publish" request (content, word count, category, challenge mode, challenge duration) and persist it.
  - Serve the Recent Writings feed (recent / popular / by category) with pagination.
  - Serve a single public writing by id.
  - Enforce the minimum-word-count rule server-side as well as client-side (never trust client-only validation for a public write).

## 4. Database

- **PostgreSQL**, provisioned via **Supabase** for V1 infra (managed Postgres + easy REST/client access).
- Public writings table only — private drafts stay client-side (local storage), not synced to the DB in V1.

### 4.1 `public_writings` table (draft schema)

```
id                  uuid, primary key
content             text
word_count          integer
category            text (enum-like: thoughts | stories | journal | academic | confession | ideas | other)
challenge_mode      text (soft | focus | hard | ...future modes)
challenge_duration  integer (seconds)
created_at          timestamptz, default now()
```

Deliberately excluded: any author identity, IP address, email, or device fingerprint — anonymous means anonymous. Reaction/comment counts can be derived tables (`writing_reactions`, `writing_comments`) added when that feature is implemented, keyed by `writing_id`.

## 5. Authentication

- **Not implemented in V1.**
- Architectural guardrails to keep it addable later without a rewrite:
  - Keep a clean service/data-access layer between API routes and the DB (not direct ad-hoc queries scattered in components) so an `author_id`/session check can be inserted centrally.
  - Design `public_writings` so a nullable `author_id` column can be added later without breaking existing anonymous rows.
  - Avoid baking "no auth" assumptions into the public API contract (e.g., don't require anonymity as a hardcoded field — just don't populate identity in V1).

## 6. Config-Driven Pieces

To satisfy the extensibility requirements in [requirements.md](./requirements.md):

- `challengeModes.ts` (or similar): single source of truth for mode key, label, inactivity threshold in seconds. UI and challenge-engine both read from this.
- `publishConfig.ts`: minimum word count and any future publish gates, as named constants/config rather than inline magic numbers.
- `categories.ts`: category keys, labels, emoji/icons.

## 7. Suggested Directory Structure (illustrative)

```
/app
  /(marketing)/page.tsx        landing page
  /write/setup                writing setup
  /write/challenge             challenge/editor screen
  /write/results                results + publish flow
  /feed                        recent writings
  /feed/[id]                   public writing detail
  /api/writings                POST publish, GET feed
  /api/writings/[id]           GET single writing
/lib
  /config/challengeModes.ts
  /config/publishConfig.ts
  /config/categories.ts
  /db                          Supabase/Postgres client + queries
  /timer                       inactivity timer logic (shared client hook)
/components
  /editor
  /challenge
  /feed
```

## 8. Future-Facing (not built in V1, but kept in mind)

- Auth layer (accounts, sessions) sitting alongside existing anonymous publish flow.
- Payments/subscriptions.
- Moderation/reporting on published content.
- Server-synced private drafts (requires auth).

See [Frontend Spec](./frontend.md) for screen-level detail and [Flow](./flow.md) for the end-to-end user journey.
