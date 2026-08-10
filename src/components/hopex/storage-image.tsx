import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback } from "react";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a proof/chat image to imgbb and return its hosted URL. All images in
 * HopeX are hosted on imgbb (admin-managed key pool + IMGBB_API_KEY fallback)
 * so both the app and the MPay gateway can render them.
 */
export function useUploader() {
  const uploadImage = useAction(api.upload.uploadImage);

  return useCallback(
    async (file: File): Promise<string> => {
      const dataUrl = await fileToBase64(file);
      const base64 = dataUrl.split(",")[1] ?? "";
      if (!base64) throw new Error("Could not read the image file");
      const res = await uploadImage({ base64, name: file.name });
      return res.url;
    },
    [uploadImage],
  );
}
