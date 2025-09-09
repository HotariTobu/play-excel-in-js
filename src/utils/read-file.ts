import type { Result } from "@/types/result"
import { asError } from "./as-error"

export const readFileAsArrayBuffer = async (file: File): Promise<Result<ArrayBuffer>> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    return {
      success: true,
      data: arrayBuffer,
    }
  } catch (error) {
    return {
      success: false,
      error: asError(error),
    }
  }
}
