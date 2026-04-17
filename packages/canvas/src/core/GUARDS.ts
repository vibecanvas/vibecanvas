import Konva from 'konva';

export function isKonvaLayer(node: unknown): node is Konva.Layer {
  return node instanceof Konva.Layer;
}

export function isKonvaGroup(node: unknown): node is Konva.Group {
  return node instanceof Konva.Group;
}

export function isKonvaShape(node: unknown): node is Konva.Shape {
  return node instanceof Konva.Shape;
}

export function isKonvaNode(node: unknown): node is Konva.Node {
  return node instanceof Konva.Node;
}

export function isKonvaText(node: unknown): node is Konva.Text {
  return node instanceof Konva.Text;
}

export function isKonvaImage(node: unknown): node is Konva.Image {
  return node instanceof Konva.Image;
}

export function isKonvaPath(node: unknown): node is Konva.Path {
  return node instanceof Konva.Path;
}

export function isKonvaRect(node: unknown): node is Konva.Rect {
  return node instanceof Konva.Rect;
}

export function isKonvaEllipse(node: unknown): node is Konva.Ellipse {
  return node instanceof Konva.Ellipse;
}
