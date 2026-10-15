---
name: skill-harvest
description: >
  Turn something learned in a session into a durable skill or standing rule.
  Run when the user types /skill-harvest or asks "should that be a skill", and when
  offering a harvest at the end of a session that produced a reusable pattern.
  Decides WHERE a lesson belongs (most belong in CLAUDE.md, not a skill), then
  drafts and installs it. Never auto-installs anything.
---

# Skill Harvest

Sessions produce two kinds of output: the work, and the **lessons about how to do the work**. The
work gets committed. The lessons evaporate. This skill catches the second kind.

**It never installs anything without the user saying yes.** It proposes, they rule.

## The bar: all four, not three

Most things that feel worth keeping are not. A candidate qualifies only if it passes **every** one:

1. **Recurrence.** It happened at least twice this session, OR it will obviously recur in other
   projects. Once, in one repo, is an anecdote.
2. **Cost.** Getting it wrong cost something real: a wrong answer shipped, a swarm burned, rework,
   a committed error, an hour lost. If nothing was at stake, nothing needs encoding.
3. **Not already covered.** Check `~/.claude/skills/`, the project `CLAUDE.md`, and the global
   `CLAUDE.md` before proposing. Duplicating an existing rule makes both weaker.
4. **Transferable.** It would still be true in a repo about something completely different. This is
   the test most candidates fail, and failing it is not a rejection: it means the lesson belongs in
   that project's `CLAUDE.md` instead.

## Routing: most lessons are NOT skills

**This is the part that earns the skill's existence.** Get the destination wrong and a good lesson
either never fires or fires constantly and gets ignored.

| what it is | where it goes | why |
|---|---|---|
| A fact about ONE project | that project's `CLAUDE.md` | it is not transferable and never will be |
| A preference about how to talk to the user | global `CLAUDE.md` | must apply always, costs nothing to keep loaded |
| A rule that must fire EVERY time and is cheap | global `CLAUDE.md` | a skill would not be loaded reliably enough |
| A procedure with steps, wanted only sometimes | **a skill** | too long to keep loaded, needs to be findable |
| Expensive, slow, or disruptive to run | **a skill, plus a row in the offer-don't-fire table** | must never fire on its own |
| A one-off fix | nowhere | let it go |

**Default to `CLAUDE.md`.** A skill is the right answer only when the content is long enough that
keeping it always-loaded would be wasteful, and self-contained enough to be invoked deliberately.

## How to offer

**Do not inherit the anti-nag rule from the heavy-skills table. It solves a different problem.**
Those are capped at one because each RUN is expensive, tens of thousands of tokens. A harvest
suggestion costs a line to read. The constraint there is spend; the constraint here is only noise.

- **Up to three per session**, each passing the bar on its own. Not a wall, but not artificially
  rationed either.
- **Frame it as a list of what to keep and WHERE**, never as "want me to make a skill?" Most items
  will be CLAUDE.md lines, and calling them skills mislabels the work and the cost.
- **Name the destination for each**, so the routing decision is visible and the user can overrule it. They
  are often right about where something belongs.
- **Say what each one saves or prevents**, in a clause. "Would have caught two errors this session"
  or "cut a research phase from about 9M tokens to 1.8M". A suggestion with no stated payoff is
  noise regardless of how good it is.
- **Offer at the END**, in the "What's next" block. Never interrupt work in progress, and never
  when the user is mid-debug, frustrated, or short on budget.
- **If they decline one, drop it for the session.** Do not re-raise it in another form.
- **If nothing passes the bar, say nothing.** Silence is the correct output most sessions, and it
  is what keeps the list credible on the sessions where there IS something.

## Writing the artefact

**For a skill**, follow the house format in `~/.claude/skills/`: a single `SKILL.md`, YAML
frontmatter with `name` and `description`, body in Markdown. Supporting files only if genuinely
needed (`verify-loop` has a `templates/` directory; most do not).

**The `description` field is the whole ballgame.** It is what decides whether the skill is ever found
again. It must state:
- what the skill does, in one clause;
- **the explicit trigger phrases**, including the slash command;
- **whether it may auto-invoke**, and if not, say "Never auto-invoke" in the description itself, as
  `council` does.

**For a `CLAUDE.md` rule**: lead with the rule in bold, then the reason, then the exception. Keep it
to a few lines. Say WHY, because a rule without a reason gets rationalised away at 2am.

**Always show the user the exact text before writing it**, and say which file it lands in. Global
`CLAUDE.md` affects every project they have, so changes there get shown in full, never summarised.

## Anti-patterns, all of which have happened

- **Encoding a project fact as a global rule.** "Modality is out" is true of Real Sky and meaningless
  elsewhere. Project `CLAUDE.md`.
- **Writing a skill for something that must always be on.** If it needs to fire every time, a skill
  is the wrong container: it might not be loaded.
- **A vague description.** "Helps with research" is never matched against a real prompt.
- **Harvesting the conclusion instead of the method.** The finding goes in the repo. The skill
  captures **how it was found**, which is the part that transfers.
- **Proposing three at once.** One, the best.

## Worked examples

Real candidates from a single Real Sky session, showing the routing decision each time.

**Source once per SOURCE, not once per subject. → SKILL.**
Researching 13 signs against 13 shared texts, the obvious shape is one pass per sign, which refetches
the same texts thirteen times. Inverting it to one pass per text cut the estimate from roughly 9M
tokens to 1.8M, and it was also *better*: reading one text across all subjects surfaced a
cross-reference that per-subject reads had missed. Passes all four tests, has steps, wanted only
sometimes. A skill.

**A subagent report is a claim, not a source. → GLOBAL CLAUDE.md.**
An agent fabricated citations for texts it never opened, and it was committed before it retracted
itself. Must fire every time, costs nothing to keep loaded, applies to every project. Not a skill.

**Verify a script's printed conclusion against its own data. → GLOBAL CLAUDE.md.**
Twice in one session a script printed a summary its own output contradicted, and once a loop never
executed at all because its bounds wrapped (`for lon=350; lon<60`). Cheap, universal, must always
apply. Two lines, not a skill.

**Write the decision record AS the decision is made, and record the reversals. → SKILL.**
A decision was ratified and reversed within the hour; the record is more useful for containing both.
Has a format, a set of questions, and a discipline. Long enough to want loading only when a decision
is actually being made.

**Ophiuchus is unnumbered and takes aether. → PROJECT CLAUDE.md.**
Fails transferability outright. Not a candidate, and correctly so.
