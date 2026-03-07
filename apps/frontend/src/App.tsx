import { App as ECSApp, DefaultPlugins } from "@infinite-canvas-tutorial/ecs";
import { UIPlugin } from "@infinite-canvas-tutorial/webcomponents";
import "@infinite-canvas-tutorial/webcomponents/spectrum";
import { onCleanup, onMount } from "solid-js";
import { v4 as uuidv4 } from "uuid";
import type { Event as ICEvent } from "@infinite-canvas-tutorial/webcomponents";

// Initialize the ECS world — must run before <ic-spectrum-canvas> connects to the DOM
const ecsApp = new ECSApp().addPlugins(...DefaultPlugins, UIPlugin);
ecsApp.run();

// Pre-generate stable IDs for each celestial body
const sunId = uuidv4();
const earthId = uuidv4();
const moonId = uuidv4();
const marsId = uuidv4();

// Orbit radii (in canvas world units)
const EARTH_ORBIT_RADIUS = 220;
const MOON_ORBIT_RADIUS = 70;
const MARS_ORBIT_RADIUS = 360;

// Body sizes
const SUN_SIZE = 120;
const EARTH_SIZE = 50;
const MOON_SIZE = 20;
const MARS_SIZE = 35;

// Center of the solar system in canvas coordinates
const CENTER_X = 500;
const CENTER_Y = 400;

function App() {
  let canvasRef!: HTMLElement;

  onMount(() => {
    let animationFrameId = 0;

    const handleReady = (e: CustomEvent) => {
      const api = e.detail;

      // Celestial body nodes
      const sunNode = {
        id: sunId,
        type: "ellipse" as const,
        x: CENTER_X - SUN_SIZE / 2,
        y: CENTER_Y - SUN_SIZE / 2,
        width: SUN_SIZE,
        height: SUN_SIZE,
        fill: "#ff8800",
        stroke: "#ffaa00",
        strokeWidth: 3,
      };

      const earthNode = {
        id: earthId,
        type: "ellipse" as const,
        x: CENTER_X + EARTH_ORBIT_RADIUS - EARTH_SIZE / 2,
        y: CENTER_Y - EARTH_SIZE / 2,
        width: EARTH_SIZE,
        height: EARTH_SIZE,
        fill: "#3388ff",
        stroke: "#55aaff",
        strokeWidth: 2,
      };

      const moonNode = {
        id: moonId,
        type: "ellipse" as const,
        x: CENTER_X + EARTH_ORBIT_RADIUS + MOON_ORBIT_RADIUS - MOON_SIZE / 2,
        y: CENTER_Y - MOON_SIZE / 2,
        width: MOON_SIZE,
        height: MOON_SIZE,
        fill: "#cccc44",
        stroke: "#eeee88",
        strokeWidth: 1,
      };

      const marsNode = {
        id: marsId,
        type: "ellipse" as const,
        x: CENTER_X + MARS_ORBIT_RADIUS - MARS_SIZE / 2,
        y: CENTER_Y - MARS_SIZE / 2,
        width: MARS_SIZE,
        height: MARS_SIZE,
        fill: "#cc4422",
        stroke: "#ee6644",
        strokeWidth: 2,
      };

      // Add all shapes to the canvas
      api.updateNodes([sunNode, earthNode, moonNode, marsNode]);

      // Animation state
      let earthAngle = 0;
      let moonAngle = 0;
      let marsAngle = Math.PI; // Start Mars on opposite side

      const animate = () => {
        // Orbital speeds (radians per frame)
        earthAngle += 0.008;
        moonAngle += 0.035;
        marsAngle += 0.004;

        // Earth position on its orbit around the sun
        const earthX =
          CENTER_X +
          Math.cos(earthAngle) * EARTH_ORBIT_RADIUS -
          EARTH_SIZE / 2;
        const earthY =
          CENTER_Y +
          Math.sin(earthAngle) * EARTH_ORBIT_RADIUS -
          EARTH_SIZE / 2;

        // Moon position orbiting Earth
        const earthCenterX = earthX + EARTH_SIZE / 2;
        const earthCenterY = earthY + EARTH_SIZE / 2;
        const moonX =
          earthCenterX +
          Math.cos(moonAngle) * MOON_ORBIT_RADIUS -
          MOON_SIZE / 2;
        const moonY =
          earthCenterY +
          Math.sin(moonAngle) * MOON_ORBIT_RADIUS -
          MOON_SIZE / 2;

        // Mars position on its orbit around the sun
        const marsX =
          CENTER_X +
          Math.cos(marsAngle) * MARS_ORBIT_RADIUS -
          MARS_SIZE / 2;
        const marsY =
          CENTER_Y +
          Math.sin(marsAngle) * MARS_ORBIT_RADIUS -
          MARS_SIZE / 2;

        // Update positions via the API (updateAppState=false for perf)
        const earthCurrent = api.getNodeById(earthId);
        if (earthCurrent) {
          api.updateNode(earthCurrent, { x: earthX, y: earthY }, false);
        }

        const moonCurrent = api.getNodeById(moonId);
        if (moonCurrent) {
          api.updateNode(moonCurrent, { x: moonX, y: moonY }, false);
        }

        const marsCurrent = api.getNodeById(marsId);
        if (marsCurrent) {
          api.updateNode(marsCurrent, { x: marsX, y: marsY }, false);
        }

        animationFrameId = requestAnimationFrame(animate);
      };

      // Start animation after a small delay to let the ECS settle
      requestAnimationFrame(() => {
        animate();
      });
    };

    canvasRef.addEventListener(
      "ic-ready" satisfies `${ICEvent}`,
      handleReady as EventListener
    );

    onCleanup(() => {
      cancelAnimationFrame(animationFrameId);
      canvasRef?.removeEventListener("ic-ready", handleReady as EventListener);
    });
  });

  // Set camera position via app-state attribute (avoids timing issues with gotoLandmark)
  const appState = JSON.stringify({
    topbarVisible: true,
    cameraX: CENTER_X - 500,
    cameraY: CENTER_Y - 400,
    cameraZoom: 0.8,
  });

  return (
    <ic-spectrum-canvas
      ref={(el: HTMLElement) => {
        canvasRef = el;
      }}
      renderer="webgl"
      theme="dark"
      app-state={appState}
      style={{
        width: "100vw",
        height: "100vh",
        display: "block",
      }}
    />
  );
}

export default App;
