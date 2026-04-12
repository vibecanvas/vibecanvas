import { ThemeService, txApplyThemeToElement } from "@vibecanvas/service-theme";
import { setStore, store } from "@/store";

export const themeService = new ThemeService({
  initialThemeId: store.theme,
});

function txSyncThemeDom() {
  if (typeof document === "undefined") {
    return;
  }

  txApplyThemeToElement(document.documentElement, themeService.getTheme());
}

if (store.theme !== themeService.getThemeId()) {
  setStore("theme", themeService.getThemeId());
}

txSyncThemeDom();

themeService.hooks.change.tap((theme) => {
  txSyncThemeDom();

  if (store.theme !== theme.id) {
    setStore("theme", theme.id);
  }
});
