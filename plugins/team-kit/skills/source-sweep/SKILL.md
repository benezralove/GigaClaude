---
name: source-sweep
description: >
  Research N subjects against M shared sources by iterating the SOURCES, not the
  subjects. Roughly 5x cheaper than the obvious shape and produces better results,
  because reading one source across all subjects surfaces cross-references that
  per-subject passes structurally cannot see. Use when planning any multi-subject
  research: competitor analysis, literature review, auditing many files against a
  standard, or profiling a set of entities against the same data sources.
  Trigger: /source-sweep, "how should I structure this research", or when about to
  fan out agents over subjects.
---

# Source Sweep

**The pattern: when you have N subjects and M sources that apply to all of them, iterate the
SOURCES, not the subjects.**

The obvious shape is one agent per subject, each fetching what it needs. That refetches the same M
sources N times. Inverting it costs about a fifth as much and is better work.

## The test for whether this applies

**Are the sources shared across subjects?** That is the whole question.

- **Shared** (13 constellations against 13 classical texts; 8 competitors against the same 6 data
  sources; 20 files against 5 coding standards) → **sweep by source.**
- **Not shared** (each subject has its own unique documentation, its own repo, its own interview) →
  **the obvious per-subject shape is correct.** Do not force this.
- **Partly shared** → sweep the shared ones, then a short per-subject pass for the remainder.

**Rough break-even: it pays from about 3 subjects and 3 sources upward.** Below that the
coordination overhead is not worth it.

## Why it is cheaper

Each agent pays a fixed cost to reach and read a source. Per-subject, that cost is paid N times per
source. Per-source, once.

**Measured on a real run:** 13 subjects against 13 shared texts. The per-subject shape had been
running at roughly 5 agents per subject just for retrieval, about 180,000 tokens each. Estimated at
roughly 9M tokens. The per-source shape came out at about 1.8M. **Same coverage, about a fifth of the
cost.**

## Why it is BETTER, which matters more than the cost

**A per-subject pass cannot see across subjects. It is structurally blind to the comparison.**

Real example: an agent researching one constellation found, in a source it had opened for a
different reason, that the same author describes the relationship from the opposite side elsewhere in
the same book. **A per-subject read would have missed it every time**, because nothing would have
prompted looking from the other side.

Reading one source across all subjects also surfaces:

- **The author's own inconsistencies**, visible only when you see all their statements together.
- **Where a subject is conspicuously ABSENT**, which per-subject reads record as a blank and cannot
  distinguish from "not looked for".
- **Relative weight.** Which subjects the source treats at length and which get a line.

## The shape

**1. Build the matrix scaffold FIRST**, before any agent runs. One section per subject, one row per
source, with fixed columns. Fixed shape means agents write into it rather than inventing their own
format, and the results are comparable.

Columns that earn their place: **what it says**, **exact locator** (book, section, page, line),
**URL actually retrieved**, **short quote or PARAPHRASE marker**, and a **confidence or status tag**.

**2. One agent per source, all subjects.** Hand each agent the full subject list and the scaffold
shape.

**3. Then the per-subject work**, drawing on the completed matrix. The expensive retrieval is done
once and everything downstream reads from the file.

## The rules that must ride along

These are not optional decoration. Each exists because it was violated.

- **Silence is a finding, and must be recorded as one.** If a source says nothing about a subject,
  the agent writes "checked, nothing there" and not a blank. **The difference between "not researched"
  and "researched, nothing found" is a large part of the file's value**, and a blank destroys it.
- **A subagent report is a claim, not a source.** Require a locator and a URL that was actually
  retrieved. **"COULD NOT REACH" is a good answer and must be recorded**; an invented citation is a
  catastrophic one. This has happened: an agent fabricated page numbers and manuscript sigla for
  texts it never opened, and it was committed before it retracted itself.
- **Record retrieval failures in the scaffold**, with what was tried. The next run should not
  rediscover that a particular host blocks plain fetches.
- **Mark each cell as directly attested, inferred, or from a modern secondary source.** Collapsing
  those three is how a secondary claim gets laundered into a primary one.

## When NOT to use it

- **Fewer than about 3 subjects or 3 sources.** Overhead exceeds the saving.
- **Sources genuinely not shared.** Forcing it creates agents that read a source to answer questions
  it has nothing to say about.
- **When you only care about one subject.** Sweeping 13 sources for 1 subject is the same cost as
  the direct approach with more moving parts.
- **When the sources are cheap and tiny.** The saving is in retrieval and reading cost; if a source
  is three paragraphs, none of this matters.

## The one-line version

**Whenever you are about to fan out agents over the thing you care about, check whether the thing
they will all read is the same. If it is, fan out over that instead.**
