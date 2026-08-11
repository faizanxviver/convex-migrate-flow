import { api } from "@/convex/_generated/api";
import { useHope } from "@/hooks/use-hope";
import { useTyping } from "@/lib/typing";
import { fmtTime } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Mic,
  Paperclip,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  X,
  MoreVertical,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatAttachment, ImageLightbox } from "./chat-media";
import { useUploader } from "./storage-image";
import { formatDuration, useVoiceRecorder } from "@/lib/chat-media";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😎",
  "🤝", "👍", "👏", "🙏", "🔥", "💰", "💵", "📈",
  "📉", "✅", "❌", "❓", "😢", "😡", "🎉", "💎",
  "⏳", "📷", "🧾", "🏦", "🤔", "🙌", "💯", "⭐",
];

const QUICK_REPLIES = [
  "Where is my deposit?",
  "How do withdrawals work?",
  "Explain referral levels",
  "My plan is not active",
];

function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "TODAY";
  if (d.toDateString() === yest.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}

/** WhatsApp-style user support chat — redesigned with grouped bubbles, tails and a richer header. */
export function LiveChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { chat, profile } = useHope();
  const send = useMutation(api.chat.sendUserMessage);
  const markRead = useMutation(api.chat.markUserRead);
  const clearChat = useMutation(api.chat.clearMyChat);
  const upload = useUploader();

  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [attach, setAttach] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [menu, setMenu] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [replyTo, setReplyTo] = useState<{ from: "user" | "support"; text: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const atBottomRef = useRef(true);

  const filtered = query.trim()
    ? chat.filter((m) => m.text.toLowerCase().includes(query.trim().toLowerCase()))
    : chat;
  const agentOnline = true;
  const searchingActive = query.trim().length > 0;

  /* Group consecutive messages from the same sender (within 5 min) the way
     WhatsApp does — tight spacing, and the tail + time only on the last one. */
  const rows = useMemo(() => {
    const grouped = !searchingActive;
    return filtered.map((m, i) => {
      const prev = filtered[i - 1];
      const next = filtered[i + 1];
      const gap = 5 * 60000;
      const samePrev = grouped && !!prev && prev.sender === m.sender && m.createdAt - prev.createdAt < gap;
      const sameNext = grouped && !!next && next.sender === m.sender && next.createdAt - m.createdAt < gap;
      return { m, first: !samePrev, last: !sameNext };
    });
  }, [filtered, searchingActive]);

  useEffect(() => {
    atBottomRef.current = atBottom;
  }, [atBottom]);

  /* Auto-scroll on new messages only when the user is already near the bottom,
     so reading older history is never yanked away (WhatsApp behaviour). */
  useEffect(() => {
    if (open && (atBottomRef.current || chat.length === 0)) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [rows.length, open, chat.length]);

  const { peerTyping, notifyTyping } = useTyping(profile?.userId ?? null, "user");

  /* Viewing the thread marks the agent's messages as read on our side. */
  useEffect(() => {
    if (!open || !profile) return;
    const unread = chat.some((m) => m.sender === "support" && m.status !== "read");
    if (!unread) return;
    const t = setTimeout(() => void markRead({}), 500);
    return () => clearTimeout(t);
  }, [open, profile, chat, markRead]);

  const { recording, seconds, start, stop, cancel } = useVoiceRecorder((url, secs) => {
    void doSend("", { name: "Voice message", kind: "audio", url, duration: secs });
  });

  if (!open || !profile) return null;

  async function doSend(value?: string, attachment?: NonNullable<(typeof chat)[number]["attachment"]>) {
    const body = (value ?? text).trim();
    if (!body && !attachment) return;
    setBusy(true);
    setText("");
    setEmoji(false);
    setAttach(false);
    const reply = replyTo ?? undefined;
    setReplyTo(null);
    try {
      await send({ text: body, attachment, replyTo: reply });
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\\s*/, "") : "Could not send message");
    } finally {
      setBusy(false);
    }
  }

  /** Pick an image and show a preview first — nothing is uploaded until Send. */
  const pickImage = (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Only images can be shared.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8MB.");
    setAttach(false);
    setPreview({ url: URL.createObjectURL(file), file });
  };

  const confirmSendImage = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      const url = await upload(preview.file);
      await doSend("", { name: preview.file.name, kind: "image", url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
      setUploading(false);
    }
  };

  const doClear = () => {
    setMenu(false);
    if (!confirm("Clear this conversation?")) return;
    void clearChat({}).then(() => toast.success("Conversation cleared."));
  };

  /** WhatsApp-style tap-to-copy on a message bubble. */
  const copyMsg = async (m: (typeof chat)[number]) => {
    if (!m.text) return;
    try {
      await navigator.clipboard.writeText(m.text);
      toast.success("Message copied");
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  let lastDay = "";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-end sm:p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      <div className="wa animate-rise relative flex h-full w-full flex-col overflow-hidden shadow-[var(--shadow-elegant)] ring-1 ring-black/10 sm:h-[min(42rem,92vh)] sm:w-[26rem] sm:rounded-2xl">
        {/* ---------- Header ---------- */}
        <div className="wa-header flex items-center gap-3 px-3 py-2.5">
          <button onClick={onClose} aria-label="Back" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/25 font-display text-sm font-black ring-2 ring-white/40">
            H
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--wa-teal)] bg-[var(--wa-green)]" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-center gap-1 truncate text-[15px] font-semibold">
              HopeX Support
              <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--wa-green)]" />
            </p>
            <p className="flex items-center gap-1.5 truncate text-[11px] opacity-85">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--wa-green)]",
                  peerTyping && "animate-pulse",
                )}
              />
              {peerTyping ? "typing…" : agentOnline ? "online" : "typically replies in minutes"}
            </p>
          </div>
          <div className="relative shrink-0">
            <button aria-label="Chat menu" onClick={() => setMenu((m) => !m)} className="opacity-90">
              <MoreVertical className="h-[18px] w-[18px]" />
            </button>
            {menu ? (
              <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-xl ring-1 ring-black/10">
                <button
                  onClick={() => {
                    setMenu(false);
                    setSearching(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
                >
                  <Search className="h-4 w-4" /> Search
                </button>
                <button
                  onClick={doClear}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
                >
                  <Trash2 className="h-4 w-4" /> Clear chat
                </button>
                <button
                  onClick={() => {
                    setMenu(false);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
                >
                  <X className="h-4 w-4" /> Exit chat
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* ---------- Search ---------- */}
        {searching ? (
          <div className="wa-panel flex items-center gap-2 px-3 py-2">
            <Search className="h-4 w-4 wa-dim" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in conversation…"
              className="h-8 flex-1 bg-transparent text-sm outline-none"
            />
            <button
              onClick={() => {
                setSearching(false);
                setQuery("");
              }}
              aria-label="Close search"
            >
              <X className="h-4 w-4 wa-dim" />
            </button>
          </div>
        ) : null}

        {/* ---------- Messages ---------- */}
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
          }}
          className="wa-wall relative flex-1 overflow-y-auto px-3 py-4"
        >
          <p className="wa-divider mx-auto mb-3 w-fit rounded-md px-3 py-1 text-center text-[11px]">
            🔒 Messages are private between you and support
          </p>

          {chat.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="relative grid h-16 w-16 place-items-center rounded-full bg-[var(--wa-green)]/15 text-[var(--wa-green)]">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--wa-green)]/20" />
                <MessageCircle className="relative h-7 w-7" />
              </span>
              <p className="text-sm font-semibold">Hello! 👋 How can we help?</p>
              <p className="max-w-[15rem] text-xs wa-dim">
                This is your private chat with HopeX Support — ask about deposits, withdrawals,
                plans or referrals.
              </p>
            </div>
          ) : null}

          {rows.map(({ m, first, last }) => {
            const label = dayLabel(m.createdAt);
            const showDay = label !== lastDay;
            lastDay = label;
            const mine = m.sender === "user";
            return (
              <div key={m._id}>
                {showDay ? (
                  <p className="wa-divider mx-auto my-3 w-fit rounded-md px-3 py-1 text-[11px] font-semibold">
                    {label}
                  </p>
                ) : null}
                <div
                  className={cn(
                    "group flex animate-msg items-end gap-1",
                    mine ? "justify-end" : "justify-start",
                    first ? "mt-3" : "mt-[3px]",
                  )}
                >
                  {mine ? (
                    <button
                      onClick={() => setReplyTo({ from: m.sender, text: m.text })}
                      aria-label="Reply"
                      className="mb-1 opacity-0 transition group-hover:opacity-100"
                    >
                      <Reply className="h-3.5 w-3.5 wa-dim" />
                    </button>
                  ) : last ? (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/70 text-[10px] font-black text-[var(--wa-teal-2)] shadow-sm">
                      H
                    </span>
                  ) : (
                    <span className="w-6 shrink-0" />
                  )}
                  <div
                    onClick={() => void copyMsg(m)}
                    title={m.text ? "Click to copy" : undefined}
                    className={cn(
                      "wa-bubble",
                      mine ? "wa-out wa-bubble-out" : "wa-in wa-bubble-in",
                      last && "wa-tail",
                      m.text && "cursor-pointer",
                    )}
                  >
                    {m.replyTo ? (
                      <div className="mb-1 rounded-md border-l-[3px] border-[var(--wa-green)] bg-black/5 px-2 py-1 text-[11px]">
                        <span className="block font-semibold text-[var(--wa-teal-2)]">
                          {m.replyTo.from === "user" ? "You" : "HopeX Support"}
                        </span>
                        <span className="line-clamp-2 wa-dim">{m.replyTo.text}</span>
                      </div>
                    ) : null}
                    {m.attachment ? (
                      <ChatAttachment attachment={m.attachment} mine={mine} onOpenImage={setLightbox} />
                    ) : null}
                    {m.text ? (
                      <span className="whitespace-pre-wrap font-semibold">{m.text}</span>
                    ) : null}
                    {last ? (
                      <span className="wa-meta">
                        {fmtTime(m.createdAt)}
                        {mine ? (
                          m.status === "read" ? (
                            <CheckCheck className="h-[15px] w-[15px] text-[var(--wa-tick)]" />
                          ) : m.status === "delivered" ? (
                            <CheckCheck className="h-[15px] w-[15px]" />
                          ) : (
                            <Check className="h-[15px] w-[15px]" />
                          )
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                  {!mine ? (
                    <button
                      onClick={() => setReplyTo({ from: m.sender, text: m.text })}
                      aria-label="Reply"
                      className="mb-1 opacity-0 transition group-hover:opacity-100"
                    >
                      <Reply className="h-3.5 w-3.5 wa-dim" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

          {peerTyping ? (
            <div className="mt-3 flex justify-start">
              <div className="wa-bubble wa-in wa-bubble-in wa-tail flex animate-msg items-center gap-1 py-2.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-50"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {uploading ? (
            <div className="mt-3 flex justify-end">
              <div className="wa-bubble wa-out wa-bubble-out wa-tail flex items-center gap-2 text-xs opacity-70">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading image…
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {!atBottom ? (
          <button
            onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
            aria-label="Scroll to latest"
            className="absolute bottom-24 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[var(--wa-teal-2)] to-[var(--wa-teal)] text-white shadow-lg"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        ) : null}

        {/* ---------- Quick replies ---------- */}
        {chat.length < 3 ? (
          <div className="wa-panel flex gap-2 overflow-x-auto px-3 py-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => void doSend(q)}
                className="shrink-0 rounded-full bg-[var(--wa-teal-2)]/10 px-3 py-1.5 text-xs font-medium text-[var(--wa-teal-2)] ring-1 ring-[var(--wa-teal-2)]/30"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        {/* ---------- Reply preview ---------- */}
        {replyTo ? (
          <div className="wa-panel flex items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1 rounded-md border-l-[3px] border-[var(--wa-green)] bg-black/5 px-2 py-1 text-[11px]">
              <span className="block font-semibold text-[var(--wa-teal-2)]">
                {replyTo.from === "user" ? "You" : "HopeX Support"}
              </span>
              <span className="line-clamp-1 wa-dim">{replyTo.text}</span>
            </div>
            <button onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              <X className="h-4 w-4 wa-dim" />
            </button>
          </div>
        ) : null}

        {/* ---------- Attachment sheet ---------- */}
        {attach ? (
          <div className="wa-panel flex items-end gap-5 px-4 py-3">
            {[
              { label: "Gallery", icon: ImageIcon, tone: "#bf59cf", ref: fileRef },
              { label: "Camera", icon: Camera, tone: "#d3396d", ref: cameraRef },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => a.ref.current?.click()}
                className="flex flex-col items-center gap-1.5 text-[11px] wa-dim"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full text-white shadow-md"
                  style={{ background: a.tone }}
                >
                  <a.icon className="h-5 w-5" />
                </span>
                {a.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* ---------- Image preview before send ---------- */}
        {preview ? (
          <div className="wa-panel flex items-center gap-3 px-3 py-2">
            <img
              src={preview.url}
              alt="Preview"
              className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{preview.file.name}</p>
              <p className="text-[11px] wa-dim">{(preview.file.size / 1024 / 1024).toFixed(1)} MB · image</p>
            </div>
            <button
              onClick={() => {
                URL.revokeObjectURL(preview.url);
                setPreview(null);
              }}
              aria-label="Cancel image"
              className="shrink-0 wa-dim"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={() => void confirmSendImage()}
              disabled={uploading}
              aria-label="Send image"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--wa-teal-2)] to-[var(--wa-teal)] text-white disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        ) : null}

        {/* ---------- Emoji tray ---------- */}
        {emoji ? (
          <div className="wa-panel grid grid-cols-8 gap-1 px-3 py-2 text-xl">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setText((t) => t + e)}
                className="rounded hover:bg-black/5"
              >
                {e}
              </button>
            ))}
          </div>
        ) : null}

        {/* ---------- Composer ---------- */}
        <div className="wa-panel flex items-end gap-2 p-2 pb-3">
          {recording ? (
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-3xl bg-[var(--wa-in)] px-4 py-3 shadow-sm ring-1 ring-black/5">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
              <span className="text-sm font-semibold tabular-nums">{formatDuration(seconds)}</span>
              <span className="truncate text-xs wa-dim">Recording… tap to send</span>
              <button onClick={cancel} className="ml-auto shrink-0 wa-dim" aria-label="Cancel recording">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-end gap-1 rounded-[1.4rem] bg-[var(--wa-in)] px-2.5 py-1.5 shadow-sm ring-1 ring-black/5">
              <button
                onClick={() => {
                  setEmoji((e) => !e);
                  setAttach(false);
                }}
                aria-label="Emoji"
                className="pb-1.5 wa-dim"
              >
                <Smile className="h-[22px] w-[22px]" />
              </button>
              <textarea
                rows={1}
                maxLength={2000}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  notifyTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void doSend();
                  }
                }}
                placeholder="Message"
                className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none"
              />
              <button
                onClick={() => {
                  setAttach((a) => !a);
                  setEmoji(false);
                }}
                aria-label="Attach"
                className="pb-1.5 wa-dim"
              >
                <Paperclip className="h-[21px] w-[21px] -rotate-45" />
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                aria-label="Camera"
                className="pb-1.5 wa-dim"
              >
                <Camera className="h-[21px] w-[21px]" />
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) pickImage(f);
                }}
              />
              <input
                ref={cameraRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) pickImage(f);
                }}
              />
            </div>
          )}
          <button
            onClick={() => {
              if (recording) return stop();
              if (text.trim()) return void doSend();
              void start().catch((e) =>
                toast.error(e instanceof Error ? e.message : "Microphone permission denied."),
              );
            }}
            disabled={busy || uploading}
            aria-label={
              recording ? "Send voice message" : text.trim() ? "Send message" : "Record voice message"
            }
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--wa-teal-2)] to-[var(--wa-teal)] text-white shadow-[0_4px_12px_-4px_rgba(18,140,126,0.55)] disabled:opacity-60"
          >
            {recording || text.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {lightbox ? <ImageLightbox url={lightbox} onClose={() => setLightbox(null)} /> : null}
    </div>
  );
}
