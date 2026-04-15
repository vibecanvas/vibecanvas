import type { DocHandle, DocHandleChangePayload, DocHandleDeletePayload, DocHandleEphemeralMessagePayload } from "@automerge/automerge-repo";
import type { IService, IStartableService, IStoppableService } from "@vibecanvas/runtime";
import type { TCanvasDoc } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { SyncHook } from "@vibecanvas/tapable";
import { fxCreateCrdtBuilder, type TCrdtBuilder, type TCrdtRecordedOp } from "./fxBuilder";
import { txApplyCrdtOps } from "./tx.apply-ops";

export type TCrdtServiceArgs = {
  docHandle: DocHandle<TCanvasDoc>;
};

export interface TCrdtServiceHooks {
  change: SyncHook<[]>;
  write: SyncHook<[TCrdtRecordedOp[]]>;
}

export class CrdtService implements IService<TCrdtServiceHooks>, IStartableService, IStoppableService {
  readonly name = "crdt";
  readonly docHandle: DocHandle<TCanvasDoc>;
  readonly hooks: TCrdtServiceHooks = {
    change: new SyncHook(),
    write: new SyncHook(),
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
    const builder = fxCreateCrdtBuilder({
      docHandle: this.docHandle,
      clone: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    }, {});

    const wrappedBuilder: TCrdtBuilder = {
      patchElement: ((id: string, keyOrValue: unknown, nestedOrValue?: unknown, maybeValue?: unknown) => {
        if (maybeValue !== undefined) {
          builder.patchElement(id, keyOrValue as never, nestedOrValue as never, maybeValue as never);
          return wrappedBuilder;
        }

        if (nestedOrValue !== undefined) {
          builder.patchElement(id, keyOrValue as never, nestedOrValue as never);
          return wrappedBuilder;
        }

        builder.patchElement(id, keyOrValue as never);
        return wrappedBuilder;
      }) as TCrdtBuilder["patchElement"],
      patchGroup: ((id: string, keyOrValue: unknown, nestedOrValue?: unknown, maybeValue?: unknown) => {
        if (maybeValue !== undefined) {
          builder.patchGroup(id, keyOrValue as never, nestedOrValue as never, maybeValue as never);
          return wrappedBuilder;
        }

        if (nestedOrValue !== undefined) {
          builder.patchGroup(id, keyOrValue as never, nestedOrValue as never);
          return wrappedBuilder;
        }

        builder.patchGroup(id, keyOrValue as never);
        return wrappedBuilder;
      }) as TCrdtBuilder["patchGroup"],
      deleteElement: ((id: string, key?: never, nestedKey?: never) => {
        if (nestedKey !== undefined) {
          builder.deleteElement(id, key, nestedKey);
          return wrappedBuilder;
        }

        if (key !== undefined) {
          builder.deleteElement(id, key);
          return wrappedBuilder;
        }

        builder.deleteElement(id);
        return wrappedBuilder;
      }) as TCrdtBuilder["deleteElement"],
      deleteGroup: ((id: string, key?: never, nestedKey?: never) => {
        if (nestedKey !== undefined) {
          builder.deleteGroup(id, key, nestedKey);
          return wrappedBuilder;
        }

        if (key !== undefined) {
          builder.deleteGroup(id, key);
          return wrappedBuilder;
        }

        builder.deleteGroup(id);
        return wrappedBuilder;
      }) as TCrdtBuilder["deleteGroup"],
      commit: () => {
        let commitResult: ReturnType<typeof builder.commit> | null = null;

        this.#runLocalChange(() => {
          commitResult = builder.commit();
        });

        if (commitResult === null) {
          throw new Error("CRDT builder commit failed to produce a result");
        }

        this.hooks.write.call(commitResult.redoOps);

        return {
          ...commitResult,
          rollback: () => {
            this.applyOps({ ops: commitResult.undoOps });
          },
        };
      },
    };

    return wrappedBuilder;
  }

  applyOps(args: { ops: TCrdtRecordedOp[] }) {
    this.#runLocalChange(() => {
      txApplyCrdtOps({
        docHandle: this.docHandle,
        clone: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
      }, args);
    });
    this.hooks.write.call(args.ops);
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
    } catch (error) {
      this.#pendingLocalChangeEvents = Math.max(0, this.#pendingLocalChangeEvents - 1);
      throw error;
    }
  }

}
