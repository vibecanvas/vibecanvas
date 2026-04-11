import type { DocHandle, DocHandleChangePayload, DocHandleDeletePayload, DocHandleEphemeralMessagePayload } from "@automerge/automerge-repo";
import type { IService, IStartableService, IStoppableService } from "@vibecanvas/runtime";
import type { TCanvasDoc, TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { SyncHook } from "@vibecanvas/tapable";
import diff from "microdiff";

export type TDeepPartial<T> = T extends Array<infer U>
  ? Array<TDeepPartial<U>>
  : T extends object
    ? { [K in keyof T]?: TDeepPartial<T[K]> }
    : T;

export type TEntityPatch<T extends { id: string }> = Pick<T, "id"> & TDeepPartial<Omit<T, "id">>;
export type TElementPatch = TEntityPatch<TElement>;
export type TGroupPatch = TEntityPatch<TGroup>;

export type TCrdtServiceArgs = {
  docHandle: DocHandle<TCanvasDoc>;
};

export interface TCrdtServiceHooks {
  change: SyncHook<[]>;
}

/**
 * Wraps Automerge canvas document reads and writes.
 * Keeps patch and delete behavior out of feature plugins.
 */
export class CrdtService implements IService<TCrdtServiceHooks>, IStartableService, IStoppableService {
  readonly name = "crdt";
  readonly docHandle: DocHandle<TCanvasDoc>;
  readonly hooks: TCrdtServiceHooks = {
    change: new SyncHook(),
  };

  started = false;

  #pendingLocalChangeEvents = 0;
  #onDocChange = (_payload: DocHandleChangePayload<TCanvasDoc>) => {
    this.hooks.change.call();
  };
  #onDocDelete = (_payload: DocHandleDeletePayload<TCanvasDoc>) => {
    this.hooks.change.call();
  };
  #onDocEphemeralMessage = (_payload: DocHandleEphemeralMessagePayload<TCanvasDoc>) => {};

  constructor(args: TCrdtServiceArgs) {
    this.docHandle = args.docHandle;
  }

  start(): void | Promise<void> {
    if (this.started) {
      return;
    }

    this.docHandle.on("change", this.#onDocChange as (payload: DocHandleChangePayload<unknown>) => void);
    this.docHandle.on("delete", this.#onDocDelete as (payload: DocHandleDeletePayload<unknown>) => void);
    this.docHandle.on("ephemeral-message", this.#onDocEphemeralMessage as (payload: DocHandleEphemeralMessagePayload<unknown>) => void);
    this.started = true;
  }

  stop(): void | Promise<void> {
    if (!this.started) {
      return;
    }

    this.docHandle.off("change", this.#onDocChange as (payload: DocHandleChangePayload<unknown>) => void);
    this.docHandle.off("delete", this.#onDocDelete as (payload: DocHandleDeletePayload<unknown>) => void);
    this.docHandle.off("ephemeral-message", this.#onDocEphemeralMessage as (payload: DocHandleEphemeralMessagePayload<unknown>) => void);
    this.started = false;
  }

  doc() {
    return this.docHandle.doc();
  }

  patch(data: { elements: TElementPatch[]; groups: TGroupPatch[] }) {
    this.#runLocalChange((doc) => {
      this.#patchCollection(doc.elements, data.elements);
      this.#patchCollection(doc.groups, data.groups);
    });
  }

  deleteById(args: { elementIds?: string[]; groupIds?: string[] }) {
    this.#runLocalChange((doc) => {
      for (const id of args.elementIds ?? []) {
        delete doc.elements[id];
      }

      for (const id of args.groupIds ?? []) {
        delete doc.groups[id];
      }
    });
  }

  consumePendingLocalChangeEvent() {
    if (this.#pendingLocalChangeEvents <= 0) {
      return false;
    }

    this.#pendingLocalChangeEvents -= 1;
    return true;
  }

  #runLocalChange(callback: (doc: TCanvasDoc) => void) {
    this.#pendingLocalChangeEvents += 1;

    try {
      this.docHandle.change((doc) => {
        callback(doc);
      });
    } finally {
      this.#pendingLocalChangeEvents = Math.max(0, this.#pendingLocalChangeEvents - 1);
    }
  }

  #patchCollection<TItem extends { id: string }>(collection: Record<string, TItem>, items: TEntityPatch<TItem>[]) {
    for (const item of items) {
      const existing = collection[item.id];
      if (!existing) {
        collection[item.id] = cloneValue(item) as TItem;
        continue;
      }

      const current = cloneValue(existing);
      const next = mergeEntityPatch(current, item);
      for (const change of diff(current, next)) {
        if (change.path[0] === "id") {
          continue;
        }

        if (change.type === "REMOVE") {
          removeAtPath(existing, change.path);
          continue;
        }

        setAtPath(existing, change.path, change.value);
      }
    }
  }
}

function mergeEntityPatch<T extends { id: string }>(existing: T, patch: TEntityPatch<T>): T {
  return mergePatch(existing, patch as TDeepPartial<T>);
}

function mergePatch<T>(existing: T, patch: TDeepPartial<T>): T {
  if (patch === undefined) {
    return existing;
  }

  if (Array.isArray(patch)) {
    const current = Array.isArray(existing) ? existing : [];
    return patch.map((value, index) => mergePatch(current[index], value)) as T;
  }

  if (isPlainObject(patch)) {
    const current = isPlainObject(existing) ? existing : {};
    const result: Record<string, unknown> = { ...current };

    for (const key of Object.keys(patch)) {
      const value = patch[key as keyof typeof patch];
      result[key] = mergePatch((current as Record<string, unknown>)[key], value);
    }

    return result as T;
  }

  return patch as T;
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T;
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = cloneValue(nestedValue);
    }

    return result as T;
  }

  return value;
}

function setAtPath(target: unknown, path: Array<string | number>, value: unknown): void {
  if (path.length === 0) {
    return;
  }

  const parent = getOrCreateParent(target, path);
  const key = path[path.length - 1];

  if (Array.isArray(parent) && typeof key === "number") {
    if (key === parent.length) {
      parent.push(value);
      return;
    }

    parent[key] = value;
    return;
  }

  (parent as Record<string | number, unknown>)[key] = value;
}

function removeAtPath(target: unknown, path: Array<string | number>): void {
  if (path.length === 0) {
    return;
  }

  const parent = getExistingParent(target, path);
  if (parent === null) {
    return;
  }

  const key = path[path.length - 1];
  if (Array.isArray(parent) && typeof key === "number") {
    parent.splice(key, 1);
    return;
  }

  delete (parent as Record<string | number, unknown>)[key];
}

function getOrCreateParent(target: unknown, path: Array<string | number>): unknown {
  let current = target;

  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const nextKey = path[index + 1];
    const currentRecord = current as Record<string | number, unknown>;

    if (currentRecord[key] === undefined) {
      currentRecord[key] = typeof nextKey === "number" ? [] : {};
    }

    current = currentRecord[key];
  }

  return current;
}

function getExistingParent(target: unknown, path: Array<string | number>): unknown | null {
  let current = target;

  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const currentRecord = current as Record<string | number, unknown>;

    if (!(key in currentRecord)) {
      return null;
    }

    current = currentRecord[key];
  }

  return current;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
