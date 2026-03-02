import { orpcWebsocketService } from "@/services/orpc-websocket";
import { createSignal, type Accessor } from "solid-js";

export type TFileContent =
  | {
      kind: "text";
      content: string;
      truncated: boolean;
    }
  | {
      kind: "binary";
      content: string | null;
      size: number;
    }
  | {
      kind: "none";
      size: number;
    }
  | null;

type TUseFileContent = {
  content: Accessor<TFileContent>;
  loading: Accessor<boolean>;
  error: Accessor<string | null>;
  dirty: Accessor<boolean>;
  saving: Accessor<boolean>;
  setDirty: (next: boolean) => void;
  refetch: (options?: { background?: boolean; contentType?: "text" | "base64" | "binary" | "arraybuffer" | "none" }) => Promise<void>;
  save: (nextContent: string) => Promise<boolean>;
};

export function useFileContent(path: Accessor<string>): TUseFileContent {
  const [content, setContent] = createSignal<TFileContent>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const refetch = async (options?: { background?: boolean; contentType?: "text" | "base64" | "binary" | "arraybuffer" | "none" }) => {
    const isBackgroundRefresh = options?.background === true && content() !== null;
    const contentType = options?.contentType ?? "text";

    console.log("[useFileContent] refetch:", { path: path(), contentType });

    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      const [readError, readResult] = await orpcWebsocketService.safeClient.api.filesystem.read({
        query: { path: path(), content: contentType },
      });

      console.log("[useFileContent] result:", { readError, readResult });

      if (readError || !readResult || "type" in readResult) {
        const message =
          readError?.message ??
          (readResult && "message" in readResult ? readResult.message : "Failed to read file");
        console.log("[useFileContent] error:", message);
        setError(message);
        if (!isBackgroundRefresh) {
          setLoading(false);
        }
        return;
      }

      setContent(readResult);
      setDirty(false);
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    } catch (e) {
      console.log("[useFileContent] exception:", e);
      setError(String(e));
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  const save = async (nextContent: string): Promise<boolean> => {
    setSaving(true);
    setError(null);

    const [writeError, writeResult] = await orpcWebsocketService.safeClient.api.filesystem.write({
      query: { path: path(), content: nextContent },
    });

    if (writeError || !writeResult || "type" in writeResult) {
      const message =
        writeError?.message ??
        (writeResult && "message" in writeResult ? writeResult.message : "Failed to save file");
      setError(message);
      setSaving(false);
      return false;
    }

    setDirty(false);
    setSaving(false);
    return true;
  };

  return { content, loading, error, dirty, saving, setDirty, refetch, save };
}
