# Write-or-Lose — Project Status

_Last updated: 2026-08-21_

This tracks implementation against the V1 scope in the [PRD](./prd.md), broken into sequential phases. Each phase should be functional/testable on its own before moving to the next. Update status and check items off as work lands.

Status legend: `Not started` · `In progress` · `Done` · `Blocked`

---

## Phase 0 — Project Setup

Goal: repo scaffolding, no features yet.

| # | Task | Status | Notes |
|---|---|---|---|
| 0.1 | Init Next.js (App Router) + TypeScript project | Done | |
| 0.2 | Add Tailwind CSS | Done | |
| 0.3 | Set up Supabase project + Postgres connection | Done | Env vars in `.env.local`, not committed. Client + server clients created. |
| 0.4 | Create base directory structure per [techstack.md](./techstack.md) §7 | Done | `/app`, `/lib/config`, `/lib/db`, `/lib/timer`, `/components` |
| 0.5 | Create config files: `challengeModes.ts`, `publishConfig.ts`, `categories.ts` | Done | Values only — logic reads from these later. |

**Exit criteria:** app boots locally, empty pages render, DB connection verified.

---

## Phase 1 — Core Writing Loop (no publishing, no feed)

Goal: a user can write against the timer and see results. Everything stays local — no server writes yet.

| # | Task | Status | Notes |
|---|---|---|---|
| 1.1 | Landing page (headline, subtext, Start Writing CTA) | Not started | [frontend.md](./frontend.md) §2.1 |
| 1.2 | Writing Setup screen (topic input/presets + mode selector) | Not started | [frontend.md](./frontend.md) §2.2 |
| 1.3 | Integrate editor (TipTap or Lexical — finalize choice) | Not started | Decide in Open Decisions before starting. |
| 1.4 | Inactivity timer engine (resets on keystroke/paste/IME input) | Not started | [requirements.md](./requirements.md) FR-4.4, NFR-7 |
| 1.5 | Live word count + elapsed time tracking | Not started | |
| 1.6 | Countdown UI with escalating visual urgency | Not started | [frontend.md](./frontend.md) §2.3 |
| 1.7 | Failure state (`Challenge Failed`, writing preserved) | Not started | Must never delete content — FR-4.8 |
| 1.8 | Manual stop/finish action | Not started | |
| 1.9 | Results screen (words, time, WPM, longest streak, mode, status) | Not started | Define "longest streak" calc — see Open Decisions |
| 1.10 | Local draft persistence (IndexedDB/localStorage) | Not started | Debounced autosave during writing, not just on exit |

**Exit criteria:** user can go Landing → Setup → Write → Fail or Stop → Results, fully client-side, with content surviving a page refresh mid-session.

---

## Phase 2 — Publishing & Privacy Flow

Goal: user can choose to publish anonymously; content reaches the database.

| # | Task | Status | Notes |
|---|---|---|---|
| 2.1 | Post-results choice popup (Keep Private / Share / Continue Writing) | Not started | [frontend.md](./frontend.md) §2.5 |
| 2.2 | Minimum word count gate screen (client-side check) | Not started | Read threshold from `publishConfig.ts` |
| 2.3 | Explicit privacy warning + confirmation screen | Not started | No default-selected action; equal weight buttons |
| 2.4 | `public_writings` table migration | Not started | Schema per [techstack.md](./techstack.md) §4.1 |
| 2.5 | `POST /api/writings` endpoint | Not started | Server-side re-validation of min word count — never trust client only |
| 2.6 | Strip/omit identifying metadata server-side | Not started | No IP, no device fingerprint, no author field populated |
| 2.7 | Mark local draft as "published" after success (kept, not deleted) | Not started | |

**Exit criteria:** a user can complete/stop a challenge, hit the word minimum, explicitly confirm, and have the writing land anonymously in the database — with no path that publishes without explicit confirmation.

---

## Phase 3 — Public Discovery (Feed & Detail Page)

Goal: published writings are readable by others.

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1 | `GET /api/writings` (list, sort=recent\|popular, category filter) | Not started | |
| 3.2 | Recent Writings feed page | Not started | [frontend.md](./frontend.md) §2.6 |
| 3.3 | Category tabs/filters | Not started | Read from `categories.ts` |
| 3.4 | `GET /api/writings/[id]` (single writing) | Not started | |
| 3.5 | Public Writing detail page | Not started | [frontend.md](./frontend.md) §2.7 — clean, distraction-free |
| 3.6 | Reactions/comments — decide stub vs. real | Not started | See Open Decisions |

**Exit criteria:** published writings are browsable, filterable, and individually readable at a stable URL, with correct anonymous metadata only.

---

## Phase 4 — Polish & Hardening

Goal: production-readiness of V1 scope (not new features).

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Cross-device inactivity detection QA (mobile keyboards, IME, paste) | Not started | NFR-7 |
| 4.2 | Empty/loading/error states across all screens | Not started | |
| 4.3 | Accessibility pass (focus states, contrast, keyboard nav) | Not started | |
| 4.4 | Responsive/mobile layout pass | Not started | |
| 4.5 | Basic rate limiting / abuse guard on publish endpoint | Not started | Anonymous + unauthenticated write endpoint needs some protection |
| 4.6 | Verify architecture is auth-ready (per techstack.md §5) without adding auth | Not started | Sanity check only — no auth implementation in V1 |

**Exit criteria:** V1 feature set from the PRD is complete, stable, and reviewed against [requirements.md](./requirements.md).

---

## Explicitly Deferred (post-V1 — do not build yet)

- User accounts / authentication
- Email sending / notifications
- Payments / subscriptions
- Complex social profiles
- Advanced messaging
- Content moderation/reporting tooling

## Open Decisions (resolve before/at the relevant phase)

- [ ] TipTap vs. Lexical — final pick (blocks Phase 1.3). **Decision: TipTap** (installed and ready).
- [ ] Exact definition of "longest continuous writing streak" (blocks Phase 1.9).
- [ ] Reactions/comments: real feature or UI-only stub in V1 (affects Phase 3.6).
- [ ] Supabase project provisioning owner/timing — client code scaffolded, user needs to create project and fill `.env.local`.

## Change Log

| Date | Change |
|---|---|
| 2026-08-21 | Phase 0 complete: Next.js + TypeScript + Tailwind initialized, Supabase client + queries scaffolded, config files created (challengeModes, publishConfig, categories), timer engine + hook created, base directory structure established, landing page renders. |
| 2026-08-21 | Rewrote status.md into phased (0–4) structure for sequential implementation. |
| 2026-08-21 | Initial docs generated from product prompt: prd.md, requirements.md, techstack.md, frontend.md, flow.md, status.md created. |

## Related Documents

[PRD](./prd.md) · [Requirements](./requirements.md) · [Tech Stack](./techstack.md) · [Frontend Spec](./frontend.md) · [Flow](./flow.md)