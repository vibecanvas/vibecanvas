import { System } from "@lastolivegames/becsy";
import { Application, Assets, Container, Graphics, Rectangle, RenderLayer, Sprite } from "pixi.js";

export class PixiRenderSystem extends System {
    private hostRef!: HTMLDivElement;
    public app!: Application;
    public contentLayer!: RenderLayer;
    public gridRenderLayer!: RenderLayer;
    private gridGraphics!: Graphics;
    private exampleContainer: Container;

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
        this.contentLayer.label = 'content layer'
        this.contentLayer.interactiveChildren = true
        // Set hitArea so stage receives events on empty space (not just on children)
        this.contentLayer.hitArea = new Rectangle(-1e7, -1e7, 2e7, 2e7)
        this.contentLayer.eventMode = "static";


        this.gridRenderLayer = new RenderLayer();
        this.gridRenderLayer.label = 'grid layer'
        this.gridGraphics = new Graphics({ label: "grid" });

        this.app.stage.addChild(this.gridRenderLayer, this.contentLayer);
        this.gridRenderLayer.attach(this.gridGraphics);

        this.hostRef.replaceChildren(this.app.canvas);

        await this.example()

    }

    initialize(): void {
        this.drawGrid();
        this.app.render();
    }

    execute(): void {
        this.app.render();

        this.exampleContainer.rotation -= 0.01
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

    private async example() {
        // Load the bunny texture
        const texture = await Assets.load('https://pixijs.com/assets/bunny.png');
        const container = new Container();

        // Create a 5x5 grid of bunnies in the container
        for (let i = 0; i < 25; i++) {
            const bunny = new Sprite(texture);

            bunny.x = (i % 5) * 40;
            bunny.y = Math.floor(i / 5) * 40;
            container.addChild(bunny);
        }

        // Move the container to the center
        container.x = 100;
        container.y = 100;

        // Center the bunny sprites in local container coordinates
        container.pivot.x = container.width / 2;
        container.pivot.y = container.height / 2;

        this.contentLayer.attach(container)
        this.app.stage.addChild(container)
        this.exampleContainer = container
    }

    finalize(): void {
        this.app?.destroy(true, true);
    }

}
