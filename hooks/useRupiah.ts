import { useCallback, useState } from "react";

/**
 * GANTI "LOCALHOST" dengan IP laptop Anda di jaringan lokal, contoh:
 * const API_URL = "http://192.168.1.123:8000/predict"
 */
const API_URL = "http://192.168.1.3:8000/predict";

export interface RupiahApiResult {
  success: boolean;
  label: string;
  value: number;
  confidence: number;
}

export const useRupiahAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(
    async (imageUri: string): Promise<RupiahApiResult> => {
      setIsLoading(true);
      setError(null);

      try {
        // Build FormData: field name must be 'file' (FastAPI UploadFile)
        const form = new FormData();

        // Derive filename & mime type
        const nameMatch = (imageUri || "").split("/").pop() || "photo.jpg";
        const extMatch = nameMatch.split(".").pop() || "jpg";
        const mimeType =
          extMatch.toLowerCase() === "png" ? "image/png" : "image/jpeg";

        // React Native expects { uri, name, type } for file uploads
        // @ts-ignore - FormData type for RN file
        form.append("file", {
          uri: imageUri,
          name: nameMatch,
          type: mimeType,
        });

        // NOTE: In React Native, do NOT set a manual boundary. Setting Content-Type may break on some RN versions.
        // User requested header, but it's safer to let fetch set it. If your backend requires it, you can set as below.
        const response = await fetch(API_URL, {
          method: "POST",
          // comment out manual Content-Type if you encounter boundary issues:
          headers: {
            // "Content-Type": "multipart/form-data",
          },
          body: form,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Server responded ${response.status}: ${text}`);
        }

        const json = await response.json();

        // Expect backend to return { success, label, value, confidence }
        return {
          success: !!json.success,
          label: String(json.label ?? ""),
          value: Number(json.value ?? 0),
          confidence: Number(json.confidence ?? 0),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    predict,
    isLoading,
    error,
    API_URL, // expose for debugging
  };
};
