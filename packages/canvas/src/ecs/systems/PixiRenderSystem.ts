import { System } from "@lastolivegames/becsy";
import { Application, Text } from "pixi.js"

export class PixiRenderSystem extends System {
    private canvasRef!: HTMLCanvasElement;
    private app!: Application;

    async prepare(): Promise<void> {
        this.app = new Application();
        await this.app.init({
            canvas: this.canvasRef,
            resolution: window.devicePixelRatio,
            preference: 'webgl',
            autoStart: false
        })

        const label = new Text({
            text: 'Scene Graph:\n\napp.stage\n  ┗ A\n     ┗ B\n     ┗ C\n  ┗ D',
            style: { fill: '#ffffff' },
            position: { x: 300, y: 100 },
        });

        this.app.stage.addChild(label);

        this.app.render()

        return
    }

    initialize(): void {

    }

    finalize(): void {
        this.app.destroy(true, true)
    }
}