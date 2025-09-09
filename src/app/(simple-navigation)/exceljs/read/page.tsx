"use client"

import { Workbook } from "exceljs"
import { useState } from "react"
import { FileArea } from "@/components/file-area"
import { Input } from "@/components/ui/input"
import { useLazyResult } from "@/hooks/use-lazy-result"
import type { LazyResult } from "@/types/lazy-result"
import { readFileAsArrayBuffer } from "@/utils/read-file"
import { ExcelCanvas } from "./excel-canvas"

const useWorkbook = (): [LazyResult<Workbook>, (file: File) => Promise<void>] => {
  const [workbookResult, { handleLoading, handleSuccess, handleError }] = useLazyResult<Workbook>()

  const setWorkbookFile = async (file: File) => {
    handleLoading()
    const bufferResult = await readFileAsArrayBuffer(file)
    if (bufferResult.success) {
      const workbook = new Workbook()
      await workbook.xlsx.load(bufferResult.data)
      handleSuccess(workbook)
    } else {
      handleError(bufferResult.error)
    }
  }

  return [workbookResult, setWorkbookFile]
}

export default function Page() {
  const [workbookResult, setWorkbookFile] = useWorkbook()
  const [sheet, setSheet] = useState("")
  return (
    <>
      <FileArea
        className="border border-gray-300 hover:border-gray-400 border-dashed rounded-md p-4 block w-fit"
        accept=".xlsx"
        onUpload={setWorkbookFile}
      >
        {/* biome-ignore-start lint/style/noNestedTernary: Easy to read */}
        {workbookResult.status === "initial" ? (
          <p>Upload .xlsx</p>
        ) : workbookResult.status === "loading" ? (
          <p>Loading...</p>
        ) : workbookResult.status === "error" ? (
          <p>Error</p>
        ) : (
          <ExcelCanvas workbook={workbookResult.data} scale={0.5} sheet={sheet || undefined} />
        )}
        {/* biome-ignore-end lint/style/noNestedTernary: Easy to read */}
      </FileArea>
      <Input placeholder="Sheet1" value={sheet} onChange={(e) => setSheet(e.target.value)} />
    </>
  )
}
