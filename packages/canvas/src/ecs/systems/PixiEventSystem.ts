import { System } from "@lastolivegames/becsy";
import { Application, Container, FederatedPointerEvent, Graphics } from "pixi.js";
import { PixiRenderSystem } from "./PixiRenderSystem";

export class PixiEventSystem extends System {
    private renderSystem = this.attach(PixiRenderSystem);

    private setupListeners() {
        this.renderSystem.contentLayer.on('pointerdown', this.onPointerDown)
        this.renderSystem.contentLayer.on('pointerup', this.onPointerUp)
        this.renderSystem.contentLayer.on('pointermove', this.onPointerMove)
        this.renderSystem.contentLayer.on('pointercancel', this.onPointerCancel)
        this.renderSystem.contentLayer.on('wheel', this.onWheel)
        this.renderSystem.app.canvas.onkeydown = this.onKeyDown
    }

    private onPointerDown(e: FederatedPointerEvent) {
        console.log(e)
    }

    private onPointerMove(e: FederatedPointerEvent) {
        console.log(e)
    }

    private onPointerUp(e: FederatedPointerEvent) {
        console.log(e)
    }

    private onPointerCancel(e: FederatedPointerEvent) {
        console.log(e)
    }

    private onWheel(e: WheelEvent) {
        console.log(e)
    }

    private onKeyDown(e: KeyboardEvent) {
        console.log(e)
    }

    constructor() {
        super();
        this.schedule(s => s.after(PixiRenderSystem))
    }

    initialize(): void {
        this.setupListeners()
    }

    execute(): void {
    }

    finalize(): void {
    }

}
