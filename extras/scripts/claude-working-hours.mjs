// Claude working hours, from Claude Code session logs (written 24 Oct 2026; see "Claude working
// hours" in ~/.claude/CLAUDE.md): from
// each message that starts Claude working (the user's message, or a background task finishing) to
// Claude's last entry (reply or tool result) before the next such message. The user's reading and
// typing time between replies is left out. Inside a reply, a silence longer than the cap is
// treated as waiting on the user (a permission prompt), not work. Sessions are merged so overlaps
// count once. Helpers (subagents) running in parallel are reported separately, not added.
// Usage: node claude-working-hours.mjs <cap minutes> <log.jsonl> [...] [-- <helper log dir> ...]
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const [capArg, ...rest] = process.argv.slice(2);
const cap = Number(capArg) * 60000;
const split = rest.indexOf("--");
const logs = split === -1 ? rest : rest.slice(0, split);
const helperDirs = split === -1 ? [] : rest.slice(split + 1);
const day = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

function entries(path) {
  const out = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    const ms = Date.parse(e.timestamp ?? "");
    if (Number.isNaN(ms) || !e.message) continue;
    const content = e.message.content;
    const toolResult = Array.isArray(content) && content.some((c) => c?.type === "tool_result");
    if (e.type === "user" && !toolResult) out.push({ ms, start: true });
    else if (e.type === "assistant" || toolResult) out.push({ ms, start: false });
  }
  return out;
}

// Working intervals: each start, then Claude's entries up to the next start, with long silences cut.
function working(list) {
  list.sort((a, b) => a.ms - b.ms);
  const spans = [];
  let last = null;
  for (const e of list) {
    if (e.start) { last = e.ms; continue; }
    if (last !== null && e.ms - last <= cap) spans.push([last, e.ms]);
    last = e.ms;
  }
  return spans;
}

function total(spans) {
  spans.sort((a, b) => a[0] - b[0]);
  const perDay = new Map();
  let sum = 0, end = -Infinity;
  for (let [a, b] of spans) {
    if (b <= end) continue;
    if (a < end) a = end;
    sum += b - a;
    perDay.set(day(b), (perDay.get(day(b)) ?? 0) + (b - a));
    end = b;
  }
  return { sum, perDay };
}

const hours = (ms) => (ms / 3600000).toFixed(1);
const main = total(logs.flatMap((p) => working(entries(p))));
console.log(`Claude working (silences over ${capArg} min inside a reply left out): ${hours(main.sum)} h`);
for (const [d, ms] of main.perDay) console.log(`  ${d}: ${hours(ms)} h`);

let helperSum = 0, helperCount = 0;
for (const dir of helperDirs) {
  if (!existsSync(dir)) continue;
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".jsonl") ? [p] : []; });
  for (const file of walk(dir)) {
    const list = entries(file).map((e) => ({ ...e, start: false }));
    list.sort((a, b) => a.ms - b.ms);
    const spans = [];
    for (let i = 1; i < list.length; i++) if (list[i].ms - list[i - 1].ms <= cap) spans.push([list[i - 1].ms, list[i].ms]);
    helperSum += total(spans).sum;
    helperCount++;
  }
}
if (helperDirs.length) console.log(`Helpers (subagents), ${helperCount} logs, run in parallel and not included above: ${hours(helperSum)} h of their own time`);
