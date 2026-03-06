import { Canvas } from "@vibecanvas/canvas";
import { onMount } from "solid-js";

function App() {
  let canvasRef!: HTMLCanvasElement
  onMount(async () => {
    const canvas = await new Canvas({
      canvas: canvasRef,
      renderer: 'webgpu'
    }).initialized
    console.log(canvas)

  })
  return (
    <div>
      <p>Vibecanvas Frontend is running.</p>
      <canvas id="canvas" ref={canvasRef}></canvas>
    </div>
  );
}

export default App;
