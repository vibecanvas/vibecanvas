// Service
export {
  setupAutomergeServer,
  getServerRepo,
  getWSAdapter,
  type AutomergeServerInstance,
} from "./automerge.service"

// Adapters
export { BunWSServerAdapter } from "./adapters/websocket.adapter"
export { BunSqliteStorageAdapter } from "./adapters/sqlite.adapter"

// Types
export type {
  // Document
  TCanvasDoc,
  // Element
  TElement,
  TBaseElement,
  TElementData,
  TElementStyle,
  TElementType,
  // Bindings
  TBinding,
  // Drawing data types
  TRectData,
  TEllipseData,
  TDiamondData,
  TArrowData,
  TLineData,
  TPenData,
  TTextData,
  TImageData,
  TDrawingStyle,
  TDrawingType,
  // Widget data types
  TChatData,
  TFiletreeData,
  TWidgetType,
  // Geometry
  TPoint2D,
  // Group
  TGroup,
} from "./types/canvas-doc"

export {
  // Type guards
  isDrawing,
  isWidget,
  // Helpers
  getElementsSortedByZ,
} from "./types/canvas-doc"
