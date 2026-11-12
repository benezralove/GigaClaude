// Dev-only tools, mounted in the root layout only in development (global switcher rule, ~/.claude/CLAUDE.md).
// The Claude box sends pasted screenshots and notes to this project's listener port (recorded in CLAUDE.md and in
// ~/.claude/scripts/switcher/ports.json). Copied from ~/.claude/scripts/switcher/kit/DevTools.tsx.
// Sites WITHOUT Tailwind: keep the next line and copy kit/dev-tools.css beside this file. Sites WITH Tailwind: delete it.
import "./dev-tools.css";
import { SendToClaude } from "./SendToClaude";

export const CLAUDE_BOX_PORT = __PORT__;

export default function DevTools() {
  return <SendToClaude port={CLAUDE_BOX_PORT} />;
}
