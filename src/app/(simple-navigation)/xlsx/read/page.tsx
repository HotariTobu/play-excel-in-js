"use client"

import DomPurify from "dompurify"
import { toast } from "sonner"
import { read, utils } from "xlsx"
import { FileArea } from "@/components/file-area"
import { ImageFileArea } from "@/components/image-file-area"
import { useLazyResult } from "@/hooks/use-lazy-result"
import type { LazyResult } from "@/types/lazy-result"
import { asError } from "@/utils/as-error"
import { readFileAsArrayBuffer } from "@/utils/read-file"

const readSheet = (buf: ArrayBuffer) => {
  const workbook = read(buf, {
    bookFiles: true,
    cellDates: true,
    // biome-ignore lint/style/useNamingConvention: XLSX naming
    cellNF: true,
    cellStyles: true,
  })

  const sheetName = workbook.SheetNames[0]
  if (typeof sheetName === "undefined") {
    throw new Error("No sheet found")
  }

  const worksheet = workbook.Sheets[sheetName]
  if (typeof worksheet === "undefined") {
    throw new Error("No worksheet found")
  }

  return worksheet
}

type SetFile = (file: File) => void

const useSheetHtml = (): [LazyResult<string>, SetFile] => {
  const [sheetHtmlResult, { handleSuccess, handleError }] = useLazyResult<string>()

  const setSheetFile = async (file: File) => {
    const result = await readFileAsArrayBuffer(file)
    if (result.success) {
      const worksheet = readSheet(result.data)
      const html = utils.sheet_to_html(worksheet)
      handleSuccess(html)
    } else {
      handleError(result.error)
    }
  }

  return [sheetHtmlResult, setSheetFile]
}

export default function Page() {
  const [sheetHtmlResult, handleXlsxUpload] = useSheetHtml()

  const handleImageUpload = async (file: File) => {
    const result = await readFileAsArrayBuffer(file)
    if (result.success) {
      toast.success("File read successfully", {
        description: result.data.byteLength,
      })
    } else {
      const { message } = asError(result.error)
      toast.error(`Failed to read file: ${message}`)
    }
  }

  return (
    <>
      <FileArea
        className="border border-gray-300 hover:border-gray-400 border-dashed rounded-md p-4 flex flex-col items-center justify-center"
        accept=".xlsx"
        disabled={sheetHtmlResult.status === "loading"}
        onUpload={handleXlsxUpload}
      >
        {/* biome-ignore-start lint/style/noNestedTernary: Easy to read */}
        {sheetHtmlResult.status === "initial" ? (
          <p>Upload .xlsx</p>
        ) : sheetHtmlResult.status === "loading" ? (
          <p>Loading...</p>
        ) : sheetHtmlResult.status === "error" ? (
          <p>Error</p>
        ) : (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: XLSX can only output HTML
          <div dangerouslySetInnerHTML={{ __html: DomPurify.sanitize(sheetHtmlResult.data) }} />
        )}
        {/* biome-ignore-end lint/style/noNestedTernary: Easy to read */}
      </FileArea>
      <ImageFileArea className="max-w-container max-h-40 flex" onUpload={handleImageUpload} />
    </>
  )
}
