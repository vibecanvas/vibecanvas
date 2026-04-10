export type TPtyStatus = "running" | "exited" | "error";

export type TPty = {
  id: string;
  title: string;
  command: string;
  args: string[];
  cwd: string;
  status: TPtyStatus | string;
  pid: number;
  rows: number;
  cols: number;
  exitCode: number | null;
  signalCode: string | null;
  createdAt: number;
  updatedAt: number;
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

export type TPtyAttachArgs = {
  workingDirectory: string;
  ptyID: string;
  cursor?: number;
  send: (data: Uint8Array) => void;
  close?: (code?: number, reason?: string) => void;
};

export type TPtyAttachment = {
  send: (payload: string | ArrayBuffer | ArrayBufferView) => void;
  detach: () => void;
};
