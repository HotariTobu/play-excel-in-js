import { useBlobUrl } from "@/hooks/use-blob-url"
import { FileArea } from "./file-area"

export const ImageFileArea = (props: { onUpload: (file: File) => void }) => {
  const [imageUrl, setImageFileForBlobUrl] = useBlobUrl()

  const handleUpload = (file: File) => {
    setImageFileForBlobUrl(file)
    props.onUpload(file)
  }

  return (
    <FileArea accept="image/*" onUpload={handleUpload}>
      <div className="border border-gray-300 hover:border-gray-400 border-dashed rounded-md p-4 flex items-center justify-center">
        {imageUrl === null ? (
          <p>Upload Image</p>
        ) : (
          // biome-ignore lint/performance/noImgElement: This image is in browser only
          <img
            className="flex-1 max-w-container max-h-40 object-contain"
            src={imageUrl}
            alt="Preview"
          />
        )}
      </div>
    </FileArea>
  )
}
