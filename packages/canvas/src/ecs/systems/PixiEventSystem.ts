import { System } from "@lastolivegames/becsy";
import { Application, Container, FederatedPointerEvent, Graphics } from "pixi.js";
import { PixiRenderSystem } from "./PixiRenderSystem";

export class PixiEventSystem extends System {
    private renderSystem = this.attach(PixiRenderSystem);

    private setupListeners() {
        this.renderSystem.contentLayer.on('pointerdown', this.onPointerDown)
    }

    private onPointerDown(e: FederatedPointerEvent) {
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
