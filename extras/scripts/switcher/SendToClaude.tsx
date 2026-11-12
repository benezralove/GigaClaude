"use client";

// Dev-only "Send to Claude" box (Ben, 11 Nov 2026). Mount once in the root
// layout behind process.env.NODE_ENV === "development". It rests as a small
// round Claude icon that can be dragged anywhere (position remembered per
// browser); click it (or press Ctrl + .) to open the box, and click anywhere
// outside it, press Esc or Ctrl + . again to close it; paste screenshots with Ctrl+V (or drop
// them), type a note, and Send. The message goes to
// ~/.claude/scripts/switcher-listener.mjs (run as a Monitor, port 4789),
// which saves the images and prints the message into the Claude session.
// A collapsible "Latest from Claude" section shows that session's latest
// replies (GET /replies on the same listener), refreshed every 3 seconds.
// Needs Tailwind; colours are literal hex so it works in any project.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Pos = { x: number; y: number };
const POS_KEY = "send-to-claude-pos";
const PANEL_KEY = "send-to-claude-panel-pos";
const HISTORY_KEY = "send-to-claude-history";
const HISTORY_MAX = 10;
type Sent = { at: number; page: string; text: string; images: number };
type Replies = { found: boolean; items: { at: string; text: string }[]; working: boolean; tool?: string };
const REPLIES_KEY = "send-to-claude-replies-open";
// Light tidy of Claude's markdown for plain display: bold markers and backticks dropped, links shown as their label.
const plain = (t: string) => t.replace(/\*\*/g, "").replace(/`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
const ICON = 48;
const MARGIN = 8;
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FC2C6]";

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

// The Claude mark (from Simple Icons, simple-icons@13.21.0 icons/claude.svg),
// in Claude's orange.
function ClaudeMark() {
  return (
    <svg aria-hidden width="24" height="24" viewBox="0 0 24 24">
      <path fill="#D97757" d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  );
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

export function SendToClaude({ port = 4789 }: { port?: number }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [panelPos, setPanelPos] = useState<Pos | null>(null);
  const panelDrag = useRef<{ dx: number; dy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState<Sent[]>([]);
  useEffect(() => {
    try {
      const h = JSON.parse(read(HISTORY_KEY) ?? "[]");
      if (Array.isArray(h)) setHistory(h.slice(0, HISTORY_MAX));
    } catch {
      // Bad saved value: start empty.
    }
  }, []);
  // "Latest from Claude": the session's latest replies, read from the listener while the panel and section are open
  // (Ben, 11 Nov 2026), so you can follow what Claude is doing without switching windows.
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replies, setReplies] = useState<Replies | null>(null);
  const [repliesErr, setRepliesErr] = useState(false);
  const repliesEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setRepliesOpen(read(REPLIES_KEY) === "1");
  }, []);
  useEffect(() => {
    if (!open || !repliesOpen) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/replies`, { cache: "no-store" });
        const j = (await r.json()) as Replies;
        if (alive) {
          setReplies(j);
          setRepliesErr(false);
        }
      } catch {
        if (alive) setRepliesErr(true);
      }
    };
    load();
    const t = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [open, repliesOpen, port]);
  const lastReplyAt = replies?.items.at(-1)?.at;
  useEffect(() => {
    repliesEnd.current?.scrollIntoView({ block: "nearest" });
  }, [lastReplyAt, repliesOpen]);
  const area = useRef<HTMLTextAreaElement>(null);
  const dictation = useDictation((t) => setText((prev) => (prev ? `${prev.replace(/\s+$/, "")} ${t}` : t)));
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);

  const clamp = useCallback((p: Pos): Pos => {
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    return {
      x: Math.round(Math.min(Math.max(MARGIN, p.x), vw - ICON - MARGIN)),
      y: Math.round(Math.min(Math.max(MARGIN, p.y), vh - ICON - MARGIN)),
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      const savedPanel = JSON.parse(read(PANEL_KEY) ?? "null");
      if (savedPanel && typeof savedPanel.x === "number" && typeof savedPanel.y === "number") setPanelPos(savedPanel);
    } catch {
      // Bad saved value: open beside the icon.
    }
    try {
      const saved = JSON.parse(read(POS_KEY) ?? "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
        setPos(clamp(saved));
        return;
      }
    } catch {
      // Bad saved value: use the default corner.
    }
    setPos(clamp({ x: window.innerWidth - ICON - 20, y: window.innerHeight - ICON - 20 }));
  }, [clamp]);

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  useEffect(() => {
    if (open) area.current?.focus();
  }, [open]);

  // Ctrl + . (Cmd + . on a Mac) opens or closes the box from anywhere on the page; Esc closes it (Ben, 11 Nov 2026).
  // Ctrl + . is free in Chrome and Windows, so a page can safely take it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === ".") {
        e.preventDefault();
        setOpen((o) => !o);
        setStatus("");
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Clicking anywhere outside the box closes it, so there's no need to reach for the X (Ben, 11 Nov 2026). The note,
  // pasted images and dictation are kept; reopen from the Claude icon. Clicks on the icon itself are left to it.
  const iconRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t || panelRef.current?.contains(t) || iconRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, sx: e.clientX, sy: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
    d.moved = true;
    setPos(clamp({ x: e.clientX - d.dx, y: e.clientY - d.dy }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (d?.moved) {
      setPos((p) => {
        if (p) write(POS_KEY, JSON.stringify(p));
        return p;
      });
    } else {
      setOpen((o) => !o);
      setStatus("");
    }
  };

  const addFiles = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    const urls = await Promise.all(imgs.map(toDataUrl));
    setImages((prev) => [...prev, ...urls].slice(0, 10));
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith("image/"))) {
      e.preventDefault();
      await addFiles(files);
    }
  };

  const send = async () => {
    if (!text.trim() && !images.length) return;
    setStatus("Sending...");
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "feedback", text, images, page: window.location.pathname + window.location.hash }),
      });
      if (!r.ok) throw new Error("listener");
      setStatus(`Sent to Claude${images.length ? ` with ${images.length} image${images.length > 1 ? "s" : ""}` : ""}`);
      setHistory((prev) => {
        const next = [{ at: Date.now(), page: window.location.pathname + window.location.hash, text, images: images.length }, ...prev].slice(0, HISTORY_MAX);
        write(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      setText("");
      setImages([]);
    } catch {
      setStatus("Not sent: Claude isn't listening");
    }
  };

  const clampPanel = (p: Pos): Pos => {
    const el = panelRef.current;
    const w = el?.offsetWidth ?? 360;
    const h = el?.offsetHeight ?? 320;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    return {
      x: Math.round(Math.min(Math.max(MARGIN, p.x), Math.max(MARGIN, vw - w - MARGIN))),
      y: Math.round(Math.min(Math.max(MARGIN, p.y), Math.max(MARGIN, vh - h - MARGIN))),
    };
  };
  const onPanelDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    panelDrag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.preventDefault();
  };
  const onPanelMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelDrag.current) return;
    setPanelPos(clampPanel({ x: e.clientX - panelDrag.current.dx, y: e.clientY - panelDrag.current.dy }));
  };
  const onPanelUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelDrag.current) return;
    panelDrag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setPanelPos((p) => {
      if (p) write(PANEL_KEY, JSON.stringify(p));
      return p;
    });
  };

  if (!mounted || !pos) return null;

  // The box opens beside the icon, on whichever side has room.
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = document.documentElement.clientHeight || window.innerHeight;
  const W = Math.min(360, vw - 2 * MARGIN);
  const H = 360;
  const panelLeft = Math.min(Math.max(MARGIN, pos.x + ICON - W), vw - W - MARGIN);
  const panelTop = pos.y > H + MARGIN * 2 ? pos.y - H - MARGIN : Math.min(pos.y + ICON + MARGIN, vh - H - MARGIN);

  return createPortal(
    <>
      <button
        ref={iconRef}
        type="button"
        aria-label={open ? "Close Send to Claude" : "Open Send to Claude (drag to move)"}
        aria-expanded={open}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className={`fixed z-[81] grid touch-none select-none place-items-center rounded-full border border-white/20 bg-[#232325] shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:border-[#D97757] ${FOCUS}`}
        style={{ left: pos.x, top: pos.y, width: ICON, height: ICON, cursor: "grab" }}
      >
        <ClaudeMark />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Send to Claude"
          className="fixed z-[80] border border-white/25 bg-[#232325] text-[#F9F3E7] shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          ref={panelRef}
          style={panelPos ? { left: panelPos.x, top: panelPos.y, width: W } : { left: panelLeft, top: Math.max(MARGIN, panelTop), width: W }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            await addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <div
            className="flex cursor-grab touch-none select-none items-center justify-between border-b border-white/15 px-3 py-2 active:cursor-grabbing"
            onPointerDown={onPanelDown}
            onPointerMove={onPanelMove}
            onPointerUp={onPanelUp}
            onPointerCancel={() => (panelDrag.current = null)}
            title="Drag to move"
          >
            <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/80">
              <svg aria-hidden width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                <circle cx="2" cy="2" r="1.3" />
                <circle cx="8" cy="2" r="1.3" />
                <circle cx="2" cy="7" r="1.3" />
                <circle cx="8" cy="7" r="1.3" />
                <circle cx="2" cy="12" r="1.3" />
                <circle cx="8" cy="12" r="1.3" />
              </svg>
              Send to Claude
            </span>
            <button
              type="button"
              aria-label="Collapse to the icon"
              onClick={() => setOpen(false)}
              className={`px-1 text-[16px] leading-none text-white/80 hover:text-[#F9F3E7] ${FOCUS}`}
            >
              <span aria-hidden>×</span>
            </button>
          </div>
          <div className="p-3">
            <label htmlFor="send-to-claude-text" className="sr-only">Message</label>
            <div className="relative">
            <textarea
              id="send-to-claude-text"
              ref={area}
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={onPaste}
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
              placeholder="Type or dictate a note. Paste screenshots with Ctrl+V, or drop them here. Enter sends. Ctrl+D dictates."
              className={`block w-full resize-y border border-white/25 bg-[#2c2c2f] px-2 py-2 pr-10 text-[13px] leading-snug text-[#F9F3E7] placeholder:text-white/40 ${FOCUS}`}
            />
            {dictation.ok && <MicButton on={dictation.on} onClick={dictation.toggle} />}
            </div>
            {images.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <li key={i} className="relative">
                    <img src={src} alt={`Pasted image ${i + 1}`} className="h-16 w-auto max-w-[100px] border border-white/20 object-cover" />
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
              disabled={!text.trim() && !images.length}
              className={`mt-3 block w-full bg-[#EDC33A] px-3 py-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[#232325] hover:bg-[#F9F3E7] disabled:opacity-40 ${FOCUS}`}
            >
              Send <span className="normal-case tracking-normal opacity-60">(Enter)</span>
            </button>
            {status && <p className="pt-2 text-[12px] text-white/75" role="status">{status}</p>}
            <details
              className="mt-3 border-t border-white/15 pt-2"
              open={repliesOpen}
              onToggle={(e) => {
                const o = (e.currentTarget as HTMLDetailsElement).open;
                setRepliesOpen(o);
                write(REPLIES_KEY, o ? "1" : "0");
              }}
            >
              <summary className={`cursor-pointer select-none text-[10px] font-medium uppercase tracking-[0.2em] text-white/60 hover:text-[#F9F3E7] ${FOCUS}`}>
                Latest from Claude
                {replies?.working && <span className="ml-2 normal-case tracking-normal text-[#D97757]">working…</span>}
              </summary>
              <div className="mt-2 max-h-[30vh] space-y-2 overflow-y-auto pr-1" aria-live="polite">
                {repliesErr && <p className="text-[12px] text-white/60">Claude isn&apos;t listening right now. Ask in chat to restart the listener.</p>}
                {!repliesErr && replies && !replies.found && <p className="text-[12px] text-white/60">Couldn&apos;t find this session&apos;s log.</p>}
                {!repliesErr && !replies && <p className="text-[12px] text-white/60">Loading…</p>}
                {!repliesErr &&
                  replies?.items.map((r) => (
                    <div key={r.at + r.text.length} className="border border-white/10 bg-[#2c2c2f] p-2 text-[12px] leading-snug">
                      <p className="mb-1 text-[10px] text-white/50">
                        {new Date(r.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-white/85">{plain(r.text)}</p>
                    </div>
                  ))}
                {!repliesErr && replies?.working && (
                  <p className="text-[12px] text-[#D97757]">Claude is working{replies.tool ? ` (${replies.tool.replace(/^mcp__[^_]+__/, "")})` : ""}…</p>
                )}
                <div ref={repliesEnd} />
              </div>
            </details>
            {history.length > 0 && (
              <details className="mt-3 border-t border-white/15 pt-2">
                <summary className={`cursor-pointer select-none text-[10px] font-medium uppercase tracking-[0.2em] text-white/60 hover:text-[#F9F3E7] ${FOCUS}`}>
                  Past messages ({history.length})
                </summary>
                <ul className="mt-2 max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                  {history.map((h) => (
                    <li key={h.at} className="border border-white/10 bg-[#2c2c2f] p-2 text-[12px] leading-snug">
                      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-white/50">
                        <span>
                          {new Date(h.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                          {h.images ? ` · ${h.images} image${h.images > 1 ? "s" : ""}` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setText(h.text);
                            area.current?.focus();
                          }}
                          className={`uppercase tracking-[0.15em] text-[#8FC2C6] hover:text-[#F9F3E7] ${FOCUS}`}
                        >
                          Reuse
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-white/85">{h.text || "(images only)"}</p>
                      <p className="mt-1 truncate text-[10px] text-white/40">{h.page}</p>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setHistory([]);
                    write(HISTORY_KEY, "[]");
                  }}
                  className={`mt-2 text-[10px] uppercase tracking-[0.15em] text-white/40 hover:text-[#F9F3E7] ${FOCUS}`}
                >
                  Clear history
                </button>
              </details>
            )}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
