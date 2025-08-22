import Link from "next/link"
import { Button } from "@/components/ui/button"

export const createNavigationPage = (params: { path: string; label: string }[]) => {
  return () =>
    params.map((param) => (
      <Button asChild variant="link" key={param.path}>
        <Link href={param.path}>{param.label}</Link>
      </Button>
    ))
}
