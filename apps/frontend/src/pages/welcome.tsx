import type { Component } from "solid-js";

const WelcomePage: Component = () => {
  return (
    <div class="flex items-center justify-center h-full">
      <div class="text-center max-w-md space-y-4">
        <h2 class="text-2xl font-display tracking-wide text-foreground">
          Welcome to Vibecanvas
        </h2>
        <p class="text-sm text-muted-foreground leading-relaxed">
          Select a canvas from the sidebar or create a new one to get started.
        </p>
      </div>
    </div>
  );
};

export default WelcomePage;
