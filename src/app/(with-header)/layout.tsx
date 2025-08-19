import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Button asChild variant="link">
        <Link href="/">Home</Link>
      </Button>
      {children}
    </>
  )
}
