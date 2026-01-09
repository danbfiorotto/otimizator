import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-4">Otimizator</h1>
        <p className="text-center text-muted-foreground mb-8">
          Planejador Inteligente de Parques Temáticos
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild size="lg">
            <Link href="/app/groups/new">Criar Grupo</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/app/groups/join">Entrar em Grupo</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
