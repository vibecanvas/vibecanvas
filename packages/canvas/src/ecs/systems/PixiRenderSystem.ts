import { System } from "@lastolivegames/becsy";
import { Application, Container, Graphics, Rectangle, RenderLayer } from "pixi.js";

export class PixiRenderSystem extends System {
    private hostRef!: HTMLDivElement;
    public app!: Application;
    public contentLayer!: Container;
    public gridRenderLayer!: RenderLayer;
    private gridGraphics!: Graphics;

    private static readonly GRID_CELL_SIZE = 20;
    private static readonly GRID_COLOR = 0xd1d5db;

    async prepare(): Promise<void> {
        this.app = new Application();

        await this.app.init({
            resolution: window.devicePixelRatio,
            preference: "webgl",
            autoStart: false,
            resizeTo: this.hostRef,
            background: 'white'
        });

        this.contentLayer = new RenderLayer();
        this.contentLayer.interactiveChildren = true
        // Set hitArea so stage receives events on empty space (not just on children)
        this.contentLayer.hitArea = new Rectangle(-1e7, -1e7, 2e7, 2e7)
        this.contentLayer.eventMode = "static";


        this.gridRenderLayer = new RenderLayer();
        this.gridGraphics = new Graphics({ label: "grid" });

        this.app.stage.addChild(this.gridRenderLayer, this.contentLayer);
        this.gridRenderLayer.attach(this.gridGraphics);

        this.hostRef.replaceChildren(this.app.canvas);

    }

    initialize(): void {
        this.drawGrid();
        this.app.render();

    }

    execute(): void {
    }


    private drawGrid(): void {
        const width = Math.max(this.hostRef.clientWidth, 1);
        const height = Math.max(this.hostRef.clientHeight, 1);
        const cellSize = PixiRenderSystem.GRID_CELL_SIZE;

        this.gridGraphics.hitArea = new Rectangle(0, 0, width, height);

        this.gridGraphics.clear();

        for (let x = 0; x <= width; x += cellSize) {
            this.gridGraphics.moveTo(x, 0);
            this.gridGraphics.lineTo(x, height);
        }

        for (let y = 0; y <= height; y += cellSize) {
            this.gridGraphics.moveTo(0, y);
            this.gridGraphics.lineTo(width, y);
        }

        this.gridGraphics.stroke({
            color: PixiRenderSystem.GRID_COLOR,
            width: 1,
            pixelLine: true,
            alpha: 0.8,
        });
    }

    finalize(): void {
        this.app?.destroy(true, true);
    }

}
