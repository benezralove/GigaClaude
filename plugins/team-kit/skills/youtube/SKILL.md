---
name: youtube
description: Analyse a YouTube video from a link. Use whenever the user pastes a YouTube URL (youtube.com / youtu.be / shorts) and wants a summary, transcript, quotes, timestamps, fact-check of what's said, or analysis of the content. Fetches metadata + captions via yt-dlp; escalates to TwelveLabs only for visual questions.
---

# YouTube video analysis

Given a YouTube link, answer the user's question about the video. Transcript-first: captions answer almost everything; only download the video for genuinely visual questions.

## Step 1 — metadata + captions (default path)

Work in the scratchpad dir. `yt-dlp` is installed globally on this machine. **Always pass `--js-runtimes node`** — without it YouTube extraction silently degrades and captions fail to download (verified 2026-07: no runtime → no VTT written; with node → works). Also pass `--remote-components ejs:github` — some videos need yt-dlp's challenge-solver script or subtitles silently fail (verified 2026-07). Auto-caption VTTs duplicate every line; dedupe before reading (see cleanup one-liner below).

```
yt-dlp --js-runtimes node --remote-components ejs:github --skip-download --write-auto-subs --write-subs --sub-langs "en,en-orig" --sub-format vtt --print "%(title)s | %(channel)s | %(duration_string)s | %(upload_date)s | %(view_count)s views" -o "<scratchpad>/yt" "<URL>"
```

- This prints one metadata line and writes caption file(s) like `yt.en.vtt` (`--write-subs` grabs manual subs, `--write-auto-subs` grabs auto as fallback).
- Keep `--sub-langs` narrow (`en,en-orig`) — globs like `en.*` also fetch auto-TRANSLATED variants and trigger HTTP 429 rate limits.
- If the user wants the description too, add `--print "%(description)s"`.
- Read the `.vtt` file. Strip cue timestamps/dedupe repeated auto-caption lines mentally when quoting; **keep timestamps when the user asks "when does he say X"** (VTT cue times are the answer — report as `mm:ss`).
- Long videos produce big VTT files — Read in chunks or Grep for keywords rather than loading 2MB into context.

## Failure modes

- **No English captions**: rerun with `--list-subs` to see what exists; offer the original-language transcript, or fall back to Step 2 + TwelveLabs (which transcribes audio itself).
- **yt-dlp errors (age-gate, region, throttle)**: try once with `--extractor-args "youtube:player_client=default,-tv"`. If still blocked, report it plainly; don't loop.
- **Members-only/private**: can't fetch; say so.

## Step 2 — visual analysis (only when asked about what's ON SCREEN)

Escalate only for questions captions can't answer (what's shown, editing style, products/faces on screen, b-roll, charts in the video):

1. Download smallest useful file: `yt-dlp --js-runtimes node --remote-components ejs:github -f "bv*[height<=720]+ba/b[height<=720]" -o "<scratchpad>/yt-video.%(ext)s" "<URL>"`
2. Use the TwelveLabs skills (`twelvelabs:sync-analyze` or `twelvelabs:async-analyze` — they accept a local file path and auto-upload). Videos over ~1 hour must use async-analyze.
3. Delete the downloaded file after analysis.

Don't download the video "just in case" — it's slow and usually unnecessary.

## Output

Answer the actual question, per the user's global answer format (lead with the direct answer, then dot points). For a plain "summarise this", give: one-line what-it-is, then the key points/claims with rough timestamps, then anything notable (sponsors, corrections, strong claims worth checking).
