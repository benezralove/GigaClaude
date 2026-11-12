# Claude box setup kit (every website, dev only)

The Claude box is the round Claude mark that sits on a site's local preview. The user clicks it (or presses Ctrl + .), pastes
screenshots and notes, and they arrive in the Claude session working on that site. Its "Latest from Claude" panel
shows that session's replies. The session-start hook (`~/.claude/hooks/claude-box.mjs`) tells each website session its
port and whether this setup is needed.

## Adding it to a site (Next.js, app router)

1. **Port:** use the port the hook gave you (it is also in `~/.claude/scripts/switcher/ports.json`, keyed by the
   project folder name). Never pick one by hand.
2. **Copy the master unchanged:** `~/.claude/scripts/switcher/SendToClaude.tsx` to `src/components/dev/SendToClaude.tsx`
   (use `components/dev/` if the project has no `src/`). Never edit the copy; fixes go in the master, then recopy.
3. **Copy the wrapper:** `kit/DevTools.tsx` to the same folder and replace `__PORT__` with the port.
   - **Site uses Tailwind** (tailwindcss in package.json): delete the `import "./dev-tools.css"` line. Check that
     Tailwind scans the dev folder (v4 does by default; v3 needs it in `content`).
   - **Site doesn't use Tailwind:** copy `kit/dev-tools.css` beside it, add `postcss.config.mjs` with
     `{ plugins: { "@tailwindcss/postcss": {} } }`, and install `tailwindcss` and `@tailwindcss/postcss` as exact
     devDependencies (one site uses 4.2.1). That CSS has no site-wide reset, so the site looks the same in dev as built.
4. **Mount it in the root layout, imported only in development,** so the built site carries none of its code or CSS:
   ```tsx
   export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
     const DevTools =
       process.env.NODE_ENV === "development" ? (await import("@/components/dev/DevTools")).default : null;
     return (
       <html lang="en-AU">
         <body>
           {children}
           {DevTools && <DevTools />}
         </body>
       </html>
     );
   }
   ```
   A plain static import plus `{process.env.NODE_ENV === "development" && <DevTools />}` is NOT enough: the import still
   ships the code and CSS (found on one site, 11 Nov 2026). Pages router: do the same in `pages/_app.tsx` with
   `next/dynamic` and `{ ssr: false }` behind the same check.
5. **Lint:** add `src/components/dev/SendToClaude.tsx` (and `Switcher.tsx` when present) to the ESLint ignores, since
   the copies are verbatim masters and may break a project's stricter rules.
6. **Check:** run the project's check gate; then `next build` and confirm the built output has no "send-to-claude"
   text (`grep -rl send-to-claude .next/static .next/server` finds nothing outside `.map` files) and the built CSS is
   unchanged.
7. **Record it** in the project's CLAUDE.md under what's temporary: the Claude box, its port, the files, dev only.
   Commit it on its own ("Add the dev-only Claude box (port N)"). Never push without being asked.

## Running the listener

Whenever a preview of the site is running (dev server started, or the user is looking at the site), run this as a Monitor
with the maximum timeout, and re-arm it every time it expires for as long as the session works on the site:

    node ~/.claude/scripts/switcher-listener.mjs <port>

It finds the session's own log from `CLAUDE_CODE_SESSION_ID`, so the Claude box's "Latest from Claude" panel shows this
session's replies. Messages arrive as "FEEDBACK" lines (images saved to `~/.claude/inbox/`, open them with Read) and
switcher picks as "SWITCHER PICK" lines. If a restart fails with EADDRINUSE, the old listener is still closing: wait a
few seconds and start it again. If another session owns the port, don't kill it; tell the user.
