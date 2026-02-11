/**
 * Drawing Zod Schemas - Single Source of Truth
 *
 * These schemas are used for:
 * 1. API validation (Zod)
 * 2. Database column types (Drizzle)
 * 3. Type inference throughout the app
 */

import { z } from "zod";

// === Drawing Style Schema (visual properties) ===
export const DrawingStyleSchema = z.object({
  backgroundColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().optional(),
  cornerRadius: z.number().optional(),
});

export type TDrawingStyle = z.infer<typeof DrawingStyleSchema>;

// === Drawing Data Schemas (geometry by type) ===

const Point2D = z.tuple([z.number(), z.number()]);

const DrawingDataRect = z.object({
  type: z.literal('rect'),
  w: z.number().min(1),
  h: z.number().min(1),
  radius: z.number().optional(),
});

const DrawingDataEllipse = z.object({
  type: z.literal('ellipse'),
  rx: z.number().min(1),
  ry: z.number().min(1),
});

const DrawingDataDiamond = z.object({
  type: z.literal('diamond'),
  w: z.number().min(1),
  h: z.number().min(1),
  radius: z.number().optional(),
});

/**
 * quadraticCurveTo(
    cpx: number,
    cpy: number,
    x: number,
    y: number,
    smoothness?: number,
): this

with and without smoothness
 */
const BezierSegment4 = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const BezierSegment5 = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]);

const DrawingDataArrow = z.object({
  type: z.literal('arrow'),
  bezier: z.array(z.union([BezierSegment4, BezierSegment5])),
  points: z.array(Point2D),
});

const DrawingDataLine = z.object({
  type: z.literal('line'),
  points: z.array(Point2D),
  controlPoints: z.array(Point2D).optional(),
});

const DrawingDataPen = z.object({
  type: z.literal('pen'),
  points: z.array(Point2D),
  pressures: z.array(z.number()),
  simulatePressure: z.boolean(),
});

const DrawingDataText = z.object({
  type: z.literal('text'),
  w: z.number().min(1),
  h: z.number().min(1),
  text: z.string(),
  originalText: z.string(),
  fontSize: z.number(),
  fontFamily: z.string(),
  textAlign: z.union([z.literal('left'), z.literal('center'), z.literal('right')]),
  verticalAlign: z.union([z.literal('top'), z.literal('middle'), z.literal('bottom')]),
  lineHeight: z.number(),
  link: z.union([z.string(), z.null()]),
  containerId: z.union([z.string(), z.null()]),
  autoResize: z.boolean(),
});

const CropSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().min(1),
  height: z.number().min(1),
  naturalWidth: z.number().min(1),
  naturalHeight: z.number().min(1),
});

const DrawingDataImage = z.object({
  type: z.literal('image'),
  url: z.union([z.string(), z.null()]),
  base64: z.union([z.string(), z.null()]),
  width: z.number().min(1),
  height: z.number().min(1),
  crop: CropSchema,
});

// Discriminated union of all drawing data types
export const DrawingDataSchema = z.union([
  DrawingDataRect,
  DrawingDataEllipse,
  DrawingDataDiamond,
  DrawingDataArrow,
  DrawingDataLine,
  DrawingDataPen,
  DrawingDataText,
  DrawingDataImage,
]);

export type TDrawingData = z.infer<typeof DrawingDataSchema>;

// Export individual schemas for partial validation
export {
  DrawingDataRect,
  DrawingDataEllipse,
  DrawingDataDiamond,
  DrawingDataArrow,
  DrawingDataLine,
  DrawingDataPen,
  DrawingDataText,
  DrawingDataImage,
};
