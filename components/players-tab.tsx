"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Users } from "lucide-react"
import { addPlayer, addPlayersBulk, deletePlayer } from "@/app/actions/futbol"
import type { Player } from "@/lib/db/schema"

export function PlayersTab({ players, tournament }: { players: Player[]; tournament: string }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [bulkText, setBulkText] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    setName("")
    startTransition(async () => {
      await addPlayer(trimmed, tournament)
      router.refresh()
    })
  }

  function handleBulkUpload() {
    const names = bulkText
      .split(/[,\r\n]+/)
      .map((value) => value.trim())
      .filter(Boolean)

    if (names.length === 0) return
    setBulkText("")
    startTransition(async () => {
      await addPlayersBulk(names, tournament)
      router.refresh()
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deletePlayer(id)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jugadores</CardTitle>
        <CardDescription>Agregá a todos los participantes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd()
            }}
            placeholder="Nombre del jugador"
            aria-label="Nombre del jugador"
          />
          <Button onClick={handleAdd} disabled={isPending || !name.trim()}>
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {players.length} {players.length === 1 ? "jugador" : "jugadores"}
        </div>

        {players.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Todavía no hay jugadores. Agregá el primero arriba.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2"
              >
                <span className="font-medium">{player.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(player.id)}
                  disabled={isPending}
                  aria-label={`Eliminar ${player.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
