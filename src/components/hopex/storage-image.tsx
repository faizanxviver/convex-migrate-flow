import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback } from "react";

/** Upload a file to Convex storage and return its storage id. */
export function useUploader() {
  const generateUploadUrl = useMutation(api.helpers.generateUploadUrl);

  return useCallback(
    async (file: File): Promise<Id<"_storage">> => {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text ? `Upload failed: ${text}` : "Upload failed");
      }
      const json = (await res.json()) as { storageId: string };
      return json.storageId as Id<"_storage">;
    },
    [generateUploadUrl],
  );
}

/** Renders a stored file by storage id (resolves the URL reactively). */
export function StorageImage({
  storageId,
  alt,
  className,
}: {
  storageId: string;
  alt?: string;
  className?: string;
}) {
  const url = useQuery(api.helpers.getStorageUrl, {
    storageId: storageId as Id<"_storage">,
  });
  if (!url) {
    return <div className={`animate-pulse bg-muted ${className ?? ""}`} />;
  }
  return <img src={url} alt={alt ?? ""} className={className} />;
}

export function isStorageRef(value?: string) {
  return Boolean(value && !value.startsWith("http"));
}
