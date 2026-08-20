# Write-or-Lose — Product Requirements Document (PRD)

## 1. Summary

**Write-or-Lose** is a writing-challenge web app that helps people overcome procrastination by forcing continuous writing once a session starts. Users pick something they've been putting off, choose a challenge mode, and write against an inactivity timer. Stop typing too long, and the challenge fails — but the writing is never deleted.

## 2. Problem Statement

People procrastinate on writing (assignments, journaling, stories, confessions, ideas) because there's no forcing function to start and continue. Existing writing tools are passive; they don't create urgency or accountability.

## 3. Product Philosophy

> Everyone has something they've been putting off writing. Give them a reason to finally write it.

Core tagline:

> Stop procrastinating. Start writing. You don't get to stop — you either write, or you lose.

## 4. Goals (V1)

- Make it effortless to start writing with zero friction (no account required).
- Create real urgency via an inactivity timer that ends the challenge on failure.
- Never punish the user by deleting their work, win or lose.
- Let users optionally and explicitly share their writing anonymously.
- Build a lightweight anonymous community feed ("Recent Writings") that inspires others to write.
- Keep the architecture extensible for accounts, payments, and social features later.

## 5. Non-Goals (V1)

- User accounts / authentication
- Email sending / notifications
- Payments or subscriptions
- Complex social profiles or messaging
- Non-anonymous identity of any kind

## 6. Target Users

- Students avoiding assignments
- Writers/bloggers with unfinished drafts
- People journaling or processing thoughts
- Anyone with a "confession" or idea they've been sitting on

## 7. Core User Loop

```
PROCRASTINATING
   → START CHALLENGE
   → KEEP WRITING
   → DON'T STOP
   → COMPLETE / FAIL
   → SAVE PRIVATELY or SHARE ANONYMOUSLY
   → RECENT WRITINGS
   → INSPIRE OTHER PEOPLE TO WRITE
```

## 8. Key Features (V1 scope)

1. Landing page with clear CTA
2. Writing setup (topic + challenge mode selection)
3. Challenge modes (Soft / Focus / Hard, extensible)
4. Distraction-free text editor
5. Inactivity timer with visually intense countdown
6. Challenge success/failure logic
7. Live word count and elapsed time tracking
8. Post-challenge statistics screen
9. Local draft persistence (no account needed)
10. Minimum word count (200) gate for publishing
11. Anonymous publishing flow with explicit confirmation
12. Recent Writings public feed (Recent / Popular / Categories)
13. Public writing detail page

## 9. Success Criteria

- A user can go from landing page to a completed/failed challenge with zero signup friction.
- Writing is never lost, regardless of challenge outcome.
- Publishing requires two explicit, unambiguous confirmations (challenge complete/stopped + privacy warning).
- The feed only ever shows content the author explicitly chose to publish.
- Architecture allows adding auth, payments, and social features without a core rewrite.

## 10. Key Risks / Considerations

- **Privacy**: publishing must never happen accidentally; always show the explicit warning before making writing public.
- **Content moderation**: an anonymous public feed (including a future "Confession" category) creates moderation risk — flagged as a future consideration, not solved in V1.
- **Data loss**: local-storage-only persistence for private drafts means a cleared browser loses unpublished work; this is an accepted V1 tradeoff.
- **Timer fairness**: inactivity detection must be reliable across devices/input methods (paste, IME input, mobile keyboards) so users aren't unfairly failed.

## 11. Related Documents

- [Requirements](./requirements.md)
- [Tech Stack](./techstack.md)
- [Frontend Spec](./frontend.md)
- [User Flow](./flow.md)

