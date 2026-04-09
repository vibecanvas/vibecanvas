import type { TElement, TFileData, TFiletreeData, TTerminalData } from "@vibecanvas/service-automerge/types/canvas-doc";
import { Group } from "konva/lib/Group";
import { Shape, ShapeConfig } from "konva/lib/Shape";
import { CanvasMode, Theme } from "./enum";

export type TImageUploadFormat = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type TUploadImage = (args: {
  base64: string;
  format: TImageUploadFormat;
}) => Promise<{ url: string }>;

export type TCloneImage = (args: {
  url: string;
}) => Promise<{ url: string }>;

export type TDeleteImage = (args: {
  url: string;
}) => Promise<{ ok: true }>;

export type THostedWidgetType = "filetree" | "terminal" | "file";

export type THostedWidgetElementMap = {
  filetree: TElement & { data: TFiletreeData };
  terminal: TElement & { data: TTerminalData };
  file: TElement & { data: TFileData };
};

export type THostedWidgetChrome = {
  title?: string | null;
  subtitle?: string | null;
};

export type TFiletreeHomeResponse = {
  path: string;
};

export type TFiletreeErrorResponse = {
  type: string;
  message: string;
};

export type TFiletreeListResponse = {
  current: string;
  parent: string | null;
  children: Array<{
    name: string;
    path: string;
    isDir: boolean;
  }>;
};

export type TFiletreeNode = {
  name: string;
  path: string;
  is_dir: boolean;
  children: TFiletreeNode[];
};

export type TFiletreeFilesResponse = {
  root: string;
  children: TFiletreeNode[];
};

export type TFiletreeMoveResponse = {
  source_path: string;
  destination_dir_path: string;
  target_path: string;
  moved: boolean;
};

export type TFiletreeWatchEvent = {
  eventType: "rename" | "change";
  fileName: string;
};

export type TFileInspectResponse = {
  name: string;
  path: string;
  mime: string | null;
  kind: "pdf" | "text" | "image" | "binary" | "video";
  size: number;
  lastModified: number;
  permissions: string;
};

export type TFileReadResponse =
  | {
    kind: "text";
    content: string;
    truncated: boolean;
  }
  | {
    kind: "binary";
    content: string | null;
    size: number;
    mime?: string;
    encoding?: "base64" | "hex";
  }
  | {
    kind: "none";
    size: number;
  }
  | TFiletreeErrorResponse;

export type TFileWriteResponse =
  | {
    success: true;
  }
  | TFiletreeErrorResponse;

type TFiletreeSafeResult<T> = Promise<[unknown, T | null | undefined]>;

export type TFiletreeSafeClient = {
  api: {
    filesystem: {
      home(): TFiletreeSafeResult<TFiletreeHomeResponse | TFiletreeErrorResponse>;
      list(args: { query: { path: string; omitFiles?: boolean } }): TFiletreeSafeResult<TFiletreeListResponse | TFiletreeErrorResponse>;
      files(args: { query: { path: string; max_depth?: number } }): TFiletreeSafeResult<TFiletreeFilesResponse | TFiletreeErrorResponse>;
      move(args: { body: { source_path: string; destination_dir_path: string } }): TFiletreeSafeResult<TFiletreeMoveResponse | TFiletreeErrorResponse>;
      inspect(args: { query: { path: string } }): TFiletreeSafeResult<TFileInspectResponse | TFiletreeErrorResponse>;
      read(args: { query: { path: string; maxBytes?: number; content?: "text" | "base64" | "binary" | "none" } }): TFiletreeSafeResult<TFileReadResponse>;
      write(args: { query: { path: string; content: string } }): TFiletreeSafeResult<TFileWriteResponse>;
      watch(args: { path: string; watchId: string }, options?: { signal?: AbortSignal }): Promise<[unknown, AsyncIterable<TFiletreeWatchEvent> | null | undefined]>;
      keepaliveWatch(args: { watchId: string }): TFiletreeSafeResult<boolean>;
      unwatch(args: { watchId: string }): TFiletreeSafeResult<unknown>;
    };
  };
};

export type TFileSafeClient = TFiletreeSafeClient;

export type TPty = {
  id: string;
  title: string;
  command: string;
  args: string[];
  cwd: string;
  status: "running" | "exited" | string;
  pid: number;
  rows?: number;
  cols?: number;
  exitCode?: number | null;
  signalCode?: string | null;
  createdAt?: number;
  updatedAt?: number;
};

export type TPtyCreateBody = {
  command?: string;
  args?: string[];
  cwd?: string;
  title?: string;
  env?: Record<string, string>;
  size?: {
    rows: number;
    cols: number;
  };
};

export type TPtyUpdateBody = {
  title?: string;
  size?: {
    rows: number;
    cols: number;
  };
};

type TTerminalSafeResult<T> = Promise<[unknown, T | null | undefined]>;

export type TTerminalSafeClient = {
  api: {
    pty: {
      list(args: { workingDirectory: string }): TTerminalSafeResult<TPty[]>;
      create(args: { workingDirectory: string; body?: TPtyCreateBody }): TTerminalSafeResult<TPty>;
      get(args: { workingDirectory: string; path: { ptyID: string } }): TTerminalSafeResult<TPty>;
      update(args: { workingDirectory: string; path: { ptyID: string }; body: TPtyUpdateBody }): TTerminalSafeResult<TPty>;
      remove(args: { workingDirectory: string; path: { ptyID: string } }): TTerminalSafeResult<unknown>;
    };
  };
};

export type TTerminalCapability = {
  safeClient: TTerminalSafeClient;
};

export type TFiletreeCapability = {
  canvasId: string;
  safeClient: TFiletreeSafeClient;
};

export type TFileCapability = {
  safeClient: TFileSafeClient;
};

export interface IState {
  mode: CanvasMode;
  theme: Theme;
  selection: (Group | Shape<ShapeConfig>)[];
  focusedId: string | null;
  editingTextId: string | null;
  editingShape1dId: string | null;
}
