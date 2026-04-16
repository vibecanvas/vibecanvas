import type { IService, IStartableService } from "@vibecanvas/runtime";
import type { IServiceContext } from "@vibecanvas/runtime/interface.js";
import type { ThemeService } from "@vibecanvas/service-theme";
import Konva from "konva";
import type { CanvasRegistryService, ContextMenuService, CrdtService, EditorService, LoggingService } from "..";
import type { IHooks, IRuntimeConfig } from "../../runtime";
import { fxRegisterWidgetTool } from "./fx.register-tool";
import type { IWidgetConfig, IWidgetManagerServiceHooks, IWidgetManagerServiceProps } from "./interface";


export class WidgetManagerService implements IService<IWidgetManagerServiceHooks>, IStartableService<IHooks, IRuntimeConfig> {
  readonly name = "widget-manager";
  private crdtService: CrdtService;
  private contextMenuService: ContextMenuService;
  private loggingService: LoggingService;
  private editorService: EditorService;
  private themeService: ThemeService;
  private canvasRegistry: CanvasRegistryService;
  private readonly runtimeHooks!: IHooks;


  constructor(props: IWidgetManagerServiceProps) {
    this.crdtService = props.crdtService;
    this.contextMenuService = props.contextMenuService;
    this.loggingService = props.loggingService;
    this.editorService = props.editorService;
    this.themeService = props.themeService;
    this.canvasRegistry = props.canvasRegistryService;
    console.log('WidgetManagerService constructor', props)
  }

  start(ctx: IServiceContext<IHooks, IRuntimeConfig>): void | Promise<void> {
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
