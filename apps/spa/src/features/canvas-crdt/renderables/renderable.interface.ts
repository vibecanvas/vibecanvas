import { Container } from "pixi.js"


export interface IRenderable {
  id: string
  container: Container
  destroy: () => void
}