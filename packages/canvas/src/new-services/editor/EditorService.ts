import type { IService } from "@vibecanvas/runtime";
import type Konva from "konva";

/**
 * Holds editor-only transient state.
 * Good place for edit sessions, previews, and transform UI refs.
 */
export class EditorService implements IService {
  readonly name = "editor";

  editingTextId: string | null = null;
  editingShape1dId: string | null = null;
  previewNode: Konva.Node | null = null;
  transformer: Konva.Transformer | null = null;
}
