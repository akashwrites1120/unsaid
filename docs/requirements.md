# Write-or-Lose — Requirements

## 1. Functional Requirements

### 1.1 Landing Page
- FR-1.1: Display headline "Stop Procrastinating. Start Writing." and supporting copy.
- FR-1.2: Provide a primary "Start Writing" CTA that leads to Writing Setup.
- FR-1.3: Visual design must feel focused, minimal, slightly intense — not a generic productivity app.

### 1.2 Writing Setup
- FR-2.1: Prompt "What are you writing?" with preset suggestions (College assignment, Story, Journal, Blog, Research, Personal thoughts, Something I've been procrastinating) plus a Custom free-text option.
- FR-2.2: Let the user select a Challenge Mode before starting.
- FR-2.3: Challenge Mode configuration (inactivity threshold, label) must be defined in a single extensible config so new modes can be added without touching challenge logic.

### 1.3 Challenge Modes
- FR-3.1: **Soft Mode** — generous inactivity limit.
- FR-3.2: **Focus Mode** — moderate inactivity limit.
- FR-3.3: **Hard Mode** — 5 second inactivity limit.
- FR-3.4: Mode definitions live in a shared config/lookup, not hardcoded per-component.

### 1.4 Writing Challenge / Editor
- FR-4.1: Distraction-free rich text editor (TipTap or Lexical).
- FR-4.2: Track and display live word count.
- FR-4.3: Track and display elapsed time.
- FR-4.4: Track typing activity; any keystroke resets the inactivity countdown.
- FR-4.5: Prominently display remaining inactivity time.
- FR-4.6: Visually emphasize the countdown as it approaches zero (e.g. size/color escalation, numeric countdown).
- FR-4.7: If inactivity exceeds the mode's limit, the challenge ends in **Failed** state.
- FR-4.8: Writing content must never be deleted on failure — it remains fully accessible.
- FR-4.9: User can manually stop/finish writing at any time.

### 1.5 Completion / Results
- FR-5.1: On finish (success or stop), show results: words written, total time, words per minute, longest continuous writing streak, challenge mode, challenge status.
- FR-5.2: Offer next actions: Continue Writing, Keep Private, Share.

### 1.6 Publishing Flow
- FR-6.1: After completion/stop, present a choice: Keep Private / Share with Others / Continue Writing.
- FR-6.2: Before publishing, show an explicit privacy warning describing public visibility.
- FR-6.3: Publishing requires an explicit "Publish Anonymously" confirmation — never implicit or default-on.
- FR-6.4: Publishing is anonymous by default; no identity is attached to published content.
- FR-6.5: No account is required to publish in V1.

### 1.7 Minimum Length Gate
- FR-7.1: A writing must reach a configurable minimum word count (default: 200) to be eligible for publishing.
- FR-7.2: If under the minimum, show current word count, the minimum, and words remaining, with options to Continue Writing or Keep Private.
- FR-7.3: Once minimum is reached, show a confirmation checklist (challenge completed, word count, minimum reached) with Keep Private / Publish Anonymously actions.
- FR-7.4: The minimum-word-count value must be a config value, not hardcoded inline in UI logic.

### 1.8 Recent Writings Feed
- FR-8.1: Public feed listing published writings with: anonymous label, relative publish time, excerpt, word count, challenge mode, reaction/comment counts.
- FR-8.2: Feed supports sort/filter: Recent, Popular, Categories.
- FR-8.3: Category taxonomy: Thoughts, Stories, Journal, Academic, Confession, Ideas, Other.

### 1.9 Public Writing Page
- FR-9.1: Each published writing has its own detail page showing: anonymous author, publish time, category, word count, challenge mode, full content, and optional reactions/comments.
- FR-9.2: Reading view is clean and distraction-free (no unrelated navigation clutter).

### 1.10 Local Persistence
- FR-10.1: Private drafts and in-progress session state persist via localStorage/IndexedDB without requiring an account.
- FR-10.2: A user can resume or view a past draft/session within the same browser.

## 2. Non-Functional Requirements

- NFR-1: **No forced signup** anywhere in the V1 core loop (write → complete/fail → private/publish).
- NFR-2: **Data integrity** — writing content must survive challenge failure, browser refresh (via local persistence), and network hiccups during publish.
- NFR-3: **Privacy by default** — nothing is public unless the user explicitly confirms publishing; published content stores no personally identifying data.
- NFR-4: **Extensibility** — challenge modes, minimum word-count thresholds, and categories must be config-driven, not hardcoded in multiple places.
- NFR-5: **Auth-ready architecture** — data models and API routes should not assume anonymity permanently; adding an `author_id`/auth layer later should not require a schema rewrite.
- NFR-6: **Performance/responsiveness** — the inactivity timer must be accurate and low-latency; UI countdown updates should feel real-time (sub-second granularity, especially in Hard Mode).
- NFR-7: **Reliability of typing detection** — must correctly register activity from typing, paste, IME composition, and mobile soft keyboards to avoid unfair failures.
- NFR-8: **Content moderation hook** — schema/API should allow adding moderation/reporting later without redesign (not implemented in V1).

## 3. Out of Scope (V1)

- Email sending / notifications
- User accounts and authentication
- Payments and subscriptions
- Complex social profiles
- Direct/advanced messaging

See [PRD](./prd.md) for context and [Tech Stack](./techstack.md) for implementation direction.
