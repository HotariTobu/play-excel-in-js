import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <>
      <h1>Home</h1>
      <Button asChild variant="link">
        <Link href="/xlsx">XLSX</Link>
      </Button>
      <Button asChild variant="link">
        <Link href="/exceljs">ExcelJS</Link>
      </Button>
    </>
  )
}
