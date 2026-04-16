import type { IService, IStartableService } from "@vibecanvas/runtime";
import type { IServiceContext } from "@vibecanvas/runtime/interface.js";
import type { ThemeService } from "@vibecanvas/service-theme";
import Konva from "konva";
import type { CanvasRegistryService, ContextMenuService, CrdtService, EditorService, LoggingService } from "..";
import type { IRuntimeConfig, IRuntimeHooks } from "../../types";
import { WIDGET_HOST_ELEMENT_DATA_ATTR } from "./CONSTANTS";
import { fxRegisterWidgetTool } from "./fx.register-tool";
import type { IWidgetConfig, IWidgetManagerServiceHooks, IWidgetManagerServiceProps } from "./interface";


export class WidgetManagerService implements IService<IWidgetManagerServiceHooks>, IStartableService<IRuntimeHooks, IRuntimeConfig> {
  readonly name = "widget-manager";
  private crdtService: CrdtService;
  private contextMenuService: ContextMenuService;
  private loggingService: LoggingService;
  private editorService: EditorService;
  private themeService: ThemeService;
  private canvasRegistry: CanvasRegistryService;
  private readonly runtimeHooks!: IRuntimeHooks;


  constructor(props: IWidgetManagerServiceProps) {
    this.crdtService = props.crdtService;
    this.contextMenuService = props.contextMenuService;
    this.loggingService = props.loggingService;
    this.editorService = props.editorService;
    this.themeService = props.themeService;
    this.canvasRegistry = props.canvasRegistryService;
    console.log('WidgetManagerService constructor', props)
  }

  start(ctx: IServiceContext<IRuntimeHooks, IRuntimeConfig>): void | Promise<void> {
    // @ts-expect-error this is safe, start runs before any other method
    this.runtimeHooks = ctx.hooks;
    this.setupExampleWidget();
  }

  registerWidget(wConfig: IWidgetConfig) {
    if (wConfig.tool) {
      fxRegisterWidgetTool({
        editorService: this.editorService,
        konva: Konva,
        themeService: this.themeService
      }, { widgetConfig: wConfig })
    }

    this.canvasRegistry.registerElement({

      id: wConfig.id,
      toElement: (node) => null,
      matchesNode: (node) => node.getAttr(WIDGET_HOST_ELEMENT_DATA_ATTR)?.data?.type === 'custom',
      matchesElement: (element) => element.data.type === "widget" && element.data.kind === wConfig.id,
      createNode: (element) => {
        console.log('WidgetManagerService createNode', element)
        // element.data.type
        return null
      }
    })

  }

  setupExampleWidget() {
    const widgetConfig: IWidgetConfig = {
      id: "example",
      tool: {
        label: "Example",

      }
    }

    this.registerWidget(widgetConfig);
  }
}
