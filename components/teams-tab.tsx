"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Shuffle } from "lucide-react"
import { drawTeams } from "@/app/actions/futbol"
import type { Player, Team } from "@/lib/db/schema"

export function TeamsTab({ players, teams }: { players: Player[]; teams: Team[] }) {
  const [perTeam, setPerTeam] = useState(4)
  const [isPending, startTransition] = useTransition()

  function handleDraw() {
    startTransition(async () => {
      await drawTeams(perTeam)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Sortear equipos</CardTitle>
          <CardDescription>
            Elegí cuántos jugadores por equipo y sorteá. Podés volver a sortear cuando quieras (esto reinicia los
            partidos cargados).
          </CardDescription>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-primary">{team.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1.5">
                  {team.members.map((member, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">
                        {i + 1}
                      </span>
                      {member}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
