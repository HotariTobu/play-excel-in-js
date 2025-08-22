import { cva, type VariantProps } from "class-variance-authority"
import { type ChangeEvent, type ReactNode, useRef } from "react"

const fileAreaVariants = cva("", {
  variants: {
    disabled: {
      false: "cursor-pointer",
      true: "pointer-event-none",
    },
  },
  defaultVariants: {
    disabled: false,
  },
})

export const FileArea = (
  props: {
    className?: string
    accept: string
    children: ReactNode
    onUpload: (file: File) => void
  } & VariantProps<typeof fileAreaVariants>
) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (typeof file === "undefined") {
      return
    }

    props.onUpload(file)
  }

  return (
    <label className={fileAreaVariants(props)}>
      {props.children}
      <input
        hidden
        type="file"
        accept={props.accept}
        disabled={props.disabled ?? undefined}
        ref={fileInputRef}
        onChange={handleChange}
      />
    </label>
  )
}
