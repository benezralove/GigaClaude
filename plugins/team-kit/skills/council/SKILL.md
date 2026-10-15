---
name: council
description: Pressure-test one decision, plan or idea against five adversarial advisors running in parallel, then synthesise a verdict. Use ONLY when the user types /council or explicitly asks for "the council" by name. Never auto-invoke.
---

# Council

Five independent advisors attack one idea at the same time. You (main loop) act as chairman and give the final call.

## Never auto-invoke

Run ONLY on an explicit `/council`, "council this", or "run the council on X". Do NOT fire on phrasing matches like "what do you think", "is this a good idea", "poke holes in this", or "stress-test this" — answer those normally. Same policy as `last30days`: costly, so explicit only.

If the council would genuinely help and the user hasn't asked, offer it in one line ("want me to council this?") and wait.

## Step 0 — cost gate

Default run = 5 subagent calls, roughly 60–80k tokens. Deep run = 10 calls, roughly double.

Refuse and answer normally if the question is factual, trivial, or has one defensible answer. Say so in one line — don't burn the tokens to be agreeable.

Good targets: pricing changes, architecture commitments, hiring, killing or launching a product, "should I build this at all", anything with a fat downside and no obvious right answer.

## Step 1 — write the brief

Advisors are subagents with zero context. Write ONE self-contained brief (~150–400 words) reused verbatim for every seat:

- The decision or idea, stated plainly.
- Constraints that actually bind: money, deadline, team size, existing stack, what's already committed.
- What the user has already ruled out and why.
- Relevant file paths or URLs if the advisor should read the real thing.
- The specific question being put to the council.

Do not include your own opinion in the brief. That's the anchoring you're trying to avoid.

## Step 2 — dispatch five seats in parallel

One message, five `Agent` calls, `run_in_background: false`, `subagent_type: "general-purpose"`. Each gets: the brief, its seat instruction, and this line — *"Return your own view only. Do not hedge, do not present a balanced survey, do not restate the brief. Take a position and defend it. Max 250 words."*

| Seat | Instruction |
|---|---|
| **Contrarian** | Find the fatal flaw. Assume this fails: write the post-mortem explaining why. Name the single assumption that, if wrong, sinks the whole thing. |
| **First-principles** | Ignore the proposed solution. Is this even the right problem? Restate the underlying goal from scratch and say what you'd do instead if starting clean. |
| **Expansionist** | Find the upside nobody has named. Where is this being thought about too small? What does the 10x version look like, and what would have to be true for it to work? |
| **Outsider** | You have zero context and no stake. React as an ordinary person hearing this cold. What's confusing, what sounds like nonsense, what would you tell a friend who said this to you at a pub? |
| **Executor** | Ignore strategy. What happens in the next 7 days? Give the concrete first move, what it costs, what it proves, and the cheapest way to find out this is wrong before committing. |

## Step 3 — cross-review (deep mode only)

Only on `/council deep`. Send all five answers back to all five seats, anonymised as Advisor A–E with the seat names stripped. Ask each: *"Which of these is most wrong, and why? What did every one of them miss? Max 150 words."*

Anonymise properly — labelled seats just get argued with on reputation.

## Step 4 — you are the chairman

Do not delegate the synthesis. You hold the conversation context and you're the one who has to act on it.

Weigh the answers yourself. Where an advisor is plainly wrong about a fact you can check, check it and say so — a confident subagent is not evidence.

## Output

```
**Verdict:** <one line — what to do>

**Where they agreed** — 2–4 bullets, the load-bearing points only.

**Where they clashed** — the real disagreements, with your call on each and why.

**What nobody said** — your own read, including anything all five missed.

**Next move** — the concrete first action, and the cheapest test that would prove this wrong.
```

Then the standard What's next section.

Kill anything that survived only because it sounded good. A council that produces five agreeable takes has failed — say that plainly rather than dressing it up as consensus.
