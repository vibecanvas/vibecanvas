import {
  System,
  Commands,
  API,
  DefaultStateManagement,
  App,
  DefaultPlugins,
  Canvas,
  Theme,
  Grid,
  Camera,
  Parent,
  Children,
  Transform,
  Renderable,
  FillSolid,
  Rect,
  Visibility,
  ZIndex,
  system,
  PreStartUp,
  ComputeZIndex,
  Stroke,
  Name,
  Opacity,
} from '@infinite-canvas-tutorial/ecs';
function sizeCanvasElement(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.outline = 'none';
  canvas.style.padding = '0';
  canvas.style.margin = '0';
  return { width, height, dpr };
}
function createCanvasPlugin(canvasRef: HTMLCanvasElement) {
  return () => {
    class StartUpSystem extends System {
      private readonly commands = new Commands(this);
      private readonly writes = this.query((q) =>
        q.using(
          Canvas,
          Theme,
          Grid,
          Camera,
          Parent,
          Children,
          Transform,
          Renderable,
          FillSolid,
          Stroke,
          Name,
          Opacity,
          Rect,
          Visibility,
          ZIndex,
        ).write,
      );
      initialize(): void {
        const { width, height, dpr } = sizeCanvasElement(canvasRef);
        const api = new API(new DefaultStateManagement(), this.commands);
        api.createCanvas({
          element: canvasRef,
          width,
          height,
          devicePixelRatio: dpr,
        });
        api.createCamera({
          zoom: 1,
          x: 0,
          y: 0,
          rotation: 0,
        });
        api.updateNodes([
          {
            id: 'rect-1',
            type: 'rect',
            x: 100,
            y: 100,
            width: 140,
            height: 100,
            fill: '#F67676',
            stroke: '#222',
            strokeWidth: 2,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            zIndex: 1,
            opacity: 1,
            name: 'Rectangle 1',
          },
          {
            id: 'rect-2',
            type: 'rect',
            x: 300,
            y: 180,
            width: 180,
            height: 120,
            fill: '#4ECDC4',
            stroke: '#222',
            strokeWidth: 2,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            zIndex: 2,
            opacity: 1,
            name: 'Rectangle 2',
          },
        ]);
        api.record();
      }
    }
    system(PreStartUp)(StartUpSystem);
    system((s) => s.before(ComputeZIndex))(StartUpSystem);
  };
}
export class CanvasService {
  private readonly app: App;
  constructor(canvasRef: HTMLCanvasElement) {
    sizeCanvasElement(canvasRef);
    this.app = new App().addPlugins(
      ...DefaultPlugins,
      createCanvasPlugin(canvasRef),
    );
    this.app.run();
  }
}