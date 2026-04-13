
import type { IPlugin } from "@vibecanvas/runtime";
import type { RenderService, EditorService } from "../../new-services";
import type { IHooks, TElementPointerEvent, TMouseEvent, TPointerEvent, TWheelEvent } from "../../runtime";

/**
 *
 */
export function createExampleUiPlugin(): IPlugin<{
  render: RenderService;
  editor: EditorService;
}, IHooks> {
  return {
    name: "example-ui",
    apply(ctx) {
      ctx.hooks.init.tap(() => {
        console.log('starting example ui')
        const editorSrv = ctx.services.require('editor')
        editorSrv.registerTool({
          id: 'example-tool',
          label: 'Example Tool',
          behavior: { type: 'mode', mode: 'click-create' },
          icon: 
        })

      });
    },
  };
}
