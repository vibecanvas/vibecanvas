import { component, field } from "@lastolivegames/becsy";
const tools = [
  "hand",
  "select",
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
  "pen",
  "text",
  "image",
  "chat",
  "filesystem",
  "terminal",
];


export @component class Tool {
  @field.staticString(tools) declare activeTool: typeof tools[number];
}