import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <>
      <h2>XLSX</h2>
      <Button asChild variant="link">
        <Link href="/xlsx/read">Read</Link>
      </Button>
      <Button asChild variant="link">
        <Link href="/xlsx/write">Write</Link>
      </Button>
    </>
  )
}
