---
name: codex-copy
description: Delegate copywriting to OpenAI Codex (GPT-5) and integrate the result. Use when the user says "/codex-copy", "ask codex", "use codex", "get a codex draft", or wants a second-opinion or alternative draft of marketing/landing-page/ad/email copy from OpenAI's model.
---

# Codex copywriting delegate

Shell out to the locally installed, ChatGPT-authenticated Codex CLI for
copy drafts, then review and integrate the result yourself.

## How to call

Run via Bash (non-interactive, read-only sandbox — Codex must never edit
files; you apply the copy yourself):

```bash
codex exec --skip-git-repo-check -s read-only "PROMPT"
```

- The final message is printed at the end of stdout; ignore the token
  count line and any MCP/log noise above it.
- For long briefs, write the brief to a scratchpad file and use:
  `codex exec --skip-git-repo-check -s read-only "$(cat brief.md)"`
- Timeout: allow 120-300s.

## Prompt structure

Give Codex a real brief, not a bare instruction. Include:
1. Who the audience is and what the page/ad is for.
2. The product facts it may use (ONLY verified facts — pass them in;
   tell it explicitly not to invent statistics, claims, or features).
3. Voice constraints: Australian English, plain words, no hype,
   no em dashes in email copy.
4. The exact deliverable (headline options, section copy, subject
   lines) and desired length.

## After the reply

- You own quality control: strip any invented claims/numbers, check
  facts against the codebase, and fit the copy to the existing layout.
- Never let Codex output land in the repo unreviewed.
- If comparing drafts, present the user your recommendation, not a menu.
