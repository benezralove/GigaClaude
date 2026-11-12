// Claude inbox listener. Run it as a Claude Code Monitor command:
//   node ~/.claude/scripts/switcher-listener.mjs [port]
// Two senders POST JSON here, and each message is printed as one stdout line,
// which the Monitor delivers into the Claude session that started it:
//   - a dev-only switcher's "Use this one" button: { switcher, option, label, page, note, images?: [dataURL] }
//   - the dev-only "Send to Claude" box: { kind: "feedback", text, page, images: [dataURL] }
//     Pasted images are saved to ~/.claude/inbox/ and their paths printed, so
//     Claude can open them with Read.
//   - GET /replies: the Claude box's "Latest from Claude" panel reads the starting session's latest replies.
// Only pages on this computer (localhost, 127.0.0.1, *.localhost) are answered.
// Default port 4789, localhost only.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const port = Number(process.argv[2] || 4789);
const INBOX = path.join(os.homedir(), ".claude", "inbox");
const MAX = 40 * 1024 * 1024;
const DATA_URL = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/;

const one = (s) => String(s ?? "").replace(/[\r\n]+/g, " / ").trim();

// Only pages served from this computer may talk to the listener (11 Nov 2026). Any website open in the browser can
// reach 127.0.0.1, so without this a stranger's page could read the session's replies or post fake picks into it.
// Requests with no Origin (curl, scripts on this machine) are allowed.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|[a-z0-9-]+\.localhost)(:\d+)?$/i;

// The session that started this listener (Claude Code puts its id in the environment), so the Claude box can show
// that session's latest replies: GET /replies. Only the end of the log is read; logs grow to hundreds of MB.
const SESSION_ID = process.env.CLAUDE_CODE_SESSION_ID || "";
const PROJECTS = path.join(os.homedir(), ".claude", "projects");
const TAIL = 4 * 1024 * 1024;
let logPath = "";
function findLog() {
  if (logPath && fs.existsSync(logPath)) return logPath;
  logPath = "";
  if (!SESSION_ID) return "";
  for (const dir of fs.readdirSync(PROJECTS, { withFileTypes: true })) {
    const f = path.join(PROJECTS, dir.name, `${SESSION_ID}.jsonl`);
    if (dir.isDirectory() && fs.existsSync(f)) return (logPath = f);
  }
  return "";
}
function latestReplies(max = 8) {
  const f = findLog();
  if (!f) return { found: false, items: [], working: false };
  const size = fs.statSync(f).size;
  const start = Math.max(0, size - TAIL);
  const fd = fs.openSync(f, "r");
  const buf = Buffer.alloc(size - start);
  fs.readSync(fd, buf, 0, buf.length, start);
  fs.closeSync(fd);
  const lines = buf.toString("utf8").split("\n");
  if (start > 0) lines.shift(); // first line is cut off
  const items = [];
  let last = null; // the latest main-conversation event, to tell whether Claude is mid-turn
  for (const line of lines) {
    if (!line) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (o.isSidechain || (o.type !== "assistant" && o.type !== "user")) continue;
    const content = o.message?.content;
    if (o.type === "user") {
      last = { kind: typeof content === "string" ? "prompt" : "result" };
      continue;
    }
    for (const c of Array.isArray(content) ? content : []) {
      if (c.type === "text" && c.text?.trim()) {
        items.push({ at: o.timestamp, text: c.text.slice(0, 6000) });
        last = { kind: "text" };
      } else if (c.type === "tool_use") {
        last = { kind: "tool", tool: c.name };
      } else if (c.type === "thinking") {
        last = { kind: "thinking" };
      }
    }
  }
  return {
    found: true,
    items: items.slice(-max),
    working: Boolean(last && last.kind !== "text"),
    tool: last?.kind === "tool" ? last.tool : undefined,
  };
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && !LOCAL_ORIGIN.test(origin)) {
    res.statusCode = 403;
    return res.end();
  }
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();
  if (req.method === "GET" && req.url?.startsWith("/replies")) {
    try {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      return res.end(JSON.stringify(latestReplies()));
    } catch {
      res.statusCode = 500;
      return res.end("{}");
    }
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end();
  }
  const chunks = [];
  let size = 0;
  req.on("data", (c) => {
    size += c.length;
    if (size > MAX) req.destroy();
    else chunks.push(c);
  });
  req.on("end", () => {
    try {
      const p = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      // Both senders can attach pasted screenshots (the switcher's note box since 11 Nov 2026).
      const saved = [];
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      (p.images || []).slice(0, 10).forEach((url, i) => {
        const m = String(url).match(DATA_URL);
        if (!m) return;
        fs.mkdirSync(INBOX, { recursive: true });
        const file = path.join(INBOX, `${stamp}-${i + 1}.${m[1] === "jpeg" ? "jpg" : m[1]}`);
        fs.writeFileSync(file, Buffer.from(m[2], "base64"));
        saved.push(file.replace(/\\/g, "/"));
      });
      const imgs = saved.length ? ` [images: ${saved.join(", ")}]` : "";
      if (p.kind === "feedback") {
        console.log(`FEEDBACK from ${one(p.page) || "a page"}: ${one(p.text) || "(no text)"}` + imgs);
      } else {
        console.log(
          `SWITCHER PICK: "${one(p.switcher)}" option ${p.option}. ${one(p.label)}` +
            (p.page ? ` (page ${one(p.page)})` : "") +
            (p.note ? ` Note: ${one(p.note)}` : "") +
            imgs,
        );
      }
      res.end("ok");
    } catch {
      res.statusCode = 400;
      res.end("bad json");
    }
  });
});

// A Monitor expires after 30 minutes but can leave this process running,
// holding the port with nobody reading its output. Exit just before that, so
// the next re-arm can take the port. (Found 11 Nov 2026.)
setTimeout(() => process.exit(0), 29.5 * 60 * 1000).unref();

server.listen(port, "127.0.0.1", () => {
  console.error(`claude inbox listener on http://127.0.0.1:${port}`);
});
