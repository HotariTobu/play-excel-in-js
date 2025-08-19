"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { read, utils, writeFile } from "xlsx"
import { z } from "zod"
import { readFileAsArrayBuffer } from "@/utils/readFile"

const rowDataSchema = z.object({
  name: z.string().nonempty(),
  index: z.coerce.number().int().positive(),
})

type RowData = z.output<typeof rowDataSchema>

const initialSheetData = [
  { name: "Bill Clinton", index: 42 },
  { name: "GeorgeW Bush", index: 43 },
  { name: "Barack Obama", index: 44 },
  { name: "Donald Trump", index: 45 },
  { name: "Joseph Biden", index: 46 },
] as const satisfies RowData[]

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

  return utils.sheet_to_json(worksheet)
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export default function Page() {
  const [sheetData, setSheetData] = useState<RowData[]>(initialSheetData)

  const form = useForm<z.input<typeof rowDataSchema>, never, RowData>({
    resolver: zodResolver(rowDataSchema),
    defaultValues: {
      name: "",
      index: 0,
    },
  })

  const handleSubmit = (data: RowData) => {
    if (sheetData.some((row) => row.index === data.index)) {
      toast.error("Index already exists")
      return
    }

    setSheetData((prev) => [...prev, data])
    form.reset()
  }

  const handleXlsxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (typeof file === "undefined") {
      return
    }

    const result = await readFileAsArrayBuffer(file)
    if (result.success) {
      const data = readSheet(result.data)
      toast.success("File read successfully", {
        description: JSON.stringify(data),
      })
    } else {
      toast.error(`Failed to read file: ${getErrorMessage(result.error)}`)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (typeof file === "undefined") {
      return
    }

    const result = await readFileAsArrayBuffer(file)
    if (result.success) {
      toast.success("File read successfully", {
        description: result.data.byteLength,
      })
    } else {
      toast.error(`Failed to read file: ${getErrorMessage(result.error)}`)
    }
  }

  const handleDownload = () => {
    const workbook = utils.book_new()
    const worksheet = utils.json_to_sheet(sheetData)
    utils.book_append_sheet(workbook, worksheet, "Sheet1")
    writeFile(workbook, "sheet.xlsx")
  }

  return (
    <>
      <h1>XLSX</h1>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex gap-2">
        <input placeholder="Name" autoComplete="off" {...form.register("name")} />
        <input placeholder="Index" autoComplete="off" {...form.register("index")} />
        <button type="submit">Add</button>
      </form>
      <label>
        Upload .xlsx
        <input type="file" accept=".xlsx" onChange={handleXlsxUpload} />
      </label>
      <label>
        Upload Image
        <input type="file" accept="image/*" onChange={handleImageUpload} />
      </label>
      <button type="button" onClick={handleDownload}>
        Download
      </button>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Index</th>
          </tr>
        </thead>
        <tbody>
          {sheetData.map((row) => (
            <tr key={row.index}>
              <td>{row.name}</td>
              <td>{row.index}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
