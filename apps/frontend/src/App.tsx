import { Canvas, Circle, Group } from "@vibecanvas/canvas";
import { onCleanup, onMount } from "solid-js";
import shaderCompilerUrl from "../../../packages/canvas/node_modules/@antv/g-device-api/rust/pkg/glsl_wgsl_compiler_bg.wasm?url";

function setup(canvas: Canvas) {
  const solarSystem = new Group();
  const earthOrbit = new Group();
  const moonOrbit = new Group();

  const sun = new Circle({
    cx: 0,
    cy: 0,
    r: 100,
    fill: "red",
  });
  const earth = new Circle({
    cx: 0,
    cy: 0,
    r: 50,
    fill: "blue",
  });
  const moon = new Circle({
    cx: 0,
    cy: 0,
    r: 25,
    fill: "yellow",
  });

  solarSystem.appendChild(sun);
  solarSystem.appendChild(earthOrbit);
  earthOrbit.appendChild(earth);
  earthOrbit.appendChild(moonOrbit);
  moonOrbit.appendChild(moon);

  solarSystem.position.x = 300;
  solarSystem.position.y = 300;
  earthOrbit.position.x = 100;
  moonOrbit.position.x = 100;
  canvas.appendChild(solarSystem);

  return () => {
    solarSystem.rotation += 0.01;
    earthOrbit.rotation += 0.02;
  }
}

function App() {
  let canvasRef!: HTMLCanvasElement;

  const resize = (width: number, height: number) => {
    if (!canvasRef) return;

    canvasRef.width = width * window.devicePixelRatio;
    canvasRef.height = height * window.devicePixelRatio;
    canvasRef.style.width = `${width}px`;
    canvasRef.style.height = `${height}px`;
    canvasRef.style.outline = "none";
    canvasRef.style.padding = "0px";
    canvasRef.style.margin = "0px";
  };

  resize(window.innerWidth, window.innerHeight);

  onMount(() => {
    let canvas: Canvas | null = null;
    let animationFrameId = 0;

    const handleResize = () => {
      resize(window.innerWidth, window.innerHeight);
      canvas?.resize(window.innerWidth, window.innerHeight);
    };

    const initializeCanvas = async () => {
      if (!("gpu" in navigator)) {
        throw new Error("WebGPU is not available in this browser.");
      }

      canvas = await new Canvas({
        canvas: canvasRef,
        renderer: "webgpu",
        shaderCompilerPath: shaderCompilerUrl,
      }).initialized;

      const updateFn = setup(canvas);

      const animate = () => {
        updateFn();

        canvas?.render();
        animationFrameId = requestAnimationFrame(animate);
      };


      animate();
      handleResize();
    };

    void initializeCanvas();
    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      canvas?.destroy();
    });
  });

  return (
    <div style={{ background: "rebeccapurple" }}>
      <p>Vibecanvas Frontend is running.</p>
      <canvas id="canvas" ref={canvasRef}></canvas>
    </div>
  );
}

export default App;
