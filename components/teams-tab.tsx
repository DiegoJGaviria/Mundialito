"use client"

import { useState, useTransition, type Dispatch, type SetStateAction } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shuffle, Dices, Trash2 } from "lucide-react"
import { drawTeams, updateTeamName, drawMatchups, clearTournament } from "@/app/actions/futbol"
import type { Player, Team } from "@/lib/db/schema"

export function TeamsTab({
  players,
  teams,
  tournament,
  matchMode,
  setMatchMode,
}: {
  players: Player[]
  teams: Team[]
  tournament: string
  matchMode: "roundRobin" | "suddenDeath"
  setMatchMode: React.Dispatch<React.SetStateAction<"roundRobin" | "suddenDeath">>
}) {
  const [perTeam, setPerTeam] = useState(4)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNames, setEditNames] = useState<Record<number, string>>({})
  const [isPending, startTransition] = useTransition()

  function handleDraw() {
    startTransition(async () => {
      await drawTeams(perTeam, tournament)
    })
  }

  function handleEditClick(team: Team) {
    setEditingId(team.id)
    setEditNames({ ...editNames, [team.id]: team.name })
  }

  function handleSaveName(teamId: number) {
    const newName = editNames[teamId]?.trim()
    if (newName && newName !== teams.find((t) => t.id === teamId)?.name) {
      startTransition(async () => {
        await updateTeamName(teamId, newName)
      })
    }
    setEditingId(null)
  }

  function handleDrawMatchups() {
    startTransition(async () => {
      await drawMatchups(tournament, matchMode === "suddenDeath")
    })
  }

  function handleClearTournament() {
    startTransition(async () => {
      await clearTournament(tournament)
    })
  }

  const getPlayerNames = (members: string[]) => {
    if (!Array.isArray(members)) return []
    return members
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Sortear equipos</CardTitle>
         </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="perTeam">Jugadores por equipo</Label>
            <Input
              id="perTeam"
              type="number"
              min={1}
              max={Math.max(1, players.length)}
              value={perTeam}
              onChange={(e) => setPerTeam(Math.max(1, Number(e.target.value) || 1))}
              className="w-40"
            />
          </div>
          <Button onClick={handleDraw} disabled={isPending || players.length === 0} className="sm:ml-auto">
            <Shuffle className="h-4 w-4" />
            Sortear equipos
          </Button>
        </CardContent>
      </Card>

      {players.length === 0 && (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Agregá jugadores en la pestaña anterior para poder sortear.
        </p>
      )}

      {teams.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Equipos creados</CardTitle>
</CardHeader>
            <CardContent className="space-y-4">
              {teams.map((team) => (
                <div key={team.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    {editingId === team.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editNames[team.id] || ""}
                          onChange={(e) => setEditNames({ ...editNames, [team.id]: e.target.value })}
                          className="w-40"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveName(team.id)}
                          disabled={isPending}
                        >
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold">{team.name}</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditClick(team)}
                          disabled={isPending}
                        >
                          Editar
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getPlayerNames(team.members).map((member, idx) => (
                      <Badge key={idx} variant="secondary">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sortear confrontaciones</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="matchMode">Modo de sorteo</Label>
                  <select
                    id="matchMode"
                    value={matchMode}
                    onChange={(e) => setMatchMode(e.target.value as "roundRobin" | "suddenDeath")}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="roundRobin">Todos contra todos</option>
                    <option value="suddenDeath">Muerte súbita</option>
                  </select>
                </div>
                
              </div>
              <Button onClick={handleDrawMatchups} disabled={isPending || teams.length < 2} className="w-full sm:w-auto">
                <Dices className="h-4 w-4" />
                Sortear partidos
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearTournament}
                disabled={isPending || teams.length === 0}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar torneo
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
