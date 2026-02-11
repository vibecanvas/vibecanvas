import { Show, type Component } from "solid-js";
import { Toaster, showToast } from "./components/ui/Toast";
import { CanvasComponent } from "./features/canvas-crdt/Canvas";
import { ContextMenu } from "./features/context-menu";
import { FloatingDrawingToolbar } from "./features/floating-drawing-toolbar/components/FloatingDrawingToolbar";
import { SelectionStyleMenu } from "./features/floating-selection-menu";
import { InfoCard } from "./features/info-card/components/InfoCard";
import { Sidebar } from "./features/sidebar";
import { setActiveCanvasId, store } from "./store";
import { onMount } from "solid-js";


const App: Component = () => {

  onMount(() => {
    document.addEventListener("wheel", (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    }, { passive: false })
  })

  const selectedCanvas = () => {
    const canvasData = store.canvasSlice.backendCanvasActive;
    const viewData = store.canvasSlice.canvasViewportActive;
    if (!canvasData || !viewData) return null;
    return { canvasData, viewData };
  }

  return (
    <div class="flex h-screen bg-background">
      <Sidebar
        visible={store.sidebarVisible}
        onSettingsClick={() => showToast("Settings", "Coming soon...")}
      />
      {/* Main content area */}
      <main id="main" class="flex-1 relative overflow-hidden">
        <FloatingDrawingToolbar />
        <SelectionStyleMenu />
        {/*<InfoCard />*/}
        <Show when={selectedCanvas()} keyed>
          {(data) => <CanvasComponent canvasData={data.canvasData} viewData={data.viewData} />}
        </Show>
        <div
          id="canvas-overlay-entrypoint"
          class="absolute inset-0 pointer-events-none overflow-hidden"
        />
      </main>
      <Toaster />
      <ContextMenu />
    </div>
  );
};

export default App;
