import { Schema } from "prosemirror-model"

const chatSchema = new Schema({
  nodes: {
    doc: {
      content: "paragraph+",
    },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() {
        return ["p", 0]
      },
    },
    text: {
      group: "inline",
    },
    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM() {
        return ["br"]
      },
    },
    image_token: {
      group: "inline",
      inline: true,
      atom: true,
      selectable: true,
      draggable: false,
      attrs: {
        id: { default: "" },
        filename: { default: "" },
        mime: { default: "" },
        url: { default: "" },
      },
      toDOM(node) {
        return [
          "span",
          {
            class: "image-token",
            "data-image-id": node.attrs.id,
            "data-filename": node.attrs.filename,
            "data-mime": node.attrs.mime,
            "data-url": node.attrs.url,
          },
          `[image: ${node.attrs.filename}]`,
        ]
      },
      parseDOM: [
        {
          tag: "span.image-token",
          getAttrs(dom) {
            const el = dom as HTMLElement
            return {
              id: el.getAttribute("data-image-id") ?? "",
              filename: el.getAttribute("data-filename") ?? "",
              mime: el.getAttribute("data-mime") ?? "",
              url: el.getAttribute("data-url") ?? "",
            }
          },
        },
      ],
    },
  },
})

export { chatSchema }
