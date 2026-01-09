import { ReactNode } from "react"
import Link from "next/link"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/app/dashboard" className="text-xl font-bold">
            Otimizator
          </Link>
          <nav className="flex gap-4">
            <Link href="/app/trips" className="text-sm font-medium hover:underline">
              Trips
            </Link>
            <Link href="/app/dashboard" className="text-sm font-medium hover:underline">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-4">
        <div className="container text-center text-sm text-muted-foreground">
          Powered by{" "}
          <a
            href="https://queue-times.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
          >
            Queue-Times.com
          </a>
        </div>
      </footer>
    </div>
  )
}
