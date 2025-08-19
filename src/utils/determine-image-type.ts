type BytePatternPart = number | number[] | null

const IMAGE_TYPES = ["png", "jpeg", "gif", "bmp", "webp"] as const

const MAGIC_NUM_PATTERNS = {
  // biome-ignore-start lint/style/noMagicNumbers: magic numbers are fine here
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpeg: [0xff, 0xd8, 0xff],
  gif: [0x47, 0x49, 0x46, 0x38, [0x37, 0x39], 0x61],
  bmp: [0x42, 0x4d],
  webp: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  // biome-ignore-end lint/style/noMagicNumbers: magic numbers are fine here
} satisfies Record<(typeof IMAGE_TYPES)[number], BytePatternPart[]>

const bytesStartWith = (bytes: Uint8Array, pattern: BytePatternPart[]) => {
  for (const [index, part] of pattern.entries()) {
    if (part == null) {
      continue
    }

    const values = typeof part === "number" ? [part] : part
    if (values.some((value) => bytes[index] !== value)) {
      return false
    }
  }

  return true
}

type ImageType = (typeof IMAGE_TYPES)[number] | "unknown"

export const determineImageType = (arrayBuffer: ArrayBuffer): ImageType => {
  const bytes = new Uint8Array(arrayBuffer)

  for (const type of IMAGE_TYPES) {
    const pattern = MAGIC_NUM_PATTERNS[type]
    if (bytesStartWith(bytes, pattern)) {
      return type
    }
  }

  return "unknown"
}
