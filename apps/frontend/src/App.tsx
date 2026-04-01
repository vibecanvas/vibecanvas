import type { RouteSectionProps } from "@solidjs/router";
import { Toaster, showToast } from "./components/ui/Toast";
import { onMount } from "solid-js";
import { Sidebar } from "./feature/sidebar";
import { store } from "./store";

const App = (props: RouteSectionProps) => {
  onMount(() => {
    document.addEventListener("wheel", (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    }, { passive: false });
  });

  return (
    <div class="flex h-screen bg-background">
      <Sidebar
        visible={store.sidebarVisible}
        onSettingsClick={() => showToast("Settings", "Coming soon...")}
      />
      {/* Main content area - routed pages render here */}
      <main id="main" class="flex-1 relative overflow-hidden">
        {props.children}
        <div
          id="canvas-overlay-entrypoint"
          class="absolute inset-0 pointer-events-none overflow-hidden"
        />
      </main>
      <Toaster />
    </div>
  );
};

export default App;
