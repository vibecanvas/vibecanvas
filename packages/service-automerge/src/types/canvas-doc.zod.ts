import { z } from 'zod';

export const zPoint2D = z.tuple([z.number(), z.number()]);

export const zBinding = z.object({
  targetId: z.string(),
  anchor: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const zBaseElement = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  zIndex: z.string(),
  parentGroupId: z.string().nullable(),
  bindings: z.array(zBinding),
  locked: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const zDrawingStyle = z.object({
  backgroundColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().optional(),
  cornerRadius: z.number().optional(),
});

export const zRectData = z.object({
  type: z.literal('rect'),
  w: z.number(),
  h: z.number(),
  radius: z.number().optional(),
});

export const zEllipseData = z.object({
  type: z.literal('ellipse'),
  rx: z.number(),
  ry: z.number(),
});

export const zDiamondData = z.object({
  type: z.literal('diamond'),
  w: z.number(),
  h: z.number(),
  radius: z.number().optional(),
});

export const zLineData = z.object({
  type: z.literal('line'),
  lineType: z.union([z.literal('straight'), z.literal('curved')]),
  points: z.array(zPoint2D),
  startBinding: zBinding.nullable(),
  endBinding: zBinding.nullable(),
});

export const zArrowData = z.object({
  type: z.literal('arrow'),
  lineType: z.union([z.literal('straight'), z.literal('curved')]),
  points: z.array(zPoint2D),
  startBinding: zBinding.nullable(),
  endBinding: zBinding.nullable(),
  startCap: z.union([z.literal('none'), z.literal('arrow'), z.literal('dot'), z.literal('diamond')]),
  endCap: z.union([z.literal('none'), z.literal('arrow'), z.literal('dot'), z.literal('diamond')]),
});

export const zPenData = z.object({
  type: z.literal('pen'),
  points: z.array(zPoint2D),
  pressures: z.array(z.number()),
  simulatePressure: z.boolean(),
});

export const zTextData = z.object({
  type: z.literal('text'),
  w: z.number(),
  h: z.number(),
  text: z.string(),
  originalText: z.string(),
  fontSize: z.number(),
  fontFamily: z.string(),
  textAlign: z.union([z.literal('left'), z.literal('center'), z.literal('right')]),
  verticalAlign: z.union([z.literal('top'), z.literal('middle'), z.literal('bottom')]),
  lineHeight: z.number(),
  link: z.string().nullable(),
  containerId: z.string().nullable(),
  autoResize: z.boolean(),
});

export const zImageData = z.object({
  type: z.literal('image'),
  url: z.string().nullable(),
  base64: z.string().nullable(),
  w: z.number(),
  h: z.number(),
  crop: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    naturalWidth: z.number(),
    naturalHeight: z.number(),
  }),
});

export const zFiletreeData = z.object({
  type: z.literal('filetree'),
  w: z.number(),
  h: z.number(),
  isCollapsed: z.boolean(),
  path: z.string(),
  id: z.string().optional()
});

export const zTerminalData = z.object({
  type: z.literal('terminal'),
  w: z.number(),
  h: z.number(),
  isCollapsed: z.boolean(),
  workingDirectory: z.string(),
});

export const zFileData = z.object({
  type: z.literal('file'),
  w: z.number(),
  h: z.number(),
  isCollapsed: z.boolean(),
  path: z.string(),
  renderer: z.union([
    z.literal('pdf'),
    z.literal('image'),
    z.literal('text'),
    z.literal('code'),
    z.literal('markdown'),
    z.literal('audio'),
    z.literal('video'),
    z.literal('unknown'),
  ]),
});

export const zIframeBrowserTab = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
});

export const zIframeBrowserData = z.object({
  type: z.literal('iframe-browser'),
  w: z.number(),
  h: z.number(),
  isCollapsed: z.boolean(),
  tabs: z.array(zIframeBrowserTab),
  activeTabId: z.string(),
});

export const zElementData = z.union([
  zRectData,
  zEllipseData,
  zDiamondData,
  zArrowData,
  zLineData,
  zPenData,
  zTextData,
  zImageData,
  zFiletreeData,
  zTerminalData,
  zFileData,
  zIframeBrowserData,
]);

export const zElementStyle = z.object({
  backgroundColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().optional(),
  cornerRadius: z.number().optional(),
  borderColor: z.string().optional(),
  headerColor: z.string().optional(),
});

export const zElement = zBaseElement.extend({
  data: zElementData,
  style: zElementStyle,
});

export const zGroup = z.object({
  id: z.string(),
  parentGroupId: z.string().nullable(),
  zIndex: z.string(),
  locked: z.boolean(),
  createdAt: z.number(),
});

export const zCanvasDoc = z.object({
  id: z.string(),
  name: z.string(),
  elements: z.record(z.string(), zElement),
  groups: z.record(z.string(), zGroup),
});
