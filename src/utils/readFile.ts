import type { Result } from "@/types/result"

const createReader = (
  onLoad: (result: string | ArrayBuffer | null) => void,
  onError: (error: Error) => void
) => {
  const reader = new FileReader()
  reader.onload = () => {
    onLoad(reader.result)
  }
  reader.onerror = () => {
    onError(reader.error ?? new Error("Failed to read file"))
  }
  return reader
}

export const readFileAsArrayBuffer = (file: File) =>
  new Promise<Result<ArrayBuffer>>((resolve) => {
    const reader = createReader(
      (data) => {
        if (data instanceof ArrayBuffer) {
          resolve({
            success: true,
            data,
          })
        } else {
          resolve({
            success: false,
            error: new Error("Invalid file"),
          })
        }
      },
      (error) => {
        resolve({
          success: false,
          error,
        })
      }
    )
    reader.readAsArrayBuffer(file)
  })
