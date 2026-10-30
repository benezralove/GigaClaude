# GigaClaude

Ben Love's Claude Code setup: skills, plugins, hooks, a status line and a team version of the global `CLAUDE.md`.

## Install (about two minutes)

1. In Claude Code, add this repo as a plugin marketplace and install the plugins:

   ```
   /plugin marketplace add benezralove/GigaClaude
   /plugin install team-kit@gigaclaude
   /plugin install superpowers@gigaclaude
   /plugin install last30days@gigaclaude
   /plugin install twelvelabs@gigaclaude
   /plugin install security-guidance@gigaclaude
   /plugin install typescript-lsp@gigaclaude
   /plugin install rea@gigaclaude
   ```

   Or from a terminal, the same thing with `claude plugin marketplace add ...` and `claude plugin install ...`.

2. Copy [CLAUDE.md](CLAUDE.md) to `~/.claude/CLAUDE.md` (Windows: `C:\Users\<you>\.claude\CLAUDE.md`). If you already have one, merge the sections you want rather than overwriting.

3. Optional status line (shows model, current task, folder and how full the context is): copy [extras/statusline/gsd-statusline.js](extras/statusline/gsd-statusline.js) to `~/.claude/hooks/gsd-statusline.js`, then add this to `~/.claude/settings.json`:

   ```json
   "statusLine": { "type": "command", "command": "node ~/.claude/hooks/gsd-statusline.js" }
   ```

   On Windows use the full path, e.g. `node C:/Users/<you>/.claude/hooks/gsd-statusline.js`. Needs Node.js.

4. Copy [extras/scripts/claude-working-hours.mjs](extras/scripts/claude-working-hours.mjs) to `~/.claude/scripts/claude-working-hours.mjs`. The "Claude working hours" rule in CLAUDE.md runs it when you ask how long Claude spent on something. Needs Node.js.

5. Restart Claude Code.

To get updates later: `/plugin marketplace update gigaclaude`, then `/plugin update team-kit@gigaclaude` (and the same for any other plugin). CLAUDE.md and the files in `extras/` don't update through plugins: fetch them again from this repo when they change.

Skills from a plugin are namespaced, so `/council` may show as `/team-kit:council`. Either form works when you ask for it by name.

## What each plugin is

| Plugin | What it does | Source |
|---|---|---|
| team-kit | The skills listed below, plus the Playwright browser tool | this repo |
| superpowers | Process skills: brainstorming, planning, TDD, debugging, code review | https://github.com/obra/superpowers |
| last30days | Research what people said about a topic recently | https://github.com/mvanhorn/last30days-skill |
| twelvelabs | Video search and analysis | https://github.com/twelvelabs-io/twelve-labs-claude-code-plugin |
| security-guidance | Warns about security mistakes while Claude edits code | Anthropic, copied into `plugins/` |
| typescript-lsp | Lets Claude navigate TypeScript/JavaScript code like an editor | Anthropic, copied into `plugins/` |
| rea | Reverse engineering with agents: decompile native binaries, inspect Electron/JavaScript apps, Android apps, firmware and model files (a skill plus an MCP server with 229 tools). Lawful use only, see its [DISCLAIMER](https://github.com/morluto/rea/blob/main/DISCLAIMER.md) | https://github.com/morluto/rea (npm package `rea-agents`, pinned to 6.8.0) |

## Tools some plugins and skills need

| Skill | Needs |
|---|---|
| Playwright (in team-kit) | Node.js (runs via `npx`; first use downloads it) |
| typescript-lsp | `npm install -g typescript-language-server typescript` |
| twelvelabs | A TwelveLabs API key (see its README) |
| last30days | Optional API keys for more sources (see its README) |
| rea | Node.js (it asks for 22.23.4+, 24.22.1+ or 26.12.1+; it also ran on 24.15.0 in testing). Decompiling native binaries needs Ghidra, IDA or Hopper (Hopper isn't on Windows; see its README). The first start downloads its dependencies through `npx`, which takes about 15 seconds. |
| graphify | `uv tool install graphifyy` (or `pip install graphifyy`) |
| transcribe | [uv](https://docs.astral.sh/uv/) and ffmpeg |
| youtube | `yt-dlp` |
| codex-copy | OpenAI Codex CLI, signed in |
| everything-search | Windows + [Everything](https://www.voidtools.com/) |
| web-perf | Chrome DevTools MCP server |
| scroll-world | Higgsfield MCP connector |
| Cloudflare skills, turnstile-spin, wrangler, cf-cli | A Cloudflare account; `wrangler` (and optionally the `cf` CLI) per project |

Skills whose tools you don't have simply won't work; they don't affect anything else.

## What's in it

Written in-house: council, decision-record, source-sweep, skill-harvest, verify-loop, transcribe, youtube, codex-copy, everything-search, grilling, grill-me, scroll-world.

Third-party, copied in unmodified under their own licences (MIT / Apache-2.0); check the sources for newer versions. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md):

- ponytail family: https://github.com/DietrichGebert/ponytail
- impeccable: https://github.com/pbakaus/impeccable
- Cloudflare skills (cloudflare, agents-sdk, durable-objects, workers-best-practices, wrangler, sandbox-sdk, cloudflare-email-service, cloudflare-one, cloudflare-one-migrations, turnstile-spin, web-perf, basin, cf-cli, gateway-workers, k2, nextjs-on-cloudflare, sandbox-stable, sandbox-next, sandbox-migrate-to-next, workers-profiling): https://github.com/cloudflare/skills
- graphify: https://github.com/safishamsi/graphify

## Hooks (run automatically once team-kit is installed)

| Hook | When | What it does |
|---|---|---|
| context-warn | Every message you send | If the context window is over 85% full, Claude tells you in one line. Stays quiet straight after a compact, until there's a fresh reading. Change the threshold with the `CLAUDE_CONTEXT_WARN_PCT` env var. |
| graphify-refresh | Session start | If the repo has a `graphify-out/` graph older than the latest commit, rebuilds it in the background. Does nothing without graphify. |
| everything-ensure | Session start | Windows only: starts the Everything search client so the everything-search skill works. Does nothing if Everything isn't installed. |
| impeccable design checks | After Claude edits a file, and at the end of each reply | Runs impeccable's design-rule checks on UI files and reports problems to Claude. |

All of them fail silently: if a tool they need is missing, they skip rather than error. Node.js is needed for context-warn and the design checks.

## Status line

`extras/statusline/gsd-statusline.js` comes from [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done), MIT licence. Only the status line script is included, not the rest of GSD. The status line is set in your own `settings.json`, which is why it is a manual step.

## Updating the kit (for Ben Love)

Edit or add skills under `plugins/team-kit/skills/`, bump `version` in `plugins/team-kit/.claude-plugin/plugin.json`, commit and push.

rea is pinned: when it releases a new version, change `6.8.0` in its entry in `.claude-plugin/marketplace.json` (three places: the npm source, `version`, and the `npx` argument). The entry declares rea's MCP server itself because rea's npm package doesn't, and it runs the server through `npx` because plugin installs from npm don't include the package's dependencies. rea's own marketplace (`morluto/rea`) can't be added on Windows: one of its submodules contains a file name Windows doesn't allow.
