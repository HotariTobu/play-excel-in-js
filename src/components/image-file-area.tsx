import { useBlobUrl } from "@/hooks/use-blob-url"
import { cn } from "@/utils/merge-class"
import { FileArea } from "./file-area"

export const ImageFileArea = (props: { className?: string; onUpload: (file: File) => void }) => {
  const [imageUrl, setImageFile] = useBlobUrl()

  const handleUpload = (file: File) => {
    setImageFile(file)
    props.onUpload(file)
  }

  return (
    <FileArea
      className={cn(
        "border border-gray-300 hover:border-gray-400 border-dashed rounded-md p-4 flex flex-col items-center justify-center",
        props.className
      )}
      accept="image/*"
      onUpload={handleUpload}
    >
      {imageUrl === null ? (
        <p>Upload Image</p>
      ) : (
        // biome-ignore lint/performance/noImgElement: This image is in browser only
        <img className="flex-1 min-h-0 object-contain" src={imageUrl} alt="Preview" />
      )}
    </FileArea>
  )
}
