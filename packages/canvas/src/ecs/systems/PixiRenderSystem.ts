import { System } from "@lastolivegames/becsy";
import { Application } from "pixi.js";
import { setupPixiStressScene } from "../../stresstest/setupPixiStressScene";
import type { TStressSceneHandle } from "../../stresstest/stresstest.types";

export class PixiRenderSystem extends System {
    private hostRef!: HTMLDivElement;
    private app!: Application;
    private sceneHandle?: TStressSceneHandle;

    async prepare(): Promise<void> {
        this.app = new Application();

        await this.app.init({
            resolution: window.devicePixelRatio,
            preference: "webgpu",
            autoStart: false,
            resizeTo: this.hostRef,
        });

        this.hostRef.replaceChildren(this.app.canvas);

        this.sceneHandle = setupPixiStressScene(this.app, this.getHostSize());
        console.info("[canvas] pixi stress metrics", this.sceneHandle.metrics);
        // this.app.render();
    }

    initialize(): void { }


    finalize(): void {
        this.sceneHandle?.destroy();
        this.app?.destroy(true, true);
    }

    private getHostSize(): { width: number; height: number } {
        return {
            width: Math.max(this.hostRef.clientWidth, 1),
            height: Math.max(this.hostRef.clientHeight, 1),
        };
    }
}
