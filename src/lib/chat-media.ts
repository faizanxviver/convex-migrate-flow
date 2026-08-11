import { useCallback, useEffect, useRef, useState } from "react";

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the recording"));
    reader.readAsDataURL(blob);
  });

/** Voice notes are stored inline as a data URL (kept short on purpose). */
export const recordingToUrl = blobToDataUrl;

export const formatDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export const MAX_VOICE_SECONDS = 45;

/** WhatsApp-style voice recorder (MediaRecorder → data URL). */
export function useVoiceRecorder(onDone: (url: string, seconds: number) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const secRef = useRef(0);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => () => stopTimer(), []);

  const start = useCallback(async () => {
    if (recRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Voice recording is not supported in this browser.");
    }
    if (typeof MediaRecorder === "undefined") {
      throw new Error("Voice recording is not supported in this browser.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setRecording(false);
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        throw new Error("Microphone blocked — allow mic access in your browser settings.");
      }
      if (name === "NotFoundError") throw new Error("No microphone was found on this device.");
      throw new Error("Could not start recording. Try again.");
    }
    try {
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (t) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(t),
      );
      const rec = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      chunks.current = [];
      cancelled.current = false;
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        recRef.current = null;
        stopTimer();
        setRecording(false);
        const secs = secRef.current;
        setSeconds(0);
        if (cancelled.current || !chunks.current.length) return;
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const url = await blobToDataUrl(blob);
        onDone(url, Math.max(1, secs));
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setSeconds(0);
      secRef.current = 0;
      timer.current = setInterval(
        () =>
          setSeconds(() => {
            secRef.current += 1;
            if (secRef.current >= MAX_VOICE_SECONDS) recRef.current?.stop();
            return secRef.current;
          }),
        1000,
      );
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      throw new Error("Could not start recording. Try again.");
    }
  }, [onDone]);

  const stop = useCallback(() => recRef.current?.stop(), []);
  const cancel = useCallback(() => {
    cancelled.current = true;
    recRef.current?.stop();
  }, []);

  return { recording, seconds, start, stop, cancel };
}
