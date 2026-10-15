// UserPromptSubmit hook: warn when context usage has crossed a threshold.
// Prints one line that Claude Code injects into the model's context; prints nothing
// when under the threshold. Local file reads only, no model calls.
//
// Source of truth, in order:
//   1. The bridge file gsd-statusline.js writes (%TEMP%/claude-ctx-<session>.json),
//      which carries Claude Code's own used percentage. Used when fresh (< 10 min).
//   2. The session transcript: the last assistant message's token usage divided by
//      an assumed window size. Set CLAUDE_CONTEXT_WINDOW (tokens) in settings "env"
//      if the default is wrong for your model.
// Threshold: CLAUDE_CONTEXT_WARN_PCT, default 85.
const fs = require("fs");
const os = require("os");
const path = require("path");

const WINDOW = Number(process.env.CLAUDE_CONTEXT_WINDOW) || 1000000;
const PCT = Number(process.env.CLAUDE_CONTEXT_WARN_PCT) || 85;

let hook = {};
try { hook = JSON.parse(fs.readFileSync(0, "utf8")); } catch { process.exit(0); }

let pct = null;
let detail = "";

// 1. Bridge file from the status line.
const sid = hook.session_id;
if (sid && !/[/\\]|\.\./.test(sid)) {
  try {
    const b = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), `claude-ctx-${sid}.json`), "utf8"));
    if (typeof b.used_pct === "number" && Date.now() / 1000 - (b.timestamp || 0) < 600) {
      pct = b.used_pct;
      detail = "per Claude Code's own meter";
    }
  } catch { /* no bridge file */ }
}

// 2. Transcript fallback.
if (pct === null && hook.transcript_path && fs.existsSync(hook.transcript_path)) {
  const p = hook.transcript_path;
  const size = fs.statSync(p).size;
  const len = Math.min(size, 512 * 1024);
  const buf = Buffer.alloc(len);
  const fd = fs.openSync(p, "r");
  fs.readSync(fd, buf, 0, len, size - len);
  fs.closeSync(fd);
  const lines = buf.toString("utf8").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const rec = JSON.parse(line);
      const u = rec.type === "assistant" && rec.message && rec.message.usage;
      if (u) {
        const used = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
        // Per platform.claude.com/docs/en/models/overview (Sept 2026): Claude 5 models are 1M, Haiku 4.5 is 200k.
        const win = process.env.CLAUDE_CONTEXT_WINDOW ? WINDOW : (/haiku/i.test(rec.message.model || "") ? 200000 : WINDOW);
        pct = Math.round((used / win) * 100);
        detail = `${Math.round(used / 1000)}k of an assumed ${Math.round(win / 1000)}k window`;
        break;
      }
    } catch { /* partial line */ }
  }
}

if (pct === null || pct < PCT) process.exit(0);
console.log(`CONTEXT WARNING: context window was ${pct}% full (${detail}) after the previous reply. Tell the user this in one line at the top of your reply.`);
