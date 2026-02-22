/**
 * CanvasDoc - Automerge CRDT Document Structure
 *
 * Design decisions:
 * - Unified `elements` collection (all types: rect, chat, filetree, etc.)
 * - Fractional `zIndex` for conflict-free ordering (like Figma)
 * - First-class groups with `parentGroupId` for nesting
 * - Bindings with anchor points in target's local coordinates
 * - No version/version_nonce - Automerge handles versioning
 *
 * @see /llm/plan/automerge-rehaul-plan.md for full rationale
 */

// ============================================================================
// BINDING (sticky connections with anchor points)
// ============================================================================

/**
 * Represents a sticky connection to another element.
 * Anchor is in the TARGET element's local coordinate space (0-1 normalized).
 *
 * @example
 * // Arrow attached to top-center of a chat
 * { targetId: "chat-123", anchor: { x: 0.5, y: 0 } }
 *
 * // Arrow attached to right-center of a rect
 * { targetId: "rect-456", anchor: { x: 1, y: 0.5 } }
 */
export type TBinding = {
  targetId: string
  anchor: {
    x: number  // 0 = left, 0.5 = center, 1 = right
    y: number  // 0 = top, 0.5 = center, 1 = bottom
  }
}

// ============================================================================
// BASE ELEMENT (shared fields for all element types)
// ============================================================================

export type TBaseElement = {
  id: string
  x: number
  y: number
  angle: number
  zIndex: string              // Fractional index for ordering (lexicographic)
  parentGroupId: string | null      // Single parent group (groups nest via parentGroupId)
  bindings: TBinding[]        // Sticky connections with anchor points
  locked: boolean
  createdAt: number           // Unix timestamp ms
  updatedAt: number           // Unix timestamp ms
}

// ============================================================================
// DRAWING TYPES (geometric shapes)
// ============================================================================

export type TDrawingStyle = {
  backgroundColor?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  cornerRadius?: number
}

// Geometry primitives
export type TPoint2D = [number, number]

export type TRectData = {
  type: 'rect'
  w: number
  h: number
  radius?: number
}

export type TEllipseData = {
  type: 'ellipse'
  rx: number
  ry: number
}

export type TDiamondData = {
  type: 'diamond'
  w: number
  h: number
  radius?: number
}

export type TLineData = {
  type: 'line'
  lineType: 'straight' | 'curved'
  // Points array: [[0,0], [x1,y1], [x2,y2], ...] relative to element position
  // First point is always [0,0] (explicit start point, like Excalidraw)
  // Curves are auto-computed at render time using Catmull-Rom → Bezier conversion
  points: TPoint2D[]

  startBinding: TBinding | null   // Bind start point to another element
  endBinding: TBinding | null     // Bind end point to another element
}

export type TArrowData = Omit<TLineData, 'type'> & {
  type: 'arrow'
  startCap: 'none' | 'arrow' | 'dot' | 'diamond'
  endCap: 'none' | 'arrow' | 'dot' | 'diamond'
}



export type TPenData = {
  type: 'pen'
  points: TPoint2D[] // relative to element position
  pressures: number[]
  simulatePressure: boolean
}

export type TTextData = {
  type: 'text'
  w: number
  h: number
  text: string
  originalText: string
  fontSize: number
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  lineHeight: number
  link: string | null
  containerId: string | null
  autoResize: boolean
}

export type TImageData = {
  type: 'image'
  url: string | null
  base64: string | null
  w: number
  h: number
  crop: {
    x: number
    y: number
    width: number
    height: number
    naturalWidth: number
    naturalHeight: number
  }
}

// ============================================================================
// WIDGET TYPES (chat, filetree)
// ============================================================================

export type TChatData = {
  type: 'chat'
  w: number
  h: number
  isCollapsed: boolean
}

export type TFiletreeData = {
  type: 'filetree'
  w: number
  h: number
  isCollapsed: boolean
  globPattern: string | null
}

// ============================================================================
// UNIFIED ELEMENT
// ============================================================================

export type TElementData =
  | TRectData
  | TEllipseData
  | TDiamondData
  | TArrowData
  | TLineData
  | TPenData
  | TTextData
  | TImageData
  | TChatData
  | TFiletreeData

export type TElementStyle = {
  backgroundColor?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  cornerRadius?: number
  borderColor?: string
  headerColor?: string
}

export type TElement = TBaseElement & {
  data: TElementData
  style: TElementStyle
}

// ============================================================================
// GROUP (first-class entity)
// ============================================================================

export type TGroup = {
  id: string
  name: string
  color: string | null         // Optional group highlight color
  parentGroupId: string | null // For nested groups
  locked: boolean              // Prevents editing of children
  createdAt: number
}

// ============================================================================
// CANVAS DOCUMENT (root)
// ============================================================================

export type TCanvasDoc = {
  // Document metadata
  id: string
  name: string

  // Unified element collection (keyed by ID for O(1) lookup)
  elements: Record<string, TElement>

  // First-class groups
  groups: Record<string, TGroup>
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Element type discriminator */
export type TElementType = TElementData['type']

/** All drawing shape types (excludes widgets) */
export type TDrawingType = 'rect' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'pen' | 'text' | 'image'

/** Widget types */
export type TWidgetType = 'chat' | 'filetree'

/** Type guard for drawings */
export function isDrawing(element: TElement): boolean {
  const drawingTypes: TDrawingType[] = ['rect', 'ellipse', 'diamond', 'arrow', 'line', 'pen', 'text', 'image']
  return drawingTypes.includes(element.data.type as TDrawingType)
}

/** Type guard for widgets */
export function isWidget(element: TElement): boolean {
  const widgetTypes: TWidgetType[] = ['chat', 'filetree']
  return widgetTypes.includes(element.data.type as TWidgetType)
}

/** Get elements sorted by zIndex (front to back) */
export function getElementsSortedByZ(doc: TCanvasDoc): TElement[] {
  return Object.values(doc.elements).sort((a, b) => a.zIndex.localeCompare(b.zIndex))
}
