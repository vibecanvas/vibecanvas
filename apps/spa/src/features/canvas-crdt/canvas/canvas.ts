import { setStore } from "@/store"
import type { DocHandle } from "@automerge/automerge-repo"
import { initDevtools } from '@pixi/devtools'
import type { TCanvasDoc } from "@vibecanvas/shell"
import { throttle } from "@solid-primitives/scheduled"
import { Application, type FederatedPointerEvent, Graphics, Rectangle, RenderLayer } from "pixi.js"
import { cmdDrawNew, cmdGroup, cmdPanDrag, cmdSelectBox } from "../input-commands"
import { cmdPan } from "../input-commands/cmd.pan"
import { cmdSelectDelete } from "../input-commands/cmd.select-delete"
import { cmdToolSelect } from "../input-commands/cmd.tool-select"
import { cmdUndoRedo } from "../input-commands/cmd.undo-redo"
import { cmdZoom } from "../input-commands/cmd.zoom"
import { buildKeyboardContext, buildPointerContext, buildWheelContext, runCommands } from "../input-commands/command.helper"
import { GroupManager } from "../managers/group-manager"
import { UndoManager } from "../managers/undo-manger"
import type { AElement } from "../renderables/element.abstract"
import { SelectionAreaRenderable } from "../renderables/selection-area/selection-area.class"
import { MultiTransformBox } from "../renderables/transform-box/multi-transform-box"
import type{ VirtualGroup } from "../renderables/virtual-group.class"
import type { TCanvasViewData } from "../store/canvas.slice"
import { createDebugRect, createDebugShapes, destroyDebugGraphics, type TDebugShape } from "./canvas.debug"
import { setupDocSync } from "./setup.doc-sync"
import { setupImageHandling } from "./setup.image"
import { setupResizeObserver } from "./setup.resize-observer"

type TCanvasParams = {
  handle: DocHandle<TCanvasDoc>
  canvasId: string
  viewport: TCanvasViewData
  ref: HTMLElement
}

/** A group member can be an element or a nested group */
export type TGroupMember = AElement | VirtualGroup


export class Canvas {
  app!: Application
  canvasId!: string
  topLayer!: RenderLayer
  bottomLayer!: RenderLayer
  resizeObserver!: ResizeObserver
  elements: Map<string, AElement> = new Map()
  selectionArea!: SelectionAreaRenderable
  multiTransformBox!: MultiTransformBox
  previewDrawing: AElement | null = null
  handle!: DocHandle<TCanvasDoc>
  undoManager = new UndoManager()
  groupManager!: GroupManager

  private cleanupFns: (() => void)[] = []
  private _debugGraphics: Graphics | null = null

  private constructor() {
    // Private - use Canvas.create()
  }

  static async create(params: TCanvasParams): Promise<Canvas> {
    const canvas = new Canvas()
    await canvas.init(params)
    return canvas
  }

  private async init({ canvasId, viewport, ref, handle }: TCanvasParams): Promise<void> {
    this.canvasId = canvasId
    this.handle = handle
    // Font loading
    await document.fonts.load("16px 'Gabriele'")

    // Initialize PixiJS
    this.app = new Application()

    initDevtools({ app: this.app })

    await this.app.init({
      background: 'white',
      resizeTo: ref,
      autoStart: false,
      antialias: true,
      resolution: window.devicePixelRatio * 2 || 4,
      autoDensity: true,
      preference: 'webgpu',
    })
    ref.appendChild(this.app.canvas!)

    // Create layers
    this.bottomLayer = new RenderLayer({ sortableChildren: true })
    this.topLayer = new RenderLayer()
    this.app.stage.addChild(this.bottomLayer)
    this.app.stage.addChild(this.topLayer)

    // Set viewport
    this.app.stage.x = viewport.x
    this.app.stage.y = viewport.y
    this.app.stage.scale.x = viewport.scale
    this.app.stage.scale.y = viewport.scale

    // Setup resize observer
    const { resizeObserver, cleanup: cleanupResize } = setupResizeObserver({ ref, app: this.app })
    this.resizeObserver = resizeObserver
    this.cleanupFns.push(cleanupResize)

    // Setup selection area
    this.selectionArea = new SelectionAreaRenderable()
    this.topLayer.attach(this.selectionArea.container)
    this.app.stage.addChild(this.selectionArea.container)
    this.cleanupFns.push(() => this.selectionArea.destroy())

    // Setup group transform box for multi-select
    this.multiTransformBox = new MultiTransformBox(this)
    this.topLayer.attach(this.multiTransformBox.container)
    this.app.stage.addChild(this.multiTransformBox.container)
    this.cleanupFns.push(() => this.multiTransformBox.destroy())

    // Setup input handling via helper functions
    this.setupInputHandling()

    // Image handling (toolbar file picker, drag-drop, paste)
    const cleanupImageHandling = setupImageHandling({ canvas: this })
    this.cleanupFns.push(cleanupImageHandling)

    // Debug helpers
    this.setupDebugHelper()

    // Initialize GroupManager (before doc sync so it can handle group patches)
    this.groupManager = new GroupManager(this, handle)
    // this.cleanupFns.push(() => this.groupManager.destroy())

    const cleanupDocSync = setupDocSync(this, handle)
    this.cleanupFns.push(cleanupDocSync)


    this.app.start()
  }

  private setupInputHandling(): void {
    const canvasEl = this.app.canvas
    const stage = this.app.stage

    // Prevent browser gestures
    canvasEl.style.touchAction = 'none'

    // Enable stage to receive events
    stage.eventMode = 'static'
    stage.interactiveChildren = true

    // Set hitArea so stage receives events on empty space (not just on children)
    stage.hitArea = new Rectangle(-1e7, -1e7, 2e7, 2e7)

    // Attach events to appropriate targets
    const wheelHandler = (e: WheelEvent) => {
      const ctx = buildWheelContext(this, this, e, 'stage')
      runCommands([cmdZoom, cmdPan], ctx)
    }
    this.app.stage.on('wheel', wheelHandler, { passive: false })
    const pointerHandler = (e: FederatedPointerEvent) => {
      const ctx = buildPointerContext(this, this, e, 'stage')
      runCommands([cmdPanDrag, cmdDrawNew, cmdSelectBox], ctx)
    }
    this.app.stage.on('pointerup', pointerHandler)
    this.app.stage.on('globalmousemove', pointerHandler)
    this.app.stage.on('pointerdown', pointerHandler)
    this.app.stage.on('pointerupoutside', pointerHandler)
    const keyboardHandler = (e: KeyboardEvent) => {
      const ctx = buildKeyboardContext(this, this, e, 'stage')
      runCommands([cmdUndoRedo, cmdGroup, cmdToolSelect, cmdSelectDelete], ctx)
    }
    window.addEventListener('keydown', keyboardHandler)
    window.addEventListener('keyup', keyboardHandler)

    const globalPointerUpHandler = (e: PointerEvent) => {
      // NOTE: just for pointer release when mouse moves out of canvas. hack. must refactor command system.
      const fakeCtx = {
        eventType: 'pointerup',
        event: e as any,
        worldPos: null,
        screenPos: null,
        commandTarget: this,
        canvas: this,
        listenerId: 'stage',
        modifiers: { shift: false, ctrl: false, alt: false, meta: false },
        handled: false,
      } as any
      let handled = cmdDrawNew(fakeCtx)
      if (handled) return
      handled = cmdSelectBox(fakeCtx)
    }
    window.addEventListener('pointerup', globalPointerUpHandler)

    // Add cleanup
    this.cleanupFns.push(() => {
      this.app.stage?.off('wheel', wheelHandler)
      this.app.stage?.off('pointerup', pointerHandler)
      this.app.stage?.off('globalmousemove', pointerHandler)
      this.app.stage?.off('pointerdown', pointerHandler)
      this.app.stage?.off('pointerupoutside', pointerHandler)
      window.removeEventListener('keydown', keyboardHandler)
      window.removeEventListener('keyup', keyboardHandler)
      window.removeEventListener('pointerup', globalPointerUpHandler)
    })
  }

  private setupDebugHelper(): void {
    const updateMousePosition = throttle((x: number, y: number) => {
      setStore('canvasSlice', 'mousePositionWorldSpace', { x, y })
    }, 10)

    this.app.stage.on('mousemove', event => {
      const local = event.getLocalPosition(this.app.stage)
      updateMousePosition(local.x, local.y)
    })
  }

  debugRect(x: number, y: number, width: number, height: number, color: number = 0xff0000): void {
    this._debugGraphics = destroyDebugGraphics(this._debugGraphics)
    this._debugGraphics = createDebugRect(x, y, width, height, color)
    this.app.stage.addChild(this._debugGraphics)
  }

  debugShapes(shapes: TDebugShape[]): void {
    this._debugGraphics = destroyDebugGraphics(this._debugGraphics)
    this._debugGraphics = createDebugShapes(shapes)
    this.app.stage.addChild(this._debugGraphics)
  }

  clearDebugRect(): void {
    this._debugGraphics = destroyDebugGraphics(this._debugGraphics)
  }

  mapMembers(ids: string[]): TGroupMember[] {
    return ids.map(id => this.elements.get(id) ?? this.groupManager.groups.get(id))
      .filter(x => x !== undefined)
  }

  // ─────────────────────────────────────────────────────────────
  // Scene Management
  // ─────────────────────────────────────────────────────────────

  addElement(element: AElement): void {
    this.elements.set(element.id, element)
    this.bottomLayer.attach(element.container)
    this.app.stage.addChild(element.container)
  }

  removeElement(id: string): void {
    const element = this.elements.get(id)
    if (element) {
      element.destroy()
      this.elements.delete(id)
      this.bottomLayer.detach(element.container)
      this.app.stage.removeChild(element.container)
    }
  }

  addGroup(group: VirtualGroup): void {
    this.groupManager.groups.set(group.id, group)
    this.topLayer.attach(group.container)
    this.app.stage.addChild(group.container)
  }

  removeGroup(id: string): void {
    const group = this.groupManager.groups.get(id)
    if (group) {
      group.destroy()
      this.groupManager.groups.delete(id)
      this.topLayer.detach(group.container)
      this.app.stage.removeChild(group.container)
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Element Mutations (for UI components like SelectionStyleMenu)
  // ─────────────────────────────────────────────────────────────

  updateElementStyle(selectedId: string, style: Partial<{ backgroundColor: string; strokeColor: string; strokeWidth: number; opacity: number }>): void {
    // Resolve element IDs - could be a group or an element
    const elementIds = this.resolveElementIds(selectedId)
    if (elementIds.length === 0) return

    // Capture snapshot for undo
    const doc = this.handle.doc()
    if (!doc) return

    const oldStyles = new Map<string, { backgroundColor?: string; strokeColor?: string; strokeWidth?: number; opacity?: number }>()
    for (const id of elementIds) {
      const element = doc.elements[id]
      if (element) {
        oldStyles.set(id, { ...element.style })
      }
    }

    // Apply style changes
    this.handle.change(doc => {
      for (const id of elementIds) {
        const element = doc.elements[id]
        if (!element) continue
        Object.assign(element.style, style)
        element.updatedAt = Date.now()
      }
    })

    // Record undo
    const newStyle = { ...style }
    this.undoManager.record({
      label: 'Change style',
      undo: () => {
        this.handle.change(doc => {
          for (const [id, oldStyle] of oldStyles) {
            const element = doc.elements[id]
            if (!element) continue
            Object.assign(element.style, oldStyle)
            element.updatedAt = Date.now()
          }
        })
      },
      redo: () => {
        this.handle.change(doc => {
          for (const id of elementIds) {
            const element = doc.elements[id]
            if (!element) continue
            Object.assign(element.style, newStyle)
            element.updatedAt = Date.now()
          }
        })
      },
    })
  }

  getElementStyle(selectedId: string): { backgroundColor?: string; strokeColor?: string; strokeWidth?: number; opacity?: number } | null {
    const doc = this.handle.doc()
    if (!doc) return null

    // Check if it's a group first
    const virtualGroup = this.groupManager?.groups.get(selectedId)
    if (virtualGroup && virtualGroup.members.length > 0) {
      // Return style of first member (consistent with how multi-select works)
      return doc.elements[virtualGroup.members[0].id]?.style ?? null
    }

    // Otherwise treat as element ID
    return doc.elements[selectedId]?.style ?? null
  }

  updateElementData(selectedId: string, dataUpdates: Partial<{
    lineType: 'straight' | 'curved'
    startCap: 'none' | 'arrow' | 'dot' | 'diamond'
    endCap: 'none' | 'arrow' | 'dot' | 'diamond'
  }>): void {
    const elementIds = this.resolveElementIds(selectedId)
    if (elementIds.length === 0) return

    const doc = this.handle.doc()
    if (!doc) return

    // Capture snapshot for undo
    const oldData = new Map<string, Record<string, unknown>>()
    for (const id of elementIds) {
      const element = doc.elements[id]
      if (element) {
        // Capture only relevant data fields
        const capturedData: Record<string, unknown> = {}
        if ('lineType' in dataUpdates && 'lineType' in element.data) {
          capturedData.lineType = (element.data as any).lineType
        }
        if ('startCap' in dataUpdates && 'startCap' in element.data) {
          capturedData.startCap = (element.data as any).startCap
        }
        if ('endCap' in dataUpdates && 'endCap' in element.data) {
          capturedData.endCap = (element.data as any).endCap
        }
        if (Object.keys(capturedData).length > 0) {
          oldData.set(id, capturedData)
        }
      }
    }

    // Apply data changes (only to elements that support these properties)
    this.handle.change(doc => {
      for (const id of elementIds) {
        const element = doc.elements[id]
        if (!element) continue

        const elementType = element.data.type as string
        const isLineOrArrow = elementType === 'line' || elementType === 'arrow'
        const isArrow = elementType === 'arrow'

        // Only apply lineType to line and arrow types
        if (isLineOrArrow) {
          if ('lineType' in dataUpdates) {
            ;(element.data as any).lineType = dataUpdates.lineType
          }
        }
        // Only apply startCap/endCap to arrow type
        if (isArrow) {
          if ('startCap' in dataUpdates) {
            ;(element.data as any).startCap = dataUpdates.startCap
          }
          if ('endCap' in dataUpdates) {
            ;(element.data as any).endCap = dataUpdates.endCap
          }
        }
        element.updatedAt = Date.now()
      }
    })

    // Record undo
    const newData = { ...dataUpdates }
    this.undoManager.record({
      label: 'Change line data',
      undo: () => {
        this.handle.change(doc => {
          for (const [id, capturedData] of oldData) {
            const element = doc.elements[id]
            if (!element) continue
            Object.assign(element.data, capturedData)
            element.updatedAt = Date.now()
          }
        })
      },
      redo: () => {
        this.handle.change(doc => {
          for (const id of elementIds) {
            const element = doc.elements[id]
            if (!element) continue
            const elementType = element.data.type as string
            const isLineOrArrow = elementType === 'line' || elementType === 'arrow'
            const isArrow = elementType === 'arrow'

            if (isLineOrArrow) {
              if ('lineType' in newData) {
                ;(element.data as any).lineType = newData.lineType
              }
            }
            if (isArrow) {
              if ('startCap' in newData) {
                ;(element.data as any).startCap = newData.startCap
              }
              if ('endCap' in newData) {
                ;(element.data as any).endCap = newData.endCap
              }
            }
            element.updatedAt = Date.now()
          }
        })
      },
    })
  }

  getElementData(selectedId: string): {
    type: string
    lineType?: 'straight' | 'curved'
    startCap?: 'none' | 'arrow' | 'dot' | 'diamond'
    endCap?: 'none' | 'arrow' | 'dot' | 'diamond'
  } | null {
    const doc = this.handle.doc()
    if (!doc) return null

    // Check if it's a group first
    const virtualGroup = this.groupManager?.groups.get(selectedId)
    if (virtualGroup && virtualGroup.members.length > 0) {
      // Return data of first member
      const element = doc.elements[virtualGroup.members[0].id]
      if (!element) return null
      return {
        type: element.data.type,
        lineType: (element.data as any).lineType,
        startCap: (element.data as any).startCap,
        endCap: (element.data as any).endCap,
      }
    }

    // Otherwise treat as element ID
    const element = doc.elements[selectedId]
    if (!element) return null
    return {
      type: element.data.type,
      lineType: (element.data as any).lineType,
      startCap: (element.data as any).startCap,
      endCap: (element.data as any).endCap,
    }
  }

  /**
   * Resolve a selected ID to element IDs.
   * If the ID is a group, returns all member element IDs.
   * If the ID is an element, returns just that ID.
   */
  private resolveElementIds(selectedId: string): string[] {
    const virtualGroup = this.groupManager?.groups.get(selectedId)
    if (virtualGroup) {
      return virtualGroup.members.map(m => m.id)
    }
    return [selectedId]
  }

  cleanup(): void {
    this.cleanupFns.forEach(fn => fn?.())
    this.elements.forEach(element => element.destroy())
    this.groupManager.groups.forEach(group => group.destroy())
    this.app.canvas.remove()
    // Defer full GPU destruction to next frame to avoid Safari WS kill
    requestAnimationFrame(() => {
      this.app.destroy(true, true)
    })
  }

  setPreviewElement(renderable: AElement | null): void {
    if (this.previewDrawing) {
      this.previewDrawing.destroy()
    }
    this.previewDrawing = renderable
    if (renderable) {
      // Add to topLayer during preview
      this.topLayer.attach(renderable.container)
      this.app.stage.addChild(renderable.container)
    }
  }

  clearPreviewElement(): void {
    if (this.previewDrawing) {
      this.previewDrawing.destroy()
      this.previewDrawing = null
    }
  }

  finalizePreviewElement(): AElement | null {
    const preview = this.previewDrawing
    if (preview) {
      // Move from topLayer to bottomLayer
      this.topLayer.detach(preview.container)
      this.bottomLayer.attach(preview.container)
      // Add to elements
      this.elements.set(preview.id, preview)
      this.previewDrawing = null
    }
    return preview
  }
}
