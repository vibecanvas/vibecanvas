import type { TOrpcSafeClient } from "@vibecanvas/orpc-client";
import { createSignal, type Accessor } from "solid-js";
import type { TFileReadResponse } from "../../services/canvas/interface";

export type TFileContent = Exclude<TFileReadResponse, { type: string; message: string }> | null;

type TUseFileContent = {
  content: Accessor<TFileContent>;
  loading: Accessor<boolean>;
  error: Accessor<string | null>;
  dirty: Accessor<boolean>;
  saving: Accessor<boolean>;
  setDirty: (next: boolean) => void;
  refetch: (options?: { background?: boolean; contentType?: "text" | "base64" | "binary" | "none" }) => Promise<void>;
  save: (nextContent: string) => Promise<boolean>;
};

function getErrorMessage(err: unknown, result: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (result && typeof result === "object" && "type" in result && "message" in result && typeof (result as { message?: unknown }).message === "string") {
    return (result as { message: string }).message;
  }
  return fallback;
}

export function useFileContent(apiService: TOrpcSafeClient, path: Accessor<string>): TUseFileContent {
  const [content, setContent] = createSignal<TFileContent>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const refetch = async (options?: { background?: boolean; contentType?: "text" | "base64" | "binary" | "none" }) => {
    const isBackgroundRefresh = options?.background === true && content() !== null;
    const contentType = options?.contentType ?? "text";

    if (!isBackgroundRefresh) setLoading(true);
    setError(null);

    const [readError, readResult] = await apiService.api.filesystem.read({
      query: { path: path(), content: contentType },
    });

    if (readError || !readResult || (typeof readResult === "object" && readResult !== null && "type" in readResult)) {
      setError(getErrorMessage(readError, readResult, "Failed to read file"));
      if (!isBackgroundRefresh) setLoading(false);
      return;
    }

    setContent(readResult);
    setDirty(false);
    if (!isBackgroundRefresh) setLoading(false);
  };

  const save = async (nextContent: string) => {
    setSaving(true);
    setError(null);

    const [writeError, writeResult] = await apiService.api.filesystem.write({
      query: { path: path(), content: nextContent },
    });

    if (writeError || !writeResult || (typeof writeResult === "object" && writeResult !== null && "type" in writeResult)) {
      setError(getErrorMessage(writeError, writeResult, "Failed to save file"));
      setSaving(false);
      return false;
    }

    setDirty(false);
    setSaving(false);
    return true;
  };

  return { content, loading, error, dirty, saving, setDirty, refetch, save };
}
