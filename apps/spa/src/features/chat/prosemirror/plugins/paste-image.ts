import { Plugin } from "prosemirror-state"
import type { EditorView } from "prosemirror-view"

type TPasteImagePluginOptions = {
  supportedImageTypes: Set<string>
  fileToDataUrl: (file: File) => Promise<string>
  generateId: () => string
}

type TImageTokenAttrs = {
  id: string
  filename: string
  mime: string
  url: string
}

async function processImageFile(file: File, view: EditorView, options: TPasteImagePluginOptions) {
  try {
    const dataUrl = await options.fileToDataUrl(file)
    const fallbackExt = file.type.split("/")[1] ?? "png"
    const filename = file.name || `image.${fallbackExt}`

    if (view.isDestroyed) return

    const imageToken = view.state.schema.nodes.image_token
    const attrs: TImageTokenAttrs = {
      id: options.generateId(),
      filename,
      mime: file.type,
      url: dataUrl,
    }

    const node = imageToken.create(attrs)
    const tr = view.state.tr.replaceSelectionWith(node, false).scrollIntoView()
    view.dispatch(tr)
  } catch (error) {
    console.error("Failed to process pasted image", error)
  }
}

function pasteImagePlugin(options: TPasteImagePluginOptions) {
  return new Plugin({
    props: {
      handleDOMEvents: {
        paste(view, event) {
          event.stopPropagation()

          const files = event.clipboardData?.files
          if (!files?.length) return false

          const imageFiles = Array.from(files).filter((file) =>
            options.supportedImageTypes.has(file.type),
          )

          if (!imageFiles.length) return false

          event.preventDefault()

          for (const file of imageFiles) {
            void processImageFile(file, view, options)
          }

          return true
        },
      },
    },
  })
}

export { pasteImagePlugin }
