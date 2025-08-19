import { useCallback, useState } from "react"

type SetFile = (file: File) => void

export const useBlobUrl = (): [string | null, SetFile] => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const setFile = useCallback(
    (file: File) => {
      if (blobUrl !== null) {
        URL.revokeObjectURL(blobUrl)
      }

      const newBlobUrl = URL.createObjectURL(file)
      setBlobUrl(newBlobUrl)
    },
    [blobUrl]
  )

  return [blobUrl, setFile]
}
