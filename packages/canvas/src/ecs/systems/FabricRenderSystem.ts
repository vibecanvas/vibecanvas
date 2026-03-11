import { System } from "@lastolivegames/becsy";
import { Canvas } from "fabric";
import { setupFabricStressScene } from "../../stresstest/setupFabricStressScene";

export class FabricRenderSystem extends System {
    private hostRef!: HTMLDivElement;
    private canvas!: Canvas;
    private resizeObserver?: ResizeObserver;

    initialize(): void {
        const canvasElement = document.createElement("canvas");
        canvasElement.style.display = "block";
        canvasElement.style.width = "100%";
        canvasElement.style.height = "100%";
        this.hostRef.replaceChildren(canvasElement);

        const size = this.getHostSize();

        this.canvas = new Canvas(canvasElement, {
            width: size.width,
            height: size.height,
            selection: false,
        });

        console.info("[canvas] fabric stress metrics", setupFabricStressScene(this.canvas, size));

        this.resizeObserver = new ResizeObserver(() => {
            const nextSize = this.getHostSize();
            this.canvas.setDimensions(nextSize);
            this.canvas.renderAll();
        });

        this.resizeObserver.observe(this.hostRef);
    }

    finalize(): void {
        this.resizeObserver?.disconnect();
        this.canvas?.dispose();
    }

    private getHostSize(): { width: number; height: number } {
        return {
            width: Math.max(this.hostRef.clientWidth, 1),
            height: Math.max(this.hostRef.clientHeight, 1),
        };
    }
}
