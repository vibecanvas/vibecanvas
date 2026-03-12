import Konva from "konva";


export class CanvasService {
  #stage: Konva.Stage;

  constructor(private container: HTMLDivElement) {
    this.#stage = new Konva.Stage({
      container,
      width: container.clientWidth || 1,
      height: container.clientHeight || 1,
    });

    var layer = new Konva.Layer();

    // create our shape
    var circle = new Konva.Circle({
      x: this.#stage.width() / 2,
      y: this.#stage.height() / 2,
      radius: 70,
      fill: 'red',
      stroke: 'black',
      strokeWidth: 4,
      draggable: true,
    });

    // add the shape to the layer
    layer.add(circle);

    // add the layer to the stage
    this.#stage.add(layer);

  }

  destroy() {
    this.#stage.destroy();
  }
}