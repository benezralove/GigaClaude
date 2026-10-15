---
name: decision-record
description: >
  Write a decision record AS a hard-to-reverse decision is being made, not after
  it. Captures what was believed before, what got tested, which alternatives lost
  and why, and what would overturn it. Records reversals, including same-session
  ones, because a record containing only what survived is a worse record.
  Use when about to commit to something hard to undo: an architecture choice, a
  schema, a pricing model, a vendor, a domain rule, anything someone will ask
  "why is it like this" about in a year. Trigger: /decision-record, "write this
  up as a decision", or when a ratified choice gets reversed.
---

# Decision Record

**The gap this fills.** Conclusions live in `CLAUDE.md` or the docs. Evidence lives in research
notes or a spreadsheet. **Neither holds the thing in between: how the decision was actually reached,
what was believed before it, and which alternatives lost and why.**

Without it that reasoning survives only in commit messages and one long conversation. Commit messages
are good at it and unreadable as a set: you cannot ask "why did we choose X" and get an answer
without reading a hundred of them in order.

## Write it AS the decision is made, not after

**This is the part that matters most and the part that gets skipped.**

Written afterwards, a record is a justification. It remembers the winning argument and quietly
forgets the three hours spent on a losing one, the claim that got withdrawn, and the thing that was
believed at the start and turned out false. **Those are the expensive parts and they are exactly what
a future reader needs.**

Written as you go, with a `STATUS: OPEN` header and questions still marked unresolved, it is a
working document. Close it when the decision closes.

**Proof this is not theoretical:** in one session a rule was ratified, written into the canon, and
**reversed within the hour** when the user spotted that the thing it was derived from invalidated it.
Both the ratification and the reversal are in the record, with the argument that won each. Written
after the fact, only the reversal would have survived, and the next person would re-propose the
original next year.

## The seven questions

Answer in this order. **Skip a heading only when it is genuinely empty, and say so rather than
dropping it silently.**

1. **The question.** One sentence. What was actually being decided.
2. **What was believed before.** The starting position, where it came from, and whether anyone had
   ever checked it. Often the most useful section: a surprising number of "obvious" starting
   positions turn out to be unsourced.
3. **What was tested.** Computations run, sources reached, benchmarks, with the numbers. Link to the
   evidence rather than repeating it.
4. **The options, and why the losers lost.** **This is the section that disappears everywhere else
   and it is the main reason the file exists.** An option rejected for a stated reason is a decision;
   an option nobody wrote down is a thing someone proposes again next year.
5. **What was decided**, and how confident it is.
6. **What is still open.** Named explicitly, not implied by absence.
7. **What would overturn it.** If nothing could, say that, and **be suspicious of the answer** — a
   decision no evidence could reverse is usually a preference wearing a costume.

## Two rules that matter more than the format

**Record the reversals.** A record containing only what survived is a worse record. Where a claim was
withdrawn, the withdrawal goes in, with who spotted it. Several good decisions are reached by getting
something wrong first, and **the wrong version is often more instructive than the right one** because
it shows the shape of the trap.

**Distinguish measured from inherited from chosen.** At every step make clear which of the three a
thing is. Most bad decisions are a chosen thing that got recorded as a measured one, and it is
invisible six months later.

## Mechanics

- **One directory**, numbered sequentially, numbers never reused. `docs/decisions/0001-thing.md`.
- **A README indexing them**, with a status column, and a list of decisions already taken whose
  reasoning is not yet written up. **That gap list is valuable**: it makes the missing records
  visible instead of forgotten.
- **A superseded record stays**, with a pointer forward. Never delete or rewrite history.
- **Link the evidence, do not inline it.** The record is the reasoning; the research file is the
  proof.

## When a decision earns one

**When it is hard to reverse, or when someone will ask "why" later.** Architecture commitments,
schema shapes, a vendor, a pricing model, a domain rule, which library, what a term means.

**Not** for fixing a bug, unless the bug revealed a decision nobody had noticed making, which is
itself worth a short record.

**Proportional.** A record is a page, not a document. If it needs sections, it is probably two
decisions.

## Anti-patterns

- **Writing it after, from memory.** Produces a justification, not a record. See above.
- **Only recording the winner.** Section 4 is the whole point.
- **Omitting your own withdrawn claims** because they are embarrassing. They are the most useful
  content in the file, and leaving them out means the next person walks into the same trap.
- **"What would overturn it: nothing."** Almost always false. Look harder.
- **Turning it into a process gate.** This is a page written while thinking, not an approval step
  and not a role hierarchy.
