export type TUser = {
  id: string;
  name: string;
};

export type TVibecanvasApi = {
  users: {
    get(id: string): Promise<TUser>;
    list(): Promise<TUser[]>;
  };
};

export type TVibecanvasToolButton = {
  icon: string;
  label: string;
};

export type TVibecanvasManifest = {
  id: string;
  permissions: string[];
  toolButton?: TVibecanvasToolButton;
  defaultSize?: {
    width: number;
    height: number;
  };
};

export const api: TVibecanvasApi = new Proxy({} as TVibecanvasApi, {
  get() {
    throw new Error("@vibecanvas/ui api is host-provided at runtime");
  },
});

export {
  createVibecanvasUiShimSource,
  prepareVibecanvasSandboxSource,
  type TVibecanvasSandboxSource,
} from './prepare-sandbox-source';
