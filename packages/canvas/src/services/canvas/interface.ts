import type { TOrpcSafeClient } from "@vibecanvas/orpc-client";
import type { TElement, TFileData, TFiletreeData, TTerminalData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
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

export type TFiletreeUnreadableReason = "permission_denied";

export type TFiletreeNode = {
  name: string;
  path: string;
  is_dir: boolean;
  is_unreadable?: boolean;
  unreadable_reason?: TFiletreeUnreadableReason;
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

export type TTerminalCapability = {
  apiService: TOrpcSafeClient;
};

export type TFiletreeCapability = {
  canvasId: string;
  apiService: TOrpcSafeClient;
};

export type TFileCapability = {
  apiService: TOrpcSafeClient;
};

export interface IState {
  mode: CanvasMode;
  theme: Theme;
  selection: (Group | Shape<ShapeConfig>)[];
  focusedId: string | null;
  editingTextId: string | null;
  editingShape1dId: string | null;
}
