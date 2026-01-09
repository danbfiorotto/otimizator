"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { useGroup } from "@/lib/hooks/useGroup"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function AppLayout({ children }: { children: ReactNode }) {
  const { data: group } = useGroup()
  const router = useRouter()
  const { toast } = useToast()

  const handleLeave = async () => {
    try {
      const res = await fetch("/api/groups/leave", { method: "POST" })
      if (res.ok) {
        toast({
          title: "Você saiu do grupo",
          description: "Redirecionando...",
        })
        router.push("/")
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível sair do grupo",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/app/dashboard" className="text-xl font-bold">
            Otimizator
          </Link>
          <div className="flex items-center gap-4">
            {group && (
              <div className="text-sm text-muted-foreground">
                Grupo: <span className="font-medium">{group.name}</span>
              </div>
            )}
            <nav className="flex gap-4">
              <Link href="/app/trips" className="text-sm font-medium hover:underline">
                Viagens
              </Link>
              <Link href="/app/dashboard" className="text-sm font-medium hover:underline">
                Dashboard
              </Link>
            </nav>
            {group && (
              <Button variant="ghost" size="sm" onClick={handleLeave}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            )}
          </div>
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
