import { describe, expect, test, vi } from "vitest";
import { CameraService } from "../../src/new-services/camera/CameraService";
import { RenderService } from "../../src/new-services/render/RenderService";
import { createMockDocHandle, createTestContainer, ensureResizeObserver } from "../test-setup";

function setContainerSize(container: HTMLDivElement, args: { width: number; height: number }) {
  Object.defineProperty(container, "clientWidth", { configurable: true, value: args.width });
  Object.defineProperty(container, "clientHeight", { configurable: true, value: args.height });
}

describe("RenderService and CameraService", () => {
  test("RenderService starts, creates stage+layers, resizes, and stops", () => {
    ensureResizeObserver();
    const container = createTestContainer({ width: 800, height: 600 }) as HTMLDivElement;
    const render = new RenderService({
      container,
      docHandle: createMockDocHandle(),
    });
    const resizeSpy = vi.fn();
    render.hooks.resize.tap(resizeSpy);

    render.start();
    expect(render.started).toBe(true);
    expect(render.stage.width()).toBe(800);
    expect(render.stage.height()).toBe(600);
    expect(render.stage.getLayers()).toHaveLength(3);

    setContainerSize(container, { width: 1024, height: 768 });
    render.resizeObserver.observe(container);
    (render.resizeObserver as unknown as { observe(target: Element): void }).observe(container);
    render.stage.size({ width: 1024, height: 768 });
    render.hooks.resize.call(1024, 768);
    expect(resizeSpy).toHaveBeenCalledWith(1024, 768);

    render.stop();
    expect(render.started).toBe(false);
    container.remove();
  });

  test("CameraService pans, zooms, clamps, and emits change", () => {
    ensureResizeObserver();
    const container = createTestContainer({ width: 800, height: 600 }) as HTMLDivElement;
    const render = new RenderService({
      container,
      docHandle: createMockDocHandle(),
    });
    render.start();

    const camera = new CameraService({ render });
    const changeSpy = vi.fn();
    camera.hooks.change.tap(changeSpy);

    camera.start();
    expect(camera.started).toBe(true);
    expect(camera.zoom).toBe(1);

    camera.pan(-40, -30);
    expect(camera.x).toBe(40);
    expect(camera.y).toBe(30);
    expect(render.staticForegroundLayer.position()).toEqual({ x: 40, y: 30 });

    camera.zoomAtScreenPoint(10, { x: 400, y: 300 });
    expect(camera.zoom).toBe(4);
    expect(render.staticForegroundLayer.scale()).toEqual({ x: 4, y: 4 });

    camera.zoomAtScreenPoint(0.01, { x: 400, y: 300 });
    expect(camera.zoom).toBe(0.25);
    expect(changeSpy).toHaveBeenCalled();

    camera.stop();
    expect(camera.started).toBe(false);
    render.stop();
    container.remove();
  });
});
