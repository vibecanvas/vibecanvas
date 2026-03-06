import { Canvas, Circle } from "@vibecanvas/canvas";
import { onCleanup, onMount } from "solid-js";

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
      const preferredRenderer = "gpu" in navigator ? "webgpu" : "webgl";

      try {
        canvas = await new Canvas({
          canvas: canvasRef,
          renderer: preferredRenderer,
        }).initialized;
      } catch (error) {
        if (preferredRenderer !== "webgpu") {
          throw error;
        }

        console.warn("WebGPU initialization failed, falling back to WebGL.", error);
        canvas = await new Canvas({
          canvas: canvasRef,
          renderer: "webgl",
        }).initialized;
      }

      const circle = new Circle({
        cx: 100,
        cy: 100,
        r: 100,
        fill: "red",
        antiAliasingType: 3,
      });
      canvas.appendChild(circle);

      const animate = () => {
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
