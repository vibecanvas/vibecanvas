import { System } from "@lastolivegames/becsy";
import { Canvas, FabricText } from "fabric"

export class FabricRenderSystem extends System {
    private canvasRef!: HTMLCanvasElement;

    initialize(): void {
        const canvas = new Canvas(this.canvasRef)
        const helloWorld = new FabricText("Hello world!");
        helloWorld.on('moving', () => console.log(helloWorld.getRelativeCenterPoint()))
        canvas.add(helloWorld);
        canvas.centerObject(helloWorld);

    }
}