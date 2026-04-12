import type { IService } from "@vibecanvas/runtime";
import { SyncHook } from "@vibecanvas/tapable";
import { BUILTIN_THEMES, DEFAULT_THEME_ID, type ThemeId, type TThemeDefinition } from "./builtins";

export type TThemeServiceArgs = {
  themes?: TThemeDefinition[];
  initialThemeId?: ThemeId;
};

export type TThemeServiceHooks = {
  change: SyncHook<[TThemeDefinition, ThemeId]>;
  registryChange: SyncHook<[TThemeDefinition[]]>;
};

export class ThemeService implements IService<TThemeServiceHooks> {
  readonly name = "theme";
  readonly hooks: TThemeServiceHooks = {
    change: new SyncHook(),
    registryChange: new SyncHook(),
  };

  #themes = new Map<ThemeId, TThemeDefinition>();
  #themeId: ThemeId = DEFAULT_THEME_ID;

  constructor(args: TThemeServiceArgs = {}) {
    this.addThemes(BUILTIN_THEMES);

    if (args.themes && args.themes.length > 0) {
      this.addThemes(args.themes);
    }

    this.#themeId = this.#resolveThemeId(args.initialThemeId);
  }

  getThemeId() {
    return this.#themeId;
  }

  getTheme() {
    return this.#themes.get(this.#themeId) ?? this.#getFallbackTheme();
  }

  getThemes() {
    return [...this.#themes.values()];
  }

  hasTheme(themeId: ThemeId) {
    return this.#themes.has(themeId);
  }

  setTheme(themeId: ThemeId) {
    const nextThemeId = this.#resolveThemeId(themeId);
    if (nextThemeId === this.#themeId) {
      return this.getTheme();
    }

    this.#themeId = nextThemeId;
    const theme = this.getTheme();
    this.hooks.change.call(theme, this.#themeId);
    return theme;
  }

  addTheme(theme: TThemeDefinition) {
    this.#themes.set(theme.id, theme);
    this.hooks.registryChange.call(this.getThemes());

    if (theme.id === this.#themeId) {
      this.hooks.change.call(theme, this.#themeId);
    }

    return theme;
  }

  addThemes(themes: TThemeDefinition[]) {
    themes.forEach((theme) => {
      this.#themes.set(theme.id, theme);
    });
    this.hooks.registryChange.call(this.getThemes());

    const activeTheme = this.#themes.get(this.#themeId);
    if (activeTheme) {
      this.hooks.change.call(activeTheme, this.#themeId);
    }

    return this.getThemes();
  }

  #resolveThemeId(themeId: ThemeId | undefined) {
    if (themeId && this.#themes.has(themeId)) {
      return themeId;
    }

    if (this.#themes.has(DEFAULT_THEME_ID)) {
      return DEFAULT_THEME_ID;
    }

    return this.#getFallbackTheme().id;
  }

  #getFallbackTheme() {
    const firstTheme = this.#themes.values().next().value;
    if (!firstTheme) {
      throw new Error("ThemeService requires at least one theme");
    }

    return firstTheme;
  }
}
