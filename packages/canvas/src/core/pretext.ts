import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";

export type TTextLayoutResult = {
  height: number;
  lineCount: number;
  maxLineWidth: number;
};

function quoteFontFamily(fontFamily: string) {
  if (fontFamily.includes(" ") && !fontFamily.startsWith('"')) {
    return `"${fontFamily}"`;
  }

  return fontFamily;
}

export function buildPretextFont(args: {
  fontStyle?: string;
  fontSize: number;
  fontFamily: string;
}) {
  const style = args.fontStyle && args.fontStyle !== "normal"
    ? `${args.fontStyle} `
    : "";

  return `${style}${args.fontSize}px ${quoteFontFamily(args.fontFamily)}`;
}

export function measureTextLayout(args: {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle?: string;
  lineHeight: number;
  width: number;
}) {
  const prepared = prepareWithSegments(
    args.text,
    buildPretextFont({
      fontStyle: args.fontStyle,
      fontSize: args.fontSize,
      fontFamily: args.fontFamily,
    }),
    { whiteSpace: "pre-wrap" },
  );
  const layout = layoutWithLines(
    prepared,
    Math.max(1, args.width),
    args.fontSize * args.lineHeight,
  );

  return {
    height: layout.lineCount === 0
      ? args.fontSize * args.lineHeight
      : layout.height,
    lineCount: Math.max(layout.lineCount, 1),
    maxLineWidth: layout.lines.reduce((maxWidth, line) => {
      return Math.max(maxWidth, line.width);
    }, 0),
  } satisfies TTextLayoutResult;
}
