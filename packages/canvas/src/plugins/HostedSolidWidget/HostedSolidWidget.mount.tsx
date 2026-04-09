import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { render } from "solid-js/web";
import type Konva from "konva";
import { FileHostedWidget } from "../../components/file";
import { FiletreeHostedWidget } from "../../components/filetree";
import { TerminalHostedWidget } from "../../components/terminal";
import { CanvasMode } from "../../services/canvas/enum";
import type { IPluginContext } from "../shared/interface";
import { scheduleHostedWidgetFocus } from "../shared/hosted-widget-focus.shared";
import { HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR } from "../shared/hosted-widget.shared";
import { HOSTED_ELEMENT_ATTR } from "./HostedSolidWidget.constants";
import { HostedWidgetShell } from "./HostedWidgetShell";
import type { TMountRecord, THostedWidgetChrome, THostedWidgetElement, THostedWidgetElementMap } from "./HostedSolidWidget.types";

export function createHostedWidgetMount(
  runtime: {
    context: IPluginContext;
    node: Konva.Rect;
    selectHostedNode: (context: IPluginContext, node: Konva.Rect, event: PointerEvent | MouseEvent) => void;
    beginDomDrag: (context: IPluginContext, node: Konva.Rect, event: PointerEvent | MouseEvent) => void;
    showTransformerForNode: (context: IPluginContext, node: Konva.Rect) => void;
    removeHostedNode: (context: IPluginContext, node: Konva.Rect) => Promise<void>;
    reloadHostedNode: (context: IPluginContext, node: Konva.Rect) => Promise<void>;
    openFilePreview: (context: IPluginContext, node: Konva.Rect, path: string) => void;
    mountWidgetFromUpdate: (node: Konva.Rect, element: THostedWidgetElement) => void;
    syncMountedNode: (node: Konva.Rect) => void;
    toElement: (node: Konva.Rect) => THostedWidgetElement;
  },
  payload: { mountElement: HTMLDivElement; element: THostedWidgetElement },
): TMountRecord {
  const { context, node, mountElement } = { ...runtime, ...payload };
  const [currentElement, setCurrentElement] = createSignal(payload.element);
  const [windowChrome, setWindowChrome] = createSignal<THostedWidgetChrome | null>(null);
  const [beforeRemove, setBeforeRemove] = createSignal<(() => void | Promise<void>) | null>(null);
  const [focus, setFocus] = createSignal<(() => void) | null>(null);
  const [insertText, setInsertText] = createSignal<((text: string) => void) | null>(null);
  const [autoSize, setAutoSize] = createSignal<((size: { width: number; height: number }) => void) | null>(null);

  const dispose = render(() => {
    createEffect(() => {
      const transformerVisible =
        context.state.selection.some((candidate) => candidate.id() === node.id())
        && node.getAttr(HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR) === true;
      const interactive = context.state.focusedId === node.id() && context.state.mode === CanvasMode.SELECT && !transformerVisible;
      mountElement.style.pointerEvents = interactive ? "auto" : "none";
      mountElement.dataset.hostedWidgetInteractive = interactive ? "true" : "false";
      mountElement.toggleAttribute("inert", !interactive);

      if (!interactive) return;
      const cleanupFocus = scheduleHostedWidgetFocus(mountElement);
      onCleanup(cleanupFocus);
    });

    return (
      <HostedWidgetShell
        element={currentElement}
        windowChrome={windowChrome}
        isFocused={() => context.state.focusedId === node.id()}
        isInteractive={() => {
          const transformerVisible =
            context.state.selection.some((candidate) => candidate.id() === node.id())
            && node.getAttr(HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR) === true;
          return context.state.focusedId === node.id() && context.state.mode === CanvasMode.SELECT && !transformerVisible;
        }}
        onSelectPointerDown={(event) => {
          runtime.selectHostedNode(context, node, event);
        }}
        onHeaderPointerDown={(event) => {
          runtime.beginDomDrag(context, node, event);
        }}
        onHeaderDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          runtime.showTransformerForNode(context, node);
        }}
        onRemove={() => {
          void runtime.removeHostedNode(context, node);
        }}
        onReload={() => {
          void runtime.reloadHostedNode(context, node);
        }}
      >
        <Show when={currentElement().data.type === "filetree"}>
          <FiletreeHostedWidget
            element={currentElement as () => THostedWidgetElementMap["filetree"]}
            safeClient={context.capabilities.filetree?.safeClient}
            setWindowChrome={(chrome) => setWindowChrome(() => chrome)}
            onPathChange={(path) => {
              const snapshot = structuredClone(node.getAttr(HOSTED_ELEMENT_ATTR) as THostedWidgetElement | undefined);
              if (!snapshot || snapshot.data.type !== "filetree") return;
              if (snapshot.data.path === path) return;

              const nextElement: THostedWidgetElementMap["filetree"] = {
                ...snapshot,
                updatedAt: Date.now(),
                data: {
                  ...snapshot.data,
                  path,
                },
              };

              node.setAttr(HOSTED_ELEMENT_ATTR, structuredClone(nextElement));
              runtime.mountWidgetFromUpdate(node, nextElement);
              context.crdt.patch({ elements: [nextElement], groups: [] });
            }}
            onOpenFile={(path) => {
              runtime.openFilePreview(context, node, path);
            }}
          />
        </Show>
        <Show when={currentElement().data.type === "file"}>
          <FileHostedWidget
            element={currentElement as () => THostedWidgetElementMap["file"]}
            safeClient={context.capabilities.file?.safeClient}
            setWindowChrome={(chrome) => setWindowChrome(() => chrome)}
            requestInitialSize={(size) => autoSize()?.(size)}
          />
        </Show>
        <Show when={currentElement().data.type === "terminal"}>
          <TerminalHostedWidget
            element={currentElement as () => THostedWidgetElementMap["terminal"]}
            safeClient={context.capabilities.terminal?.safeClient}
            setWindowChrome={(chrome) => setWindowChrome(() => chrome)}
            registerBeforeRemove={(handler) => setBeforeRemove(() => handler)}
            registerFocus={(handler) => setFocus(() => handler)}
            registerInsertText={(handler) => setInsertText(() => handler)}
          />
        </Show>
      </HostedWidgetShell>
    );
  }, mountElement);

  const record: TMountRecord = {
    node,
    mountElement,
    dispose,
    setElement: (nextElement) => setCurrentElement(() => nextElement),
    setWindowChrome: (nextWindowChrome) => setWindowChrome(() => nextWindowChrome),
    beforeRemove: () => beforeRemove()?.(),
    setBeforeRemove: (handler) => setBeforeRemove(() => handler),
    focus: () => focus()?.(),
    setFocus: (handler) => setFocus(() => handler),
    insertText: (text) => insertText()?.(text),
    setInsertText: (handler) => setInsertText(() => handler),
    setAutoSize: (handler) => setAutoSize(() => handler),
  };

  if (payload.element.data.type === "file") {
    record.setAutoSize((size) => {
      const snapshot = structuredClone(node.getAttr(HOSTED_ELEMENT_ATTR) as THostedWidgetElement | undefined);
      if (!snapshot || snapshot.data.type !== "file") return;
      if (snapshot.data.w !== 560 || snapshot.data.h !== 500) return;

      node.width(size.width);
      node.height(size.height);
      const nextElement = runtime.toElement(node);
      node.setAttr(HOSTED_ELEMENT_ATTR, structuredClone(nextElement));
      runtime.mountWidgetFromUpdate(node, nextElement);
      runtime.syncMountedNode(node);
      context.crdt.patch({ elements: [nextElement], groups: [] });
      context.stage.batchDraw();
    });
  }

  return record;
}
