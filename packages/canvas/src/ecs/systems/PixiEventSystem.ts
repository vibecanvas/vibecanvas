import { System } from "@lastolivegames/becsy";
import { FederatedPointerEvent } from "pixi.js";
import { PixiRenderSystem } from "./PixiRenderSystem";

type TInputBuffer = {
    keyboard: KeyboardEvent[],
    wheel: WheelEvent[],
    pointer: FederatedPointerEvent[]
}

export class PixiEventSystem extends System {
    private renderSystem = this.attach(PixiRenderSystem);
    private frame = 0
    private inputBuffer: TInputBuffer = {
        keyboard: [],
        pointer: [],
        wheel: [],
    }
    private setupListeners() {
        this.renderSystem.contentLayer.on('pointerdown', this.onPointer)
        this.renderSystem.contentLayer.on('pointerup', this.onPointer)
        this.renderSystem.contentLayer.on('pointermove', this.onPointer)
        this.renderSystem.contentLayer.on('pointercancel', this.onPointer)
        this.renderSystem.contentLayer.on('wheel', this.onWheel)
        document.addEventListener('keydown', this.onKey)
        document.addEventListener('keyup', this.onKey)
    }

    private teardownListeners() {
        this.renderSystem.contentLayer.off('pointerdown', this.onPointer)
        this.renderSystem.contentLayer.off('pointerup', this.onPointer)
        this.renderSystem.contentLayer.off('pointermove', this.onPointer)
        this.renderSystem.contentLayer.off('pointercancel', this.onPointer)
        this.renderSystem.contentLayer.off('wheel', this.onWheel)
        document.removeEventListener('keydown', this.onKey)
        document.removeEventListener('keyup', this.onKey)
    }

    private onPointer = (e: FederatedPointerEvent) => {
        this.inputBuffer.pointer.push(e)
    }

    private onWheel = (e: WheelEvent) => {
        this.inputBuffer.wheel.push(e)
    }

    private onKey = (e: KeyboardEvent) => {
        this.inputBuffer.keyboard.push(e)
    }

    private flushInputBuffer() {
        this.inputBuffer.keyboard.length = 0
        this.inputBuffer.pointer.length = 0
        this.inputBuffer.wheel.length = 0
    }

    constructor() {
        super();
        this.schedule(s => s.after(PixiRenderSystem))
    }

    initialize(): void {
        this.setupListeners()
    }

    execute(): void {
        this.frame++;
        if (this.frame % 100 !== 0) return // skip for now

        console.log('new frame', this.inputBuffer)

        this.flushInputBuffer()

    }

    finalize(): void {
        this.teardownListeners()
    }

}
