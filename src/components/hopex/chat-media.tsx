import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { FileText, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/chat-media";

type Attachment = NonNullable<Doc<"chatMessages">["attachment"]>;

/** WhatsApp-style voice note player with a fake waveform. */
export function VoiceNote({
  url,
  duration,
  mine,
}: {
  url: string;
  duration?: number;
  mine?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const total = duration ?? 0;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setPos(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setPos(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const pct = total ? Math.min(100, (pos / total) * 100) : 0;

  return (
    <div className="flex min-w-[11.5rem] items-center gap-2.5 py-0.5">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-white",
          mine ? "bg-[var(--wa-teal-2)]" : "bg-[var(--wa-green)]",
        )}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-6 items-center gap-[2px]">
          {Array.from({ length: 26 }).map((_, i) => {
            const active = (i / 26) * 100 <= pct;
            return (
              <span
                key={i}
                className={cn(
                  "w-[3px] rounded-full",
                  active ? "bg-[var(--wa-teal-2)]" : "bg-current opacity-25",
                )}
                style={{ height: `${6 + ((i * 7) % 13)}px` }}
              />
            );
          })}
        </div>
        <span className="block text-[11px] opacity-70">
          {formatDuration(playing || pos ? pos : total)}
        </span>
      </div>
    </div>
  );
}

/** Renders an image / voice note / file attachment inside a chat bubble. */
export function ChatAttachment({
  attachment,
  mine,
  onOpenImage,
}: {
  attachment: Attachment;
  mine?: boolean;
  onOpenImage?: (url: string) => void;
}) {
  if (attachment.kind === "audio" && attachment.url)
    return <VoiceNote url={attachment.url} duration={attachment.duration} mine={mine} />;

  if (attachment.kind === "image" && attachment.url)
    return (
      <button
        onClick={() => onOpenImage?.(attachment.url!)}
        className="mb-1 block overflow-hidden rounded-lg"
      >
        <img
          src={attachment.url}
          alt={attachment.name || "Shared image"}
          loading="lazy"
          className="max-h-64 w-full max-w-[15rem] object-cover"
        />
      </button>
    );

  return (
    <div className="mb-1 flex items-center gap-2 rounded-md bg-black/5 px-2 py-1.5 text-[12px]">
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{attachment.name}</span>
    </div>
  );
}

/** Fullscreen image viewer. */
export function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <img
        src={url}
        alt="Attachment"
        className="max-h-[90vh] max-w-full rounded-xl object-contain"
      />
    </div>
  );
}
