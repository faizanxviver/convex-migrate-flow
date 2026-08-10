import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { ImagePlus, Paperclip, SendHorizonal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useHope } from "@/hooks/use-hope";
import { fmtTime } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useUploader } from "./storage-image";

export function LiveChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { chat, profile } = useHope();
  const send = useMutation(api.chat.sendUserMessage);
  const upload = useUploader();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, chat.length]);

  if (!open) return null;

  const handleSend = async () => {
    const clean = text.trim();
    if (!clean && !file) return;
    setBusy(true);
    try {
      let storageId: string | undefined;
      if (file) {
        storageId = await upload(file);
      }
      await send({ text: clean, attachment: storageId ? { name: file!.name, kind: "image", url: storageId } : undefined });
      setText("");
      setFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send message");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-end p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm sm:bg-black/20" onClick={onClose} />
      <div className="wa animate-rise relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-none border border-border shadow-[var(--shadow-elegant)] sm:h-[600px] sm:w-[400px] sm:rounded-3xl">
        {/* Header */}
        <div className="wa-header flex items-center gap-3 px-4 py-3">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25D366] font-bold">
            H
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--wa-teal)] bg-success" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">HopeX Support</p>
            <p className="text-[11px] opacity-80">online · replies in minutes</p>
          </div>
          <button onClick={onClose} aria-label="Close chat" className="rounded-full p-1.5 transition hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="wa wa-panel wa-wall min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <div className="mx-auto mb-3 w-fit rounded-lg bg-white/70 px-3 py-1 text-center text-[11px] text-[#667781] dark:bg-white/10">
            🔒 Messages are private between you and support
          </div>
          {chat.map((m) => (
            <div
              key={m._id}
              className={cn("mb-1 flex", m.sender === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "wa-bubble",
                  m.sender === "user" ? "wa-out wa-bubble-out" : "wa-in wa-bubble-in",
                )}
              >
                {m.attachment?.url ? (
                  <div className="mb-1 overflow-hidden rounded-md">
                    <img src={m.attachment.url} alt={m.attachment.name} className="max-h-52 w-full object-cover" />
                  </div>
                ) : null}
                {m.text ? <span className="whitespace-pre-wrap">{m.text}</span> : null}
                <span className="wa-meta">
                  {fmtTime(m.createdAt)}
                  {m.sender === "user" ? (
                    <svg viewBox="0 0 16 11" className="h-3.5 w-4 fill-[var(--wa-tick)]">
                      <path d="M11.07.65c-.3-.3-.77-.3-1.06 0L4.1 6.56 1.93 4.4c-.3-.3-.77-.3-1.06 0-.3.3-.3.77 0 1.06l2.7 2.7c.3.3.77.3 1.06 0l6.44-6.45c.3-.3.3-.77 0-1.06z" />
                    </svg>
                  ) : null}
                </span>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="wa wa-panel flex items-center gap-2 border-t border-black/5 px-3 py-2">
          {file ? (
            <div className="absolute bottom-[4.5rem] left-3 flex items-center gap-2 rounded-xl bg-white p-2 shadow-lg dark:bg-[#2a3942]">
              <span className="max-w-40 truncate text-xs">{file.name}</span>
              <button onClick={() => setFile(null)} className="text-[var(--wa-dim)] hover:text-[var(--wa-text)]">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--wa-dim)] transition hover:bg-black/5 dark:hover:bg-white/10">
            <ImagePlus className="h-5 w-5" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <div className="flex min-w-0 flex-1 items-center rounded-full bg-white px-4 py-2 dark:bg-[#2a3942]">
            <Paperclip className="mr-2 h-4 w-4 shrink-0 text-[var(--wa-dim)]" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type a message"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--wa-dim)]"
            />
          </div>
          <button
            onClick={() => void handleSend()}
            disabled={busy || (!text.trim() && !file)}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 disabled:opacity-40"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </div>
        <p className="wa wa-panel pb-1 text-center text-[10px] text-[var(--wa-dim)]">
          HopeX Support · {profile?.name ?? ""}
        </p>
      </div>
    </div>
  );
}
