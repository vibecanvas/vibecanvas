import type { DocHandle, DocHandleChangePayload, DocHandleDeletePayload, DocHandleEphemeralMessagePayload } from "@automerge/automerge-repo";
import type { IService, IStartableService, IStoppableService } from "@vibecanvas/runtime";
import type { TCanvasDoc, TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { SyncHook } from "@vibecanvas/tapable";
import { fxCreateCrdtBuilder, type TCrdtBuilder, type TCrdtRecordedOp } from "./fxBuilder";
import { txApplyCrdtOps } from "./tx.apply-ops";

export type TCrdtServiceArgs = {
  docHandle: DocHandle<TCanvasDoc>;
};

export interface TCrdtServiceHooks {
  change: SyncHook<[]>;
}

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

  build(): TCrdtBuilder {
    return fxCreateCrdtBuilder({
      docHandle: this.docHandle,
      clone: <T>(value: T): T => structuredClone(value),
    }, {});
  }

  applyOps(args: { ops: TCrdtRecordedOp[] }) {
    this.#runLocalChange(() => {
      txApplyCrdtOps({
        docHandle: this.docHandle,
        clone: <T>(value: T): T => structuredClone(value),
      }, args);
    });
  }

  patch(data: { elements: TElement[]; groups: TGroup[] }) {
    const builder = this.build();

    for (const element of data.elements) {
      builder.patchElement(element.id, element);
    }

    for (const group of data.groups) {
      builder.patchGroup(group.id, group);
    }

    this.#runLocalChange(() => {
      builder.commit();
    });
  }

  deleteById(args: { elementIds?: string[]; groupIds?: string[] }) {
    const builder = this.build();

    for (const id of args.elementIds ?? []) {
      builder.deleteElement(id);
    }

    for (const id of args.groupIds ?? []) {
      builder.deleteGroup(id);
    }

    this.#runLocalChange(() => {
      builder.commit();
    });
  }

  consumePendingLocalChangeEvent() {
    if (this.#pendingLocalChangeEvents <= 0) {
      return false;
    }

    this.#pendingLocalChangeEvents -= 1;
    return true;
  }

  #runLocalChange(callback: () => void) {
    this.#pendingLocalChangeEvents += 1;

    try {
      callback();
    } finally {
      this.#pendingLocalChangeEvents = Math.max(0, this.#pendingLocalChangeEvents - 1);
    }
  }

}
