# GigaClaude

Jaz's Claude Code skills, packaged as a plugin, plus a team version of the global `CLAUDE.md`.

## Install (about two minutes)

1. In Claude Code, add this repo as a plugin marketplace and install the plugin:

   ```
   /plugin marketplace add benezralove/GigaClaude
   /plugin install team-kit@gigaclaude
   ```

2. Copy [CLAUDE.md](CLAUDE.md) to `~/.claude/CLAUDE.md` (Windows: `C:\Users\<you>\.claude\CLAUDE.md`). If you already have one, merge the sections you want rather than overwriting.

3. Restart Claude Code.

To get updates later: `/plugin marketplace update gigaclaude`.

Skills from a plugin are namespaced, so `/council` may show as `/team-kit:council`. Either form works when you ask for it by name.

## Plugins this kit expects (install separately)

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
/plugin marketplace add mvanhorn/last30days-skill
/plugin install last30days@last30days-skill
```

## Tools some skills need

| Skill | Needs |
|---|---|
| graphify | `uv tool install graphifyy` (or `pip install graphifyy`) |
| transcribe | [uv](https://docs.astral.sh/uv/) and ffmpeg |
| youtube | `yt-dlp` |
| codex-copy | OpenAI Codex CLI, signed in |
| everything-search | Windows + [Everything](https://www.voidtools.com/) |
| web-perf | Chrome DevTools MCP server |
| scroll-world | Higgsfield MCP connector |
| Cloudflare skills, turnstile-spin, wrangler | A Cloudflare account; `wrangler` per project |

Skills whose tools you don't have simply won't work; they don't affect anything else.

## What's in it

Written in-house: council, decision-record, source-sweep, skill-harvest, verify-loop, transcribe, youtube, codex-copy, everything-search, grilling, grill-me, scroll-world.

Third-party, copied in unmodified under their own licences (MIT / Apache-2.0); check the sources for newer versions. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md):

- ponytail family: https://github.com/DietrichGebert/ponytail
- impeccable: https://github.com/pbakaus/impeccable
- Cloudflare skills (cloudflare, agents-sdk, durable-objects, workers-best-practices, wrangler, sandbox-sdk, cloudflare-email-service, cloudflare-one, cloudflare-one-migrations, turnstile-spin, web-perf): https://github.com/cloudflare/skills
- graphify: https://github.com/safishamsi/graphify

## Updating the kit (for Jaz)

Edit or add skills under `plugins/team-kit/skills/`, bump `version` in `plugins/team-kit/.claude-plugin/plugin.json`, commit and push.
