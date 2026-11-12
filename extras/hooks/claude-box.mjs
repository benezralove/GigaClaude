// SessionStart hook: make the Claude box load on every website's local preview (Ben, 11 Nov 2026).
// If the session's folder is a Next.js site, it gives the site a listener port (from the shared registry, assigning
// the next free one from 4792 for a new site), checks whether the Claude box is set up and up to date, and tells the
// session what to do: set it up from the kit if missing, recopy if the master changed, and run the listener
// whenever a preview is running. Prints nothing for folders that aren't Next.js sites. Never fails the session.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOME = os.homedir();
const SWITCHER = path.join(HOME, ".claude", "scripts", "switcher");
const REGISTRY = process.env.CLAUDE_BOX_REGISTRY || path.join(SWITCHER, "ports.json");
const KIT = path.join(SWITCHER, "kit", "README.md").replace(/\\/g, "/");
const FIRST_FREE = 4792;

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

// The nearest folder at or above cwd with a package.json that depends on next.
function findSite(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const p = JSON.parse(fs.readFileSync(pkg, "utf8"));
        const deps = { ...p.dependencies, ...p.devDependencies };
        if (deps.next) return { dir, tailwind: Boolean(deps.tailwindcss) };
      } catch {
        /* unreadable package.json: keep looking */
      }
      return null; // a non-Next package: not a website we set up
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

function portFor(name) {
  let reg = {};
  try {
    reg = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  } catch {
    /* missing or bad: start fresh */
  }
  if (Number.isInteger(reg[name])) return reg[name];
  const used = new Set(Object.values(reg).filter(Number.isInteger));
  let port = FIRST_FREE;
  while (used.has(port)) port++;
  reg[name] = port;
  try {
    fs.writeFileSync(REGISTRY, JSON.stringify(reg, null, 2) + "\n");
  } catch {
    /* read-only: the port is still reported, just not saved */
  }
  return port;
}

const same = (a, b) => {
  try {
    return fs.readFileSync(a, "utf8").replace(/\r\n/g, "\n") === fs.readFileSync(b, "utf8").replace(/\r\n/g, "\n");
  } catch {
    return false;
  }
};

function main() {
  const input = readStdin();
  const site = findSite(input.cwd || process.cwd());
  if (!site) return;
  const name = path.basename(site.dir);
  const port = portFor(name);
  const devDir = ["src/components/dev", "components/dev"].map((d) => path.join(site.dir, d)).find((d) => fs.existsSync(d));
  const boxCopy = devDir && path.join(devDir, "SendToClaude.tsx");
  const hasBox = Boolean(boxCopy && fs.existsSync(boxCopy));
  const mounted = hasBox && fs.existsSync(path.join(devDir, "DevTools.tsx"));
  const stale = [];
  if (hasBox && !same(boxCopy, path.join(SWITCHER, "SendToClaude.tsx"))) stale.push("SendToClaude.tsx");
  const swCopy = devDir && path.join(devDir, "Switcher.tsx");
  if (swCopy && fs.existsSync(swCopy) && !same(swCopy, path.join(SWITCHER, "Switcher.tsx"))) stale.push("Switcher.tsx");

  const lines = [
    `CLAUDE BOX (from the session-start hook): this folder is a website (Next.js, "${name}"). Its Claude box listener port is ${port} (registry: ~/.claude/scripts/switcher/ports.json; use this port, never pick one).`,
  ];
  if (!mounted) {
    lines.push(
      `The Claude box is ${hasBox ? "copied but not mounted" : "not set up yet"} here. The user wants it on every site's preview: when you first start or use a preview of this site, set it up by following ${KIT} (site ${site.tailwind ? "uses" : "does not use"} Tailwind), as its own small dev-only commit, and tell the user in one line. Don't push.`,
    );
  }
  if (stale.length) {
    lines.push(`The shared master has changed since it was copied here: recopy ${stale.join(" and ")} from ~/.claude/scripts/switcher/ unchanged, run the check gate, and commit.`);
  }
  lines.push(
    `Whenever a preview of this site is running, run \`node ~/.claude/scripts/switcher-listener.mjs ${port}\` as a Monitor with the maximum timeout and re-arm it each time it expires while you're working on the site; the user's messages then arrive as FEEDBACK lines and switcher picks as SWITCHER PICK lines.`,
  );
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: lines.join("\n") } }),
  );
}

try {
  main();
} catch {
  /* never block a session */
}
