"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { utils, writeFile } from "xlsx"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

const SheetDataTable = (props: { data: RowData[] }) => (
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Index</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map((row) => (
        <tr key={row.index}>
          <td>{row.name}</td>
          <td>{row.index}</td>
        </tr>
      ))}
    </tbody>
  </table>
)

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

  const handleDownload = () => {
    const workbook = utils.book_new()
    const worksheet = utils.json_to_sheet(sheetData)
    utils.book_append_sheet(workbook, worksheet, "Sheet1")
    writeFile(workbook, "sheet.xlsx")
  }

  return (
    <>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex gap-2">
        <Input placeholder="Name" autoComplete="off" {...form.register("name")} />
        <Input placeholder="Index" autoComplete="off" {...form.register("index")} />
        <Button type="submit">Add</Button>
      </form>
      <Button type="button" onClick={handleDownload}>
        Download
      </Button>
      <SheetDataTable data={sheetData} />
    </>
  )
}
