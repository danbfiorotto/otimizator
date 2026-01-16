import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Castle, Users } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 text-primary/20 animate-bounce delay-700 block max-sm:hidden">
        <Sparkles size={48} />
      </div>
      <div className="absolute bottom-10 right-10 text-secondary/20 animate-pulse delay-500 block max-sm:hidden">
        <Castle size={64} />
      </div>

      <div className="z-10 max-w-5xl w-full flex flex-col items-center justify-center text-center space-y-8">

        <div className="space-y-4 animate-in fade-in zoom-in duration-1000">
          <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-secondary drop-shadow-sm">
            Otimizator
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Seu Planejador <span className="text-accent font-bold">Mágico</span> de Parques Temáticos
          </p>
        </div>

        <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm p-8 rounded-3xl border border-white/20 shadow-xl max-w-md w-full mx-4">
          <div className="flex flex-col gap-4">
            <Button asChild size="lg" className="w-full text-lg h-14 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-200">
              <Link href="/app/groups/new">
                <Sparkles className="mr-2 h-5 w-5" />
                Começar Nova Aventura
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full text-lg h-14 rounded-2xl border-2 hover:bg-secondary/10 hover:text-secondary hover:border-secondary transition-all">
              <Link href="/app/groups/join">
                <Users className="mr-2 h-5 w-5" />
                Juntar-se à Magia
              </Link>
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground/80 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          Otimize sua viagem com planos baseados em dados reais! ✨
        </p>
      </div>
    </main>
  )
}
