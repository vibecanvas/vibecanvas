import type Konva from "konva";
import type { CanvasRegistryService } from "../../services";
import type { EditorService } from "../../services/editor/EditorService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { fxFilterSelection } from "../../core/fx.filter-selection";
import { fxGetSelectionTransformOptions } from "./fx.selection-transform-options";

type TPortalTxSyncTransformer = {
  canvasRegistry: CanvasRegistryService;
  editor: EditorService;
  Konva: typeof Konva;
  scene: SceneService;
  selection: SelectionService;
  transformer: Konva.Transformer;
};

type TArgsTxSyncTransformer = Record<string, never>;

export function txSyncTransformer(portal: TPortalTxSyncTransformer, args: TArgsTxSyncTransformer) {
  void args;
  if (portal.editor.editingTextId !== null || portal.editor.editingShape1dId !== null) {
    portal.transformer.setNodes([]);
    portal.transformer.update();
    portal.scene.dynamicLayer.batchDraw();
    return;
  }

  const filteredSelection = fxFilterSelection({ Konva: portal.Konva }, { editor: portal.canvasRegistry, selection: portal.selection.selection });
  const transformOptions = fxGetSelectionTransformOptions({
    Konva: portal.Konva,
    canvasRegistry: portal.canvasRegistry,
  }, {
    selection: filteredSelection,
  });

  portal.transformer.borderEnabled(transformOptions.borderEnabled);
  portal.transformer.borderDash(transformOptions.borderDash);
  portal.transformer.keepRatio(transformOptions.keepRatio);
  portal.transformer.flipEnabled(transformOptions.flipEnabled);
  portal.transformer.enabledAnchors(transformOptions.enabledAnchors);
  portal.transformer.setNodes(filteredSelection);
  portal.transformer.update();
  portal.scene.dynamicLayer.batchDraw();
}
