"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Separator } from "@/components/ui/separator"

type Group = {
  id: string
  name: string
  slug: string
  created_at: string
}

type Props = {
  groupId?: string
  slug?: string
}

export function JoinGroupForm({ groupId: initialGroupId, slug: initialSlug }: Props) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || "")
  const [slug, setSlug] = useState<string>(initialSlug || "")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [useSlug, setUseSlug] = useState(!!initialSlug)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true)
      const res = await fetch("/api/groups/list")
      if (!res.ok) {
        throw new Error("Failed to fetch groups")
      }
      const data = await res.json()
      setGroups(data || [])
    } catch (error) {
      console.error("Error fetching groups:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de grupos",
        variant: "destructive",
      })
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedGroupId && !slug.trim()) {
      toast({
        title: "Erro",
        description: "Selecione um grupo ou digite o slug",
        variant: "destructive",
      })
      return
    }

    if (!password.trim()) {
      toast({
        title: "Erro",
        description: "Digite a senha do grupo",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroupId || undefined,
          slug: slug || undefined,
          password,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Erro ao entrar no grupo")
      }

      const group = await res.json()

      toast({
        title: "Sucesso",
        description: `Bem-vindo ao grupo ${group.name}!`,
      })

      // Check for redirect parameter
      const urlParams = new URLSearchParams(window.location.search)
      const redirectTripId = urlParams.get("redirect")
      
      if (redirectTripId) {
        router.push(`/app/trips/${redirectTripId}?tab=calendar`)
      } else {
        router.push("/app/trips")
      }
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar no Grupo</CardTitle>
        <CardDescription>
          Selecione um grupo da lista ou digite o slug manualmente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!useSlug ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="group-select">Selecionar Grupo</Label>
                {loadingGroups ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum grupo encontrado
                  </div>
                ) : (
                  <Select
                    value={selectedGroupId}
                    onValueChange={(value) => {
                      setSelectedGroupId(value)
                      setSlug("")
                    }}
                  >
                    <SelectTrigger id="group-select" className="w-full">
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">ou</span>
                <Separator className="flex-1" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setUseSlug(true)
                  setSelectedGroupId("")
                }}
              >
                Digitar slug manualmente
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="slug">Slug do Grupo</Label>
                <Input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    setSelectedGroupId("")
                  }}
                  placeholder="Digite o slug do grupo"
                  required={!selectedGroupId}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setUseSlug(false)
                  setSlug("")
                }}
              >
                Selecionar da lista
              </Button>
            </div>
          )}

          <div>
            <Label htmlFor="password">Senha do Grupo</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              required
              autoFocus={!!selectedGroupId || !!slug}
            />
          </div>

          <Button type="submit" disabled={loading || (!selectedGroupId && !slug)} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
