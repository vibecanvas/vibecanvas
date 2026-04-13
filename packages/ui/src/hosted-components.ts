export type THostedComponentManifest = {
  id: string;
  version: string;
  apiVersion: number;
  permissions: string[];
  defaultSize?: {
    width: number;
    height: number;
  };
};

export type THostedComponentBundle = {
  manifest: THostedComponentManifest;
  source: Record<string, string>;
};

export type THostedComponentBridge = Record<
  string,
  Record<string, (...args: unknown[]) => Promise<unknown>>
>;
