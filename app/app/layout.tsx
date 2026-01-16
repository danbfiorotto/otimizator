"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { useGroup } from "@/lib/hooks/useGroup"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Menu, LogOut } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/app/dashboard" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary flex items-center gap-2">
            <span className="text-3xl">🎢</span>
            <span className="hidden sm:inline-block">Otimizator</span>
          </Link>

          <div className="flex items-center gap-4">
            {group && (
              <div className="hidden md:block text-sm text-muted-foreground bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20">
                Grupo: <span className="font-bold text-secondary">{group.name}</span>
              </div>
            )}

            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-6 items-center">
              <Link href="/app/trips" className="text-sm font-medium hover:text-primary transition-colors hover:scale-105 transform duration-200">
                Viagens
              </Link>
              <Link href="/app/dashboard" className="text-sm font-medium hover:text-primary transition-colors hover:scale-105 transform duration-200">
                Dashboard
              </Link>
              <Link href="/app/statistics" className="text-sm font-medium hover:text-primary transition-colors hover:scale-105 transform duration-200">
                Estatísticas
              </Link>
              {group && (
                <Button variant="ghost" size="sm" onClick={handleLeave} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              )}
            </nav>

            {/* Mobile Navigation */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  {group && (
                    <DropdownMenuItem className="font-semibold text-secondary focus:text-secondary">
                      Grupo: {group.name}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/app/trips" className="w-full cursor-pointer">Viagens</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/app/dashboard" className="w-full cursor-pointer">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/app/statistics" className="w-full cursor-pointer">Estatísticas</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {group && (
                    <DropdownMenuItem onClick={handleLeave} className="text-destructive focus:text-destructive cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
