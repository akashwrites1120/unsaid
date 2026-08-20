# Write-or-Lose — Frontend Spec

## 1. Design Direction

- Tone: focused, minimal, slightly intense, motivating — not a generic productivity/SaaS aesthetic.
- The editor screen is the emotional core of the product; typography and the countdown treatment should carry most of the "intensity," not decoration.
- Countdown urgency should escalate visually (e.g., color shift toward warning/red, scale/pulse) as time runs low, especially in Hard Mode.

## 2. Screens

### 2.1 Landing Page
- Headline: **Stop Procrastinating. Start Writing.**
- Subtext: "Whatever you've been putting off, write it now. The only rule is simple: keep writing."
- Primary CTA button: **Start Writing** → routes to Writing Setup.
- Minimal nav; no distracting secondary content competing with the CTA.

### 2.2 Writing Setup
- Prompt: "What are you writing?"
  - Preset chips/options: College assignment, Story, Journal, Blog, Research, Personal thoughts, Something I've been procrastinating, Custom (free text input).
- Challenge mode selector (Soft / Focus / Hard), rendered from the shared mode config so new modes appear automatically.
- Continue/Start action to enter the Challenge screen.

### 2.3 Writing Challenge (core screen)
Layout reference (Hard Mode example):

```
HARD MODE
Keep writing...
      4.2s
────────────────────────
[ Writing editor ]
────────────────────────
427 words       18:42
```

- Mode label displayed prominently at top.
- Live inactivity countdown, large and central, updating in real time.
- Distraction-free editor body (no toolbars/chrome unless essential).
- Footer/status bar: live word count (left) and elapsed time (right).
- On inactivity approaching the limit, countdown visually escalates (e.g. 5.0 → 4.0 → 3.0 → 2.0 → 1.0 with increasing visual emphasis).
- On failure: transition to a clear **Challenge Failed** state; writing remains visible/accessible, never removed.
- Manual "stop/finish" affordance so the user can end the session intentionally instead of only via failure.

### 2.4 Completion / Results Screen
- Stats block:

```
CHALLENGE COMPLETE 🎉

427 words
18m 42s
22.8 words/min

Longest writing streak
18m 42s
```

- Shows: words written, total time, words/minute, longest continuous streak, challenge mode, challenge status (completed vs. failed vs. stopped).
- Actions: Continue Writing / Keep Private / Share.

### 2.5 Publish / Privacy Flow
- Step 1 — Intent popup: "What do you want to do with your writing?" → Keep Private / Share with Others / Continue Writing.
- Step 2 — Explicit privacy warning (only shown if user chose Share):

```
Share this writing?
Your writing will become publicly visible in Recent Writings.
Anyone using the website may be able to read it.

[ Keep Private ]   [ Publish Anonymously ]
```

- If under the minimum word count, show the length-gate state instead of the publish confirmation:

```
Your writing is currently 137 words.
Public writings must be at least 200 words.
63 more words to publish.

[ Continue Writing ]
[ Keep Private ]
```

- Once at/above minimum:

```
✓ Challenge completed
✓ 247 words
✓ Minimum length reached

[ Keep Private ]
[ Publish Anonymously ]
```

- No default/pre-selected action should favor publishing — both choices should be equally weighted, no dark patterns.

### 2.6 Recent Writings Feed
- List/grid of published writings, each card showing:

```
Anonymous · 2 minutes ago
"I've been putting this off for three weeks..."
427 words · Hard Mode
❤️ 12    💬 3
```

- Tabs/filters: Recent, Popular, Categories (💭 Thoughts, 📖 Stories, 📝 Journal, 🎓 Academic, ❤️ Confession, 💡 Ideas, 🗣️ Other).
- Clicking a card opens the Public Writing Page.

### 2.7 Public Writing Page
- Header: Anonymous · timestamp · category · word count · challenge mode.
- Full writing content in a clean, distraction-free reading layout.
- Optional reactions/comments UI (if implemented) below the content.

## 3. Interaction Notes

- Countdown numbers should use a monospace or tabular-numeral font to avoid layout jitter as digits change.
- Any keystroke (including paste and IME composition events) must reset the inactivity timer — verify this in editor integration, not just plain `keydown`.
- Failure state should not feel punitive toward the *content* — visually separate "you lost the challenge" from "your writing is still here and fine."

## 4. Related Documents

- [PRD](./prd.md) · [Requirements](./requirements.md) · [Tech Stack](./techstack.md) · [Flow](./flow.md) · [Status](./status.md)
