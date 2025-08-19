"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Workbook } from "exceljs"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { ImageFileArea } from "@/components/image-file-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Result } from "@/types/result"
import { determineImageType } from "@/utils/determine-image-type"
import { downloadFile } from "@/utils/download-file"
import { readFileAsArrayBuffer } from "@/utils/read-file"

const SUPPORTED_IMAGE_TYPES = ["png", "jpeg", "gif"] as const
const CELL_RANGE_REGEX = /^[A-Z]{1,3}[1-9][0-9]*(?::[A-Z]{1,3}[1-9][0-9]*)?$/

type ImageType = ReturnType<typeof determineImageType>
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

const supportedImageTypeSet = new Set<ImageType>(SUPPORTED_IMAGE_TYPES)

const formSchema = z.object({
  range: z
    .string()
    .regex(CELL_RANGE_REGEX)
    .transform((range) => {
      const [start, end] = range.split(":")
      return `${start}:${end ?? start}`
    }),
})

const isSupportedImageType = (
  imageType: Exclude<ImageType, "unknown">
): imageType is SupportedImageType => supportedImageTypeSet.has(imageType)

const createWorkbookWithImage = (imageBuffer: ArrayBuffer, range: string): Result<Workbook> => {
  const imageType = determineImageType(imageBuffer)
  if (imageType === "unknown") {
    return {
      success: false,
      error: new Error("Unknown image type"),
    }
  }

  if (!isSupportedImageType(imageType)) {
    return {
      success: false,
      error: new Error("Unsupported image type"),
    }
  }

  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet("Sheet1")

  const imageId = workbook.addImage({
    buffer: imageBuffer,
    extension: imageType,
  })

  worksheet.addImage(imageId, range)

  return {
    success: true,
    data: workbook,
  }
}

const downloadWorkbook = async (workbook: Workbook) => {
  const workbookBuffer = await workbook.xlsx.writeBuffer()
  const workbookDataUrl = URL.createObjectURL(new Blob([workbookBuffer]))
  downloadFile(workbookDataUrl, "workbook.xlsx")
}

export default function Page() {
  const form = useForm<z.input<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      range: "",
    },
  })

  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleSubmit = async (data: z.output<typeof formSchema>) => {
    if (imageFile == null) {
      return
    }

    const imageBufferResult = await readFileAsArrayBuffer(imageFile)
    if (!imageBufferResult.success) {
      toast.error(imageBufferResult.error.message)
      return
    }

    const { range } = data

    const workbookResult = createWorkbookWithImage(imageBufferResult.data, range)
    if (!workbookResult.success) {
      toast.error(workbookResult.error.message)
      return
    }

    await downloadWorkbook(workbookResult.data)
  }

  return (
    <>
      <ImageFileArea onUpload={setImageFile} />
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <label>
          Cell Range
          <Input placeholder="A1:B2" {...form.register("range")} />
        </label>
        <Button type="submit">Insert & Create</Button>
      </form>
    </>
  )
}
