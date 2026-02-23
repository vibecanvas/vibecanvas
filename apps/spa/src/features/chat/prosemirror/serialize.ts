import type { Node as ProseMirrorNode } from "prosemirror-model"
import type { TInputPart } from "../components/chat-input"

function serializeParagraphText(paragraph: ProseMirrorNode): string {
  let paragraphText = ""

  paragraph.forEach((node) => {
    if (node.isText) {
      paragraphText += node.text ?? ""
      return
    }

    if (node.type.name === "hard_break") {
      paragraphText += "\n"
    }
  })

  return paragraphText
}

function collectFileParts(doc: ProseMirrorNode): TInputPart[] {
  const fileParts: TInputPart[] = []

  doc.descendants((node) => {
    if (node.type.name !== "image_token") return true

    fileParts.push({
      type: "file",
      mime: String(node.attrs.mime ?? ""),
      url: String(node.attrs.url ?? ""),
      filename: String(node.attrs.filename ?? ""),
    })

    return false
  })

  return fileParts
}

function collectTextPart(doc: ProseMirrorNode): TInputPart[] {
  const paragraphs: string[] = []

  doc.forEach((node) => {
    if (node.type.name !== "paragraph") return
    paragraphs.push(serializeParagraphText(node))
  })

  const combinedText = paragraphs.join("\n").trim()
  if (!combinedText) return []

  return [{ type: "text", text: combinedText }]
}

function serializeDoc(doc: ProseMirrorNode): TInputPart[] {
  const fileParts = collectFileParts(doc)
  const textParts = collectTextPart(doc)
  return [...fileParts, ...textParts]
}

export { serializeDoc }
