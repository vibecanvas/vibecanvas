import { System } from "@lastolivegames/becsy";
import { Application } from "pixi.js";
import { setupPixiStressScene } from "../../stresstest/setupPixiStressScene";

export class PixiRenderSystem extends System {
    private hostRef!: HTMLDivElement;
    private app!: Application;

    async prepare(): Promise<void> {
        this.app = new Application();

        await this.app.init({
            resolution: window.devicePixelRatio,
            preference: "webgl",
            autoStart: false,
            resizeTo: this.hostRef,
        });

        this.hostRef.replaceChildren(this.app.canvas);

        console.info("[canvas] pixi stress metrics", setupPixiStressScene(this.app, this.getHostSize()));
        this.app.render();
    }

    initialize(): void {}

    finalize(): void {
        this.app?.destroy(true, true);
    }

    private getHostSize(): { width: number; height: number } {
        return {
            width: Math.max(this.hostRef.clientWidth, 1),
            height: Math.max(this.hostRef.clientHeight, 1),
        };
    }
}
