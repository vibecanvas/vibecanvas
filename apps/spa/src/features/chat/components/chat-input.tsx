import { createSignal, Show, For } from "solid-js"
import { Tooltip } from "@kobalte/core/tooltip"
import X from "lucide-solid/icons/x"
import ImageIcon from "lucide-solid/icons/image"

type TPendingImage = {
  id: string
  base64: string
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
  name: string
}

type TImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

export type TContentBlock =
  | { type: "image"; source: { type: "base64"; data: string; media_type: TImageMediaType } }
  | { type: "text"; text: string }

type TChatInputProps = {
  canSend: boolean
  onSend: (content: TContentBlock[]) => void
  onInputFocus?: () => void
}

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
])

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function generateId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ChatInput(props: TChatInputProps) {
  const [text, setText] = createSignal("")
  const [pendingImages, setPendingImages] = createSignal<TPendingImage[]>([])

  const handlePaste = async (e: ClipboardEvent) => {
    // Stop propagation to prevent canvas paste handler from firing
    e.stopPropagation()

    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []

    for (const item of items) {
      if (item.kind === "file" && SUPPORTED_IMAGE_TYPES.has(item.type)) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }

    if (imageFiles.length === 0) return

    // Prevent default only if we're handling images
    e.preventDefault()

    for (const file of imageFiles) {
      try {
        const base64 = await fileToBase64(file)
        const pendingImage: TPendingImage = {
          id: generateId(),
          base64,
          mediaType: file.type as TPendingImage["mediaType"],
          name: file.name || `image.${file.type.split("/")[1]}`,
        }
        setPendingImages((p) => [...p, pendingImage])
      } catch (err) {
        console.error("Failed to process pasted image:", err)
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    if (!props.canSend) return

    const content: TContentBlock[] = []

    // Add images first
    for (const img of pendingImages()) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          data: img.base64,
          media_type: img.mediaType,
        },
      })
    }

    // Add text if present
    if (text().trim()) {
      content.push({ type: "text", text: text().trim() })
    }

    if (content.length === 0) return

    props.onSend(content)
    setText("")
    setPendingImages([])
  }

  const removeImage = (id: string) => {
    setPendingImages((p) => p.filter((img) => img.id !== id))
  }

  return (
    <div>
      <Show when={pendingImages().length > 0}>
        <div class="flex flex-wrap gap-1 px-2 py-1 border-t border-border">
          <For each={pendingImages()}>
            {(img) => <ImageBadge image={img} onRemove={() => removeImage(img.id)} />}
          </For>
        </div>
      </Show>
      <textarea
        value={text()}
        onInput={(e) => setText(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => props.onInputFocus?.()}
        class="w-full p-2 border border-border rounded-md resize-none"
        placeholder="Type your message..."
      />
    </div>
  )
}

function ImageBadge(props: { image: TPendingImage; onRemove: () => void }) {
  return (
    <Tooltip openDelay={200} closeDelay={0} placement="top">
      <Tooltip.Trigger
        as="div"
        class="flex items-center gap-1 px-2 py-1 bg-muted border border-border text-xs cursor-pointer"
      >
        <ImageIcon size={12} />
        <span class="max-w-15 truncate">{props.image.name}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onRemove()
          }}
          class="text-muted-foreground hover:text-destructive"
        >
          <X size={12} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content class="z-50 p-1 bg-card border border-border shadow-md">
          <img
            src={`data:${props.image.mediaType};base64,${props.image.base64}`}
            alt={props.image.name}
            class="max-w-[200px] max-h-[150px] object-contain"
          />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  )
}
