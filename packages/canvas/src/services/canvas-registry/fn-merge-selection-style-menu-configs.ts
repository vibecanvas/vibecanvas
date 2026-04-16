import { TStrokeWidthOption } from "../../components/SelectionStyleMenu/types";
import { TCanvasRegistrySelectionStyleConfig, TCanvasRegistrySelectionStyleSections, TCanvasRegistrySelectionStyleValues } from "./types";

export function fnMergeSelectionStyleMenuConfigs(
  configs: Array<TCanvasRegistrySelectionStyleConfig | null | undefined>,
) {
  let didResolveConfig = false;
  let sections: Partial<TCanvasRegistrySelectionStyleSections> | undefined;
  let values: Partial<TCanvasRegistrySelectionStyleValues> | undefined;
  let strokeWidthOptions: TStrokeWidthOption[] | undefined;

  configs.forEach((config) => {
    if (!config) {
      return;
    }

    didResolveConfig = true;

    if (config.sections) {
      sections = {
        ...(sections ?? {}),
        ...config.sections,
      };
    }

    if (config.values) {
      values = {
        ...(values ?? {}),
        ...config.values,
      };
    }

    if (config.strokeWidthOptions) {
      strokeWidthOptions = config.strokeWidthOptions;
    }
  });

  if (!didResolveConfig) {
    return null;
  }

  return {
    sections,
    values,
    strokeWidthOptions,
  } satisfies TCanvasRegistrySelectionStyleConfig;
}
