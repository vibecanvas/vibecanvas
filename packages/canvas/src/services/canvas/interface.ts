import type { TChatData, TElement, TFiletreeData, TTerminalData } from "@vibecanvas/shell/automerge/index";
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

export type THostedWidgetType = "chat" | "filetree" | "terminal";

export type THostedWidgetElementMap = {
  chat: TElement & { data: TChatData };
  filetree: TElement & { data: TFiletreeData };
  terminal: TElement & { data: TTerminalData };
};

export type TPty = {
  id: string;
  title: string;
  command: string;
  args: string[];
  cwd: string;
  status: "running" | "exited" | string;
  pid: number;
};

export type TPtyCreateBody = {
  command?: string;
  args?: string[];
  cwd?: string;
  title?: string;
  env?: Record<string, string>;
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
    opencode: {
      pty: {
        list(args: { workingDirectory: string }): TTerminalSafeResult<TPty[]>;
        create(args: { workingDirectory: string; body?: TPtyCreateBody }): TTerminalSafeResult<TPty>;
        get(args: { workingDirectory: string; path: { ptyID: string } }): TTerminalSafeResult<TPty>;
        update(args: { workingDirectory: string; path: { ptyID: string }; body: TPtyUpdateBody }): TTerminalSafeResult<TPty>;
        remove(args: { workingDirectory: string; path: { ptyID: string } }): TTerminalSafeResult<unknown>;
      };
    };
  };
};

export type TTerminalCapability = {
  safeClient: TTerminalSafeClient;
};

export interface IState {
  mode: CanvasMode;
  theme: Theme;
  selection: (Group | Shape<ShapeConfig>)[];
  editingTextId: string | null;
  editingShape1dId: string | null;
}
