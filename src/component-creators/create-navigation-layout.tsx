import Link from "next/link"
import { Button } from "@/components/ui/button"

export const createNavigationLayout = (params: { path: string; label: string }) => {
  return (props: { children: React.ReactNode }) => {
    return (
      <>
        <Button asChild variant="link">
          <Link href={params.path}>{params.label}</Link>
        </Button>
        {props.children}
      </>
    )
  }
}
