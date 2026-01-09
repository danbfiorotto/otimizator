"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Member = {
  id: string
  user_id: string
  role: "owner" | "admin" | "member"
}

type Props = {
  members: Member[]
}

export function GroupMembers({ members }: Props) {
  const getInitials = (userId: string) => {
    return userId.substring(0, 2).toUpperCase()
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "Proprietário"
      case "admin":
        return "Administrador"
      case "member":
        return "Membro"
      default:
        return role
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membros do Grupo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{getInitials(member.user_id)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">Usuário {member.user_id.substring(0, 8)}</div>
                  <div className="text-sm text-muted-foreground">
                    {member.user_id}
                  </div>
                </div>
              </div>
              <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                {getRoleLabel(member.role)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
