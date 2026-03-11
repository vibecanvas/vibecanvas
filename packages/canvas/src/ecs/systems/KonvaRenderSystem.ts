import { System } from "@lastolivegames/becsy";
import Konva from "konva";
import { setupKonvaStressScene } from "../../stresstest/setupKonvaStressScene";

export class KonvaRenderSystem extends System {
    private hostRef!: HTMLDivElement;
    private stage!: Konva.Stage;
    private resizeObserver?: ResizeObserver;

    initialize(): void {
        const { width, height } = this.getHostSize();

        this.stage = new Konva.Stage({
            container: this.hostRef,
            width,
            height,
        });

        console.info("[canvas] konva stress metrics", setupKonvaStressScene(this.stage, { width, height }));

        this.resizeObserver = new ResizeObserver(() => {
            const nextSize = this.getHostSize();
            this.stage.size(nextSize);
            this.stage.batchDraw();
        });

        this.resizeObserver.observe(this.hostRef);
    }

    finalize(): void {
        this.resizeObserver?.disconnect();
        this.stage?.destroy();
    }

    private getHostSize(): { width: number; height: number } {
        return {
            width: Math.max(this.hostRef.clientWidth, 1),
            height: Math.max(this.hostRef.clientHeight, 1),
        };
    }
}
