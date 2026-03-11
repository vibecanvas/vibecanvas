import { System } from "@lastolivegames/becsy";
import { Application, Container, Graphics } from "pixi.js";
import { PixiRenderSystem } from "./PixiRenderSystem";

export class PixiEventSystem extends System {
    private renderSystem = this.attach(PixiRenderSystem);


    initialize(): void {
    }

    execute(): void {
    }

    finalize(): void {
    }

}
