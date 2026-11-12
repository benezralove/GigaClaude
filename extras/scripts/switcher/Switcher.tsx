"use client";

// Reusable dev-only switcher (Ben's standing rule in ~/.claude/CLAUDE.md).
// Copy this file into the project, then render one per thing being compared:
//
//   {process.env.NODE_ENV === "development" && (
//     <Switcher name="Closing band button" attr="cta" targetId="quote"
//       options={["As now", "Centred", ...]} css={CSS} />
//   )}
//
// `attr` sets data-<attr>="<index>" on <html>; write `css` against
// :root[data-<attr>="n"] selectors (option 0 = as built, so it needs none).
// Features: drag by the grip (and arrow keys), remembers position and pick per
// browser (?switchers=name reopens one closed box, ?switchers all of them), a minimise button shrinks it to a small square showing the picked
// option's number (click the square to open it again), X closes it and it stays closed on reload (per browser; add
// ?switchers to the address to bring every box back; Ben, 11 Nov 2026), a
// header button collapses the list to a
// dropdown, a note box (paste or drop screenshots into it, as in the Claude
// box), and "Use this one" POSTs the pick, note and images to
// ~/.claude/scripts/switcher-listener.mjs (run as a Monitor) on port 4789.
// Needs Tailwind; colours are literal hex so it works in any project.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Pos = { x: number; y: number };
const MARGIN = 8;
const COMPACT_KEY = "switcher-compact";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#8FC2C6]";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: just do not remember.
  }
}
function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Dictation through the browser's own speech recognition (Chrome and Edge;
// other browsers hide the mic). Appends what is heard to the text.
type Rec = { start(): void; stop(): void; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; continuous: boolean; interimResults: boolean; lang: string };
function useDictation(onText: (t: string) => void) {
  const rec = useRef<Rec | null>(null);
  const [on, setOn] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    setOk(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);
  const toggle = () => {
    if (on) {
      rec.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const R = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!R) return;
    const r = new R();
    r.continuous = true;
    r.interimResults = false;
    r.lang = navigator.language || "en-AU";
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onText(res[0].transcript.trim());
      }
    };
    r.onend = () => setOn(false);
    r.onerror = () => setOn(false);
    rec.current = r;
    r.start();
    setOn(true);
  };
  useEffect(() => () => rec.current?.stop(), []);
  return { on, ok, toggle };
}

function MicButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? "Stop dictation (Ctrl+D or Enter)" : "Dictate (Ctrl+D)"}
      title={on ? "Stop dictation (Ctrl+D or Enter)" : "Dictate (Ctrl+D)"}
      className={`absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full ${on ? "bg-[#D97757] text-[#232325]" : "bg-white/10 text-white/80 hover:text-[#F9F3E7]"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8FC2C6]`}
    >
      <svg aria-hidden width="12" height="16" viewBox="0 0 12 16" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3.5" y="1" width="5" height="9" rx="2.5" />
        <path d="M1 7.5a5 5 0 0 0 10 0M6 12.5V15" />
      </svg>
    </button>
  );
}

export function Switcher({
  name,
  attr,
  options,
  css = "",
  targetId: _targetId, // eslint-disable-line @typescript-eslint/no-unused-vars
  start = { left: 16, top: 132 },
  port = 4789,
}: {
  name: string;
  attr: string;
  options: string[];
  css?: string;
  /** Unused since 11 Nov 2026 (picking no longer scrolls the page); kept so existing callers still compile. */
  targetId?: string;
  start?: { left: number; top: number };
  /** The listener port; give each project its own so picks reach the right session. */
  port?: number;
}) {
  const POS_KEY = `switcher-pos-${attr}`;
  const PICK_KEY = `switcher-pick-${attr}`;
  const NOTE_KEY = `switcher-note-${attr}`;
  const CLOSED_KEY = `switcher-closed-${attr}`;
  const MIN_KEY = `switcher-min-${attr}`;
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const last = useRef<Pos | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [value, setValue] = useState(0);
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [compact, setCompact] = useState(false);
  // Minimised: the whole box shrinks to a small square showing the picked option's number, so the page can be
  // seen clearly; clicking the square opens the box again (Ben, 11 Nov 2026). Remembered per browser.
  const [min, setMin] = useState(false);
  const sqDrag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const minimise = (m: boolean) => {
    setMin(m);
    write(MIN_KEY, m ? "1" : "0");
    // Reopening where the square was left: keep the full box on screen.
    // (clamp is defined below; this only runs on a click, after it exists.)
    if (!m) setPos((p) => (p ? clamp(p) : p));
  };
  const [note, setNote] = useState("");
  const [sent, setSent] = useState("");
  // Screenshots pasted (Ctrl+V) or dropped into the note box, sent with the pick (Ben, 11 Nov 2026), as in the
  // Claude box. Kept for this visit only, not in storage (images are too big for it).
  const [images, setImages] = useState<string[]>([]);
  const addFiles = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    const urls = await Promise.all(imgs.map(toDataUrl));
    setImages((prev) => [...prev, ...urls].slice(0, 10));
  };
  const dictation = useDictation((t) =>
    setNote((prev) => {
      const next = prev ? `${prev.replace(/\s+$/, "")} ${t}` : t;
      write(NOTE_KEY, next);
      return next;
    }),
  );

  const apply = useCallback((n: number) => {
    document.documentElement.setAttribute(`data-${attr}`, String(n));
  }, [attr]);

  const clamp = useCallback((p: Pos): Pos => {
    const el = box.current;
    const w = el?.offsetWidth ?? 300;
    const h = el?.offsetHeight ?? 360;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    return {
      x: Math.round(Math.min(Math.max(MARGIN, p.x), Math.max(MARGIN, vw - w - MARGIN))),
      y: Math.round(Math.min(Math.max(MARGIN, p.y), Math.max(MARGIN, vh - h - MARGIN))),
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    // Closed stays closed; ?switchers in the address brings every box back.
    // ?switchers brings every closed box back; ?switchers=footer (or a comma list of names or attrs) brings back just
    // those. The parameter then removes itself from the address after a few seconds, so a reload doesn't reopen every
    // box again (Ben, 11 Nov 2026: a ?switchers link left in the tab reopened all of them on every reload).
    const params = new URLSearchParams(window.location.search);
    if (params.has("switchers")) {
      const want = (params.get("switchers") || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
      if (!want.length || want.includes(attr.toLowerCase()) || want.includes(name.toLowerCase())) write(CLOSED_KEY, "0");
      window.setTimeout(() => {
        const u = new URL(window.location.href);
        if (!u.searchParams.has("switchers")) return;
        u.searchParams.delete("switchers");
        window.history.replaceState(window.history.state, "", u.toString());
      }, 3000);
    }
    setOpen(read(CLOSED_KEY) !== "1");
    setMin(read(MIN_KEY) === "1");
    setCompact(read(COMPACT_KEY) === "1");
    setNote(read(NOTE_KEY) ?? "");
    const raw = read(PICK_KEY);
    const n = Number(raw);
    const first = raw !== null && Number.isInteger(n) && n >= 0 && n < options.length ? n : 0;
    setValue(first);
    apply(first);
    try {
      const saved = JSON.parse(read(POS_KEY) ?? "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") setPos(clamp(saved));
    } catch {
      // Bad saved value: start in the corner.
    }
    return () => document.documentElement.removeAttribute(`data-${attr}`);
  }, [apply, attr, name, clamp, options.length, CLOSED_KEY, MIN_KEY, NOTE_KEY, PICK_KEY, POS_KEY]);

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const save = (p: Pos) => write(POS_KEY, JSON.stringify(p));
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const next = clamp({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
    last.current = next;
    setPos(next);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (last.current) save(last.current);
  };
  const onGripKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 64 : 16;
    const delta: Record<string, Pos> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const d = delta[e.key];
    const rect = box.current?.getBoundingClientRect();
    if (!d || !rect) return;
    e.preventDefault();
    const next = clamp({ x: rect.left + d.x, y: rect.top + d.y });
    setPos(next);
    save(next);
  };

  const pick = (n: number) => {
    setValue(n);
    apply(n);
    write(PICK_KEY, String(n));
    // No scrolling on pick: the page stays where you are (Ben, 11 Nov 2026). targetId is kept so old callers compile.
  };

  const send = async () => {
    setSent("Sending...");
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          switcher: name,
          option: value + 1,
          label: options[value],
          page: window.location.pathname,
          note: note.trim() || undefined,
          images: images.length ? images : undefined,
        }),
      });
      const extras = [note.trim() ? "your note" : "", images.length ? `${images.length} image${images.length > 1 ? "s" : ""}` : ""].filter(Boolean).join(" and ");
      setSent(r.ok ? `Sent option ${value + 1}${extras ? ` with ${extras}` : ""} to Claude` : "Not sent: listener error");
      if (r.ok) setImages([]);
    } catch {
      setSent("Not sent: Claude isn't listening");
    }
  };

  const style = css ? <style>{css}</style> : null;
  if (!open || !mounted) return style;

  if (min) {
    // The square drags like the box (Ben, 11 Nov 2026): a press that moves more than a few pixels drags it, and the
    // box reopens wherever the square was left; a plain click opens the box.
    const sqDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.setPointerCapture(e.pointerId);
      sqDrag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, sx: e.clientX, sy: e.clientY, moved: false };
    };
    const sqMove = (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = sqDrag.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
      d.moved = true;
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const vh = document.documentElement.clientHeight || window.innerHeight;
      const next = {
        x: Math.round(Math.min(Math.max(MARGIN, e.clientX - d.dx), vw - 36 - MARGIN)),
        y: Math.round(Math.min(Math.max(MARGIN, e.clientY - d.dy), vh - 36 - MARGIN)),
      };
      last.current = next;
      setPos(next);
    };
    const sqUp = (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = sqDrag.current;
      sqDrag.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (d?.moved) {
        if (last.current) save(last.current);
      } else {
        minimise(false);
      }
    };
    return (
      <>
        {style}
        {createPortal(
          <button
            type="button"
            onPointerDown={sqDown}
            onPointerMove={sqMove}
            onPointerUp={sqUp}
            onPointerCancel={() => (sqDrag.current = null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                minimise(false);
              }
            }}
            aria-label={`Open the ${name} switcher (showing option ${value + 1})`}
            title={`${name}: option ${value + 1}. Click to open, drag to move.`}
            className={`fixed z-[70] grid h-9 w-9 cursor-grab touch-none select-none place-items-center active:cursor-grabbing border border-white/25 bg-[#232325] text-[13px] font-medium text-[#F9F3E7] shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:border-[#8FC2C6] ${FOCUS}`}
            style={pos ? { left: pos.x, top: pos.y } : start}
          >
            {value + 1}
          </button>,
          document.body,
        )}
      </>
    );
  }

  return (
    <>
      {style}
      {createPortal(
        <div
          ref={box}
          role="region"
          aria-label={`${name} switcher`}
          className="fixed z-[70] w-[300px] border border-white/25 bg-[#232325] text-[#F9F3E7] shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          style={pos ? { left: pos.x, top: pos.y } : start}
        >
          <div className="flex items-center border-b border-white/15">
            <button
              type="button"
              aria-label={`Drag to move the ${name} switcher (arrow keys also move it)`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onGripKey}
              className={`flex flex-1 cursor-grab touch-none select-none items-center gap-2 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/80 active:cursor-grabbing ${FOCUS}`}
            >
              <svg aria-hidden width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                <circle cx="2" cy="2" r="1.3" />
                <circle cx="8" cy="2" r="1.3" />
                <circle cx="2" cy="7" r="1.3" />
                <circle cx="8" cy="7" r="1.3" />
                <circle cx="2" cy="12" r="1.3" />
                <circle cx="8" cy="12" r="1.3" />
              </svg>
              {name}
            </button>
            <button
              type="button"
              aria-label={`Minimise the ${name} switcher to a small square`}
              title="Minimise to a small square"
              onClick={() => minimise(true)}
              className={`px-2 py-2 text-white/80 hover:text-[#F9F3E7] ${FOCUS}`}
            >
              <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M2 10h8" />
              </svg>
            </button>
            <button
              type="button"
              aria-pressed={compact}
              aria-label={compact ? "Show every option as a list" : "Collapse the options to a dropdown"}
              title={compact ? "Show as a list" : "Collapse to a dropdown"}
              onClick={() => {
                const next = !compact;
                setCompact(next);
                write(COMPACT_KEY, next ? "1" : "0");
              }}
              className={`px-2 py-2 text-white/80 hover:text-[#F9F3E7] ${FOCUS}`}
            >
              {compact ? (
                <svg aria-hidden width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
                  <rect y="0" width="14" height="1.6" />
                  <rect y="5.2" width="14" height="1.6" />
                  <rect y="10.4" width="14" height="1.6" />
                </svg>
              ) : (
                <svg aria-hidden width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="0.8" y="2" width="12.4" height="8" />
                  <path d="M8.5 5l1.5 1.6L11.5 5" />
                </svg>
              )}
            </button>
            <button
              type="button"
              aria-label={`Close the ${name} switcher`}
              onClick={() => {
                write(CLOSED_KEY, "1");
                setOpen(false);
              }}
              className={`px-3 py-2 text-[16px] leading-none text-white/80 hover:text-[#F9F3E7] ${FOCUS}`}
            >
              <span aria-hidden>×</span>
            </button>
          </div>

          {compact ? (
            <div className="p-2">
              <label className="sr-only" htmlFor={`switcher-select-${attr}`}>Option</label>
              <select
                id={`switcher-select-${attr}`}
                value={value}
                onChange={(e) => pick(Number(e.target.value))}
                className={`block w-full border border-white/25 bg-[#2c2c2f] px-2 py-2 text-[13px] text-[#F9F3E7] ${FOCUS}`}
              >
                {options.map((label, n) => (
                  <option key={label} value={n}>
                    {n + 1}. {label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <ul className="max-h-[50vh] overflow-y-auto py-1">
              {options.map((label, n) => {
                const on = n === value;
                return (
                  <li key={label}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => pick(n)}
                      className={`block w-full px-3 py-1.5 text-left text-[13px] leading-snug ${FOCUS} ${on ? "bg-white/[0.08] text-[#F9F3E7]" : "text-white/75 hover:bg-white/[0.04] hover:text-[#F9F3E7]"}`}
                    >
                      <span className={on ? "text-[#8FC2C6]" : undefined}>{on ? "● " : ""}</span>
                      {n + 1}. {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div
            className="border-t border-white/15 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              await addFiles(Array.from(e.dataTransfer.files));
            }}
          >
            <label htmlFor={`switcher-note-${attr}`} className="mb-1 block px-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
              Note for Claude (optional)
            </label>
            <div className="relative mb-2">
            <textarea
              id={`switcher-note-${attr}`}
              rows={2}
              value={note}
              onPaste={async (e) => {
                const files = Array.from(e.clipboardData.files);
                if (files.some((f) => f.type.startsWith("image/"))) {
                  e.preventDefault();
                  await addFiles(files);
                }
              }}
              onKeyDown={(e) => {
                // Ctrl+D starts or stops dictation. Enter stops dictation if it
                // is running, otherwise sends; Shift+Enter starts a new line
                // (Ben, 11 Nov).
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
                  e.preventDefault();
                  if (dictation.ok) dictation.toggle();
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (dictation.on) dictation.toggle();
                  else send();
                }
              }}
              onChange={(e) => {
                setNote(e.target.value);
                write(NOTE_KEY, e.target.value);
              }}
              placeholder="e.g. like this, but a bit smaller. Paste screenshots with Ctrl+V. Enter sends. Ctrl+D dictates."
              className={`block w-full resize-y border border-white/25 bg-[#2c2c2f] px-2 py-1.5 pr-10 text-[13px] text-[#F9F3E7] placeholder:text-white/40 ${FOCUS}`}
            />
            {dictation.ok && <MicButton on={dictation.on} onClick={dictation.toggle} />}
            </div>
            {images.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-2 px-1">
                {images.map((src, i) => (
                  <li key={i} className="relative">
                    <img src={src} alt={`Pasted image ${i + 1}`} className="h-14 w-auto max-w-[90px] border border-white/20 object-cover" />
                    <button
                      type="button"
                      aria-label={`Remove image ${i + 1}`}
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className={`absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-[#F9F3E7] text-[12px] leading-none text-[#232325] ${FOCUS}`}
                    >
                      <span aria-hidden>×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={send}
              className="block w-full bg-[#EDC33A] px-3 py-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[#232325] hover:bg-[#F9F3E7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FC2C6]"
            >
              Use this one
            </button>
            {sent && <p className="px-1 pt-2 text-[12px] text-white/75" role="status">{sent}</p>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
