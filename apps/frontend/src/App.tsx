import { Canvas } from "@vibecanvas/canvas";
import { onMount } from "solid-js";

function App() {
  let canvasRef!: HTMLCanvasElement
  const resize = (width: number, height: number) => {
    canvasRef.width = width * window.devicePixelRatio;
    canvasRef.height = height * window.devicePixelRatio;
    canvasRef.style.width = `${width}px`;
    canvasRef.style.height = `${height}px`;
    canvasRef.style.outline = 'none';
    canvasRef.style.padding = '0px';
    canvasRef.style.margin = '0px';
  };
  resize(window.innerWidth, window.innerHeight);

  onMount(async () => {
    const canvas = await new Canvas({
      canvas: canvasRef,
      renderer: 'webgpu'
    }).initialized
    console.log(canvas)

    const animate = () => {
      canvas.render();
      requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener('resize', () => {
      resize(window.innerWidth, window.innerHeight);
      canvas.resize(window.innerWidth, window.innerHeight);
    });
  })




  return (
    <div>
      <p>Vibecanvas Frontend is running.</p>
      <canvas id="canvas" ref={canvasRef}></canvas>
    </div>
  );
}

export default App;
