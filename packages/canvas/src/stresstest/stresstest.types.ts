export type TStressSceneMetrics = {
  renderer: string;
  tileCount: number;
  drawableCount: number;
  setupMs: number;
  renderMs: number;
};

export type TStressSceneHandle = {
  metrics: TStressSceneMetrics;
  destroy: () => void;
};
