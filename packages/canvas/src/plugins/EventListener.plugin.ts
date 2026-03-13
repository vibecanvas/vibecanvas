import type { IPlugin, IPluginContext, TKeyboardEvent, TMouseEvent, TPointerEvent, TWheelEvent } from "./interface";

export class EventListenerPlugin implements IPlugin {
  apply(context: IPluginContext): void {
    const { hooks, stage } = context;

    const onpointerdown = (event: TPointerEvent) => {
      hooks.pointerDown.call(event);
    };

    const onpointerup = (event: TPointerEvent) => {
      hooks.pointerUp.call(event);
    };

    const onpointermove = (event: TMouseEvent) => {
      hooks.pointerMove.call(event);
    };

    const onpointerout = (event: TPointerEvent) => {
      hooks.pointerOut.call(event);
    };

    const onpointerover = (event: TPointerEvent) => {
      hooks.pointerOver.call(event);
    };

    const onpointercancel = (event: TPointerEvent) => {
      hooks.pointerCancel.call(event);
    };

    const onpointerwheel = (event: TWheelEvent) => {
      hooks.pointerWheel.call(event);
    };

    const onkeydown = (event: TKeyboardEvent) => {
      hooks.keydown.call(event);
    };

    const onkeyup = (event: TKeyboardEvent) => {
      hooks.keyup.call(event);
    };


    stage.on(`pointerdown`, onpointerdown);

    stage.on(`pointerup`, onpointerup);

    stage.on(`pointermove`, onpointermove);

    stage.on(`pointerout`, onpointerout);

    stage.on(`pointerover`, onpointerover);

    stage.on(`pointercancel`, onpointercancel);

    stage.on(`wheel`, onpointerwheel);

    stage.on(`pointerout`, onpointerout);

    stage.on(`pointerover`, onpointerover);

    stage.on(`pointercancel`, onpointercancel);

    stage.on(`wheel`, onpointerwheel);

    stage.on(`keydown`, onkeydown);

    stage.on(`keyup`, onkeyup);

    hooks.destroy.tap(() => {
      stage.off(`pointerdown`, onpointerdown);
      stage.off(`pointerup`, onpointerup);
      stage.off(`pointermove`, onpointermove);
      stage.off(`pointerout`, onpointerout);
      stage.off(`pointerover`, onpointerover);
      stage.off(`pointercancel`, onpointercancel);
      stage.off(`wheel`, onpointerwheel);
      stage.off(`keydown`, onkeydown);
      stage.off(`keyup`, onkeyup);
    });
  }
}
