import { type ChangeEvent, type ReactNode, useRef } from "react"

export const FileArea = (props: {
  className?: string
  accept: string
  children: ReactNode
  onUpload: (file: File) => void
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (typeof file === "undefined") {
      return
    }

    props.onUpload(file)
  }

  return (
    <label className={props.className}>
      {props.children}
      <input hidden type="file" accept={props.accept} ref={fileInputRef} onChange={handleChange} />
    </label>
  )
}
