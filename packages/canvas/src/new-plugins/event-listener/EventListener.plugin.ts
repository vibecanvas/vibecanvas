import type { IPlugin } from "@vibecanvas/runtime";
import type { RenderService } from "../../new-services/render/RenderService";
import type { IHooks, TMouseEvent, TPointerEvent, TWheelEvent } from "../../runtime";

function isInsideHostedWidget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest('[data-hosted-widget-root="true"]') !== null;
}

/**
 * Bridges stage and DOM input into runtime hooks.
 * Keeps raw input wiring out of feature plugins.
 */
export function createEventListenerPlugin(): IPlugin<{
  render: RenderService;
}, IHooks> {
  return {
    name: "event-listener",
    apply(ctx) {
      ctx.hooks.init.tap(() => {
        const render = ctx.services.require("render");
        const stage = render.stage;
        const container = stage.container();

        const onPointerDown = (event: TPointerEvent) => {
          ctx.hooks.pointerDown.call(event);
        };

        const onPointerUp = (event: TPointerEvent) => {
          ctx.hooks.pointerUp.call(event);
        };

        const onPointerMove = (event: TMouseEvent) => {
          ctx.hooks.pointerMove.call(event);
        };

        const onPointerOut = (event: TPointerEvent) => {
          ctx.hooks.pointerOut.call(event);
        };

        const onPointerOver = (event: TPointerEvent) => {
          ctx.hooks.pointerOver.call(event);
        };

        const onPointerCancel = (event: TPointerEvent) => {
          ctx.hooks.pointerCancel.call(event);
        };

        const onPointerWheel = (event: TWheelEvent) => {
          ctx.hooks.pointerWheel.call(event);
        };

        const onKeyDown = (event: KeyboardEvent) => {
          if (isInsideHostedWidget(event.target)) return;
          ctx.hooks.keydown.call(event);
        };

        const onKeyUp = (event: KeyboardEvent) => {
          if (isInsideHostedWidget(event.target)) return;
          ctx.hooks.keyup.call(event);
        };

        stage.on("pointerdown", onPointerDown);
        stage.on("pointerup", onPointerUp);
        stage.on("pointermove", onPointerMove);
        stage.on("pointerout", onPointerOut);
        stage.on("pointerover", onPointerOver);
        stage.on("pointercancel", onPointerCancel);
        stage.on("wheel", onPointerWheel);

        container.addEventListener("keydown", onKeyDown);
        container.addEventListener("keyup", onKeyUp);
        container.tabIndex = 1;
        container.focus();
        container.style.outline = "none";

        ctx.hooks.destroy.tap(() => {
          stage.off("pointerdown", onPointerDown);
          stage.off("pointerup", onPointerUp);
          stage.off("pointermove", onPointerMove);
          stage.off("pointerout", onPointerOut);
          stage.off("pointerover", onPointerOver);
          stage.off("pointercancel", onPointerCancel);
          stage.off("wheel", onPointerWheel);
          container.removeEventListener("keydown", onKeyDown);
          container.removeEventListener("keyup", onKeyUp);
        });
      });
    },
  };
}
