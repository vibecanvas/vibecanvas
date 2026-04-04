import type { TCanvasDoc, TElement, TGroup } from '@vibecanvas/shell/automerge/index';
import type { TCanvasCmdContext, TCanvasDocHandle, TCanvasRow, TWaitForCanvasMutationArgs } from '../src';

export function createRectElement(overrides: Partial<TElement> = {}): TElement {
  return {
    id: 'element-1',
    x: 10,
    y: 20,
    rotation: 0,
    zIndex: 'a0',
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: 1,
    updatedAt: 2,
    data: {
      type: 'rect',
      w: 100,
      h: 80,
    },
    style: {
      backgroundColor: '#ff0000',
      strokeColor: '#111111',
      strokeWidth: 2,
      opacity: 1,
    },
    ...overrides,
  };
}

export function createTextElement(overrides: Partial<TElement> = {}): TElement {
  return {
    id: 'text-1',
    x: 200,
    y: 120,
    rotation: 0,
    zIndex: 'a1',
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: 1,
    updatedAt: 2,
    data: {
      type: 'text',
      w: 120,
      h: 40,
      text: 'hello',
      originalText: 'hello',
      fontSize: 16,
      fontFamily: 'Inter',
      textAlign: 'left',
      verticalAlign: 'top',
      lineHeight: 1.2,
      link: null,
      containerId: null,
      autoResize: false,
    },
    style: {
      backgroundColor: '#ffffff',
      strokeColor: '#222222',
      strokeWidth: 1,
      opacity: 1,
    },
    ...overrides,
  };
}

export function createGroup(overrides: Partial<TGroup> = {}): TGroup {
  return {
    id: 'group-1',
    parentGroupId: null,
    zIndex: 'g0',
    locked: false,
    createdAt: 1,
    ...overrides,
  };
}

export function createCanvasDoc(overrides: Partial<TCanvasDoc> = {}): TCanvasDoc {
  return {
    id: 'doc-1',
    name: 'Canvas A',
    elements: {},
    groups: {},
    ...overrides,
  };
}

type TCreateContextArgs = {
  rows: TCanvasRow[];
  docs: Record<string, TCanvasDoc>;
  source?: 'offline' | 'live';
};

export function createMockContext(args: TCreateContextArgs): TCanvasCmdContext & { waitCalls: TWaitForCanvasMutationArgs[] } {
  const source = args.source ?? 'offline';
  const docs = new Map<string, TCanvasDoc>(Object.entries(args.docs));
  const waitCalls: TWaitForCanvasMutationArgs[] = [];

  return {
    async listCanvasRows() {
      return args.rows;
    },
    async loadCanvasHandle(row): Promise<TCanvasDocHandle> {
      const doc = docs.get(row.automerge_url);
      if (!doc) throw new Error(`Missing doc for ${row.automerge_url}`);

      return {
        source,
        handle: {
          url: row.automerge_url,
          doc() {
            return doc;
          },
          change(callback: (nextDoc: TCanvasDoc) => void) {
            callback(doc);
          },
        } as never,
      };
    },
    async waitForMutation(waitArgs) {
      waitCalls.push(waitArgs);
      const doc = waitArgs.handle.doc();
      if (!doc) throw new Error(`Canvas doc '${waitArgs.automergeUrl}' is unavailable.`);
      if (!waitArgs.predicate(doc)) {
        throw new Error(`Mutation predicate failed for '${waitArgs.automergeUrl}'.`);
      }
      return structuredClone(doc);
    },
    waitCalls,
  };
}
