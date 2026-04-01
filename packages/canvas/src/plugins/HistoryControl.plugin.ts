import type { IPlugin, IPluginContext } from "./interface";

/**
 * cmd/ctrl + z to undo
 * cmd/ctrl + shift + z to redo
 */
export class HistoryControlPlugin implements IPlugin {
  apply(context: IPluginContext): void {
    const { hooks, history } = context;

    hooks.keydown.tap(e => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        history.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        history.undo();
      }
    })
  }
}
