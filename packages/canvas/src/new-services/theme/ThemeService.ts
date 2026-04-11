import type { IService } from "@vibecanvas/runtime";
import { Theme } from "../../services/canvas/enum";

/**
 * Holds canvas theme state.
 * Small service for current visual theme only.
 */
export class ThemeService implements IService {
  readonly name = "theme";

  theme = Theme.LIGHT;
}
