import Link from "next/link"

export default function Home() {
  return (
    <>
      <h1>Home</h1>
      <Link href="/xlsx">XLSX</Link>
      <Link href="/exceljs">ExcelJS</Link>
    </>
  )
}
