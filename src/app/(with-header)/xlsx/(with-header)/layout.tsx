import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Layout(props: { children: React.ReactNode }) {
  return (
    <>
      <Button asChild variant="link">
        <Link href="/xlsx">XLSX</Link>
      </Button>
      {props.children}
    </>
  )
}
