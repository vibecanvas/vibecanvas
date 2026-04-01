type TSaveJsonRuntime = {
  document: Document;
  url: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: string) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

function downloadJsonFile(runtime: Pick<TSaveJsonRuntime, "document" | "url">, payload: { fileName: string; content: string }) {
  const blob = new Blob([payload.content], { type: "application/json" });
  const href = runtime.url.createObjectURL(blob);
  const anchor = runtime.document.createElement("a");
  anchor.href = href;
  anchor.download = payload.fileName;
  runtime.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  runtime.url.revokeObjectURL(href);
}

export async function saveJsonFile(runtime: TSaveJsonRuntime, payload: { fileName: string; content: string }) {
  if (!runtime.showSaveFilePicker) {
    downloadJsonFile(runtime, payload);
    return;
  }

  try {
    const handle = await runtime.showSaveFilePicker({
      suggestedName: payload.fileName,
      types: [
        {
          description: "JSON files",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(payload.content);
    await writable.close();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }

    throw error;
  }
}
