"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTrip, useDeleteTrip } from "@/lib/hooks/useTrips"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type Props = {
  params: { tripId: string }
}

export default function SettingsPage({ params }: Props) {
  const { data: trip, isLoading } = useTrip(params.tripId)
  const { toast } = useToast()
  const router = useRouter()
  const deleteTrip = useDeleteTrip()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  if (isLoading || !trip) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96" />
      </div>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteTrip.mutateAsync(params.tripId)
      toast({
        title: "Viagem deletada",
        description: "A viagem foi deletada com sucesso.",
      })
      setIsDeleteDialogOpen(false)
      router.push("/app/trips")
    } catch (error) {
      toast({
        title: "Erro ao deletar",
        description: error instanceof Error ? error.message : "Não foi possível deletar a viagem.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Viagem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" defaultValue={trip.name} />
          </div>
          <div>
            <Label htmlFor="destination">Destino</Label>
            <Input id="destination" defaultValue={trip.destination} />
          </div>
          <Button>Salvar Alterações</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar Viagem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deletar Viagem</DialogTitle>
                <DialogDescription>
                  Esta ação não pode ser desfeita. Todos os dados da viagem serão
                  permanentemente deletados.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={deleteTrip.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteTrip.isPending}
                >
                  {deleteTrip.isPending ? "Deletando..." : "Deletar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
