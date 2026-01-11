"use client"

import Link from "next/link"
import { Copy } from "lucide-react"
import { useGroup } from "@/lib/hooks/useGroup"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTrips } from "@/lib/hooks/useTrips"
import { useToast } from "@/components/ui/use-toast"

export default function DashboardPage() {
  const { data: group, isLoading: groupLoading } = useGroup()
  const { data: trips, isLoading: tripsLoading } = useTrips()
  const { toast } = useToast()

  if (groupLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-32 mb-6" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Nenhum Grupo Ativo</CardTitle>
            <CardDescription>
              Você precisa estar em um grupo para planejar viagens
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button asChild>
              <Link href="/app/groups/new">Criar Grupo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/groups/join">Entrar em Grupo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Bem-vindo ao grupo <span className="font-semibold">{group.name}</span>
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Suas Viagens</CardTitle>
            <CardDescription>
              {tripsLoading
                ? "Carregando..."
                : trips && trips.length > 0
                ? `${trips.length} viagem${trips.length > 1 ? "ns" : ""}`
                : "Nenhuma viagem ainda"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/trips/new">Nova Viagem</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compartilhar Grupo</CardTitle>
            <CardDescription>
              Compartilhe a senha do grupo com quem quiser participar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Link do grupo:
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-xs flex-1 break-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/app/groups/join?slug=${group.slug}`
                    : "..."}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (typeof window !== "undefined") {
                      const link = `${window.location.origin}/app/groups/join?slug=${group.slug}`
                      try {
                        await navigator.clipboard.writeText(link)
                        toast({
                          title: "Link copiado",
                          description: "O link do grupo foi copiado para a área de transferência",
                        })
                      } catch (error) {
                        toast({
                          title: "Erro",
                          description: "Não foi possível copiar o link",
                          variant: "destructive",
                        })
                      }
                    }
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
