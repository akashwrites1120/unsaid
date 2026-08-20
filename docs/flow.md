# Write-or-Lose — User & System Flow

## 1. High-Level Loop

```
PROCRASTINATING
     │
     ▼
START CHALLENGE
     │
     ▼
KEEP WRITING
     │
     ▼
DON'T STOP
     │
     ▼
COMPLETE / FAIL
     │
     ▼
SAVE PRIVATELY  or  SHARE ANONYMOUSLY
     │
     ▼
RECENT WRITINGS
     │
     ▼
INSPIRE OTHER PEOPLE TO WRITE
```

## 2. Detailed Flow

### Step 1 — Landing
User lands on the homepage → clicks **Start Writing**.

### Step 2 — Setup
1. User specifies what they're writing (preset or custom).
2. User selects a Challenge Mode (Soft / Focus / Hard).
3. Client initializes a local session/draft record (id, topic, mode, start time) in IndexedDB/localStorage.

### Step 3 — Challenge (Editor)
1. Editor loads empty/distraction-free.
2. Inactivity timer starts counting down from the mode's threshold.
3. On each keystroke/input event: word count and elapsed time update; inactivity countdown resets to the mode's full threshold.
4. Countdown is persisted to local draft periodically (e.g. debounced autosave of content) so a refresh doesn't lose progress.
5. Two ways out of this step:
   - **Timeout path**: countdown hits 0 → state becomes `failed`.
   - **User-stop path**: user manually stops/finishes → state becomes `stopped` (treated like a voluntary completion for the results screen).

### Step 4 — Results
1. App computes stats: total words, total time, words/minute, longest continuous writing streak (longest span without triggering a countdown reset to near-zero, or longest active writing interval — defined precisely at build time), mode, and status (`completed` / `failed` / `stopped`).
2. Writing content is preserved locally regardless of status — no deletion path exists in the UI or client logic.
3. User is presented next actions: Continue Writing, Keep Private, Share.

### Step 5 — Publish Decision
1. If **Continue Writing** → return to Step 3 with existing content and timer restarted.
2. If **Keep Private** → session marked private locally; flow ends (writing stays only in local storage).
3. If **Share with Others**:
   a. Check word count against the configured minimum (default 200).
   b. **Below minimum** → show gate screen with words remaining; only options are Continue Writing or Keep Private (publish is not possible yet).
   c. **At/above minimum** → show explicit privacy warning + confirmation screen.
      - **Keep Private** → cancel publish, stay local.
      - **Publish Anonymously** → proceed to Step 6.

### Step 6 — Publish (system)
1. Client sends content, word count, category, challenge mode, challenge duration to `POST /api/writings`.
2. Server re-validates the minimum word count (never trust client-side check alone).
3. Server strips/omits any identifying metadata; inserts a new row in `public_writings` with a generated id and `created_at`.
4. On success, client shows confirmation and links to the new Public Writing Page; local draft is marked as "published" (still retained locally, not deleted).

### Step 7 — Discovery
1. Other users browse **Recent Writings** (`GET /api/writings` with sort=recent|popular and optional category filter).
2. Clicking a card navigates to the Public Writing Page (`GET /api/writings/[id]`).
3. Reading a published, anonymous piece is intended to prompt the reader to start their own challenge — looping back to Step 1.

## 3. State Diagram (Challenge Session)

```
        ┌───────────┐
        │  setup    │
        └─────┬─────┘
              │ start
              ▼
        ┌───────────┐   timeout    ┌──────────┐
        │  writing  ├──────────────▶  failed  │
        └─────┬─────┘               └────┬─────┘
              │ user stops                │
              ▼                           │
        ┌───────────┐                     │
        │  stopped  │◀────────────────────┘ (both lead to results)
        └─────┬─────┘
              │
              ▼
        ┌───────────┐
        │  results  │
        └─────┬─────┘
              │
     ┌────────┼─────────────┐
     ▼        ▼              ▼
 continue   private       share (→ length gate → privacy
 writing   (local only)    confirm → publish)
```

## 4. Data Flow Summary

- **Private drafts**: client-only (IndexedDB/localStorage), never sent to the server unless the user explicitly publishes.
- **Published writings**: server-validated, stored anonymously in Postgres (`public_writings`), served back via the feed and detail endpoints.
- No step in this flow requires an authenticated account.

See [Requirements](./requirements.md) for the rules enforced at each step and [Tech Stack](./techstack.md) for implementation details.
