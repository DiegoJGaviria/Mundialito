"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Trash2 } from "lucide-react"
import { addMatch, deleteMatch } from "@/app/actions/futbol"
import type { Match, Team } from "@/lib/db/schema"

export function MatchesTab({ teams, matches, tournament }: { teams: Team[]; matches: Match[]; tournament: string }) {
  const [teamA, setTeamA] = useState<string | null>(null)
  const [teamB, setTeamB] = useState<string | null>(null)
  const [goalsA, setGoalsA] = useState("0")
  const [goalsB, setGoalsB] = useState("0")
  const [isPending, startTransition] = useTransition()

  const teamName = (id: number) => teams.find((t) => t.id === id)?.name ?? "Equipo eliminado"

  const canSave = Boolean(teamA && teamB && teamA !== teamB)

  function handleSave() {
    if (!canSave) return
    startTransition(async () => {
      await addMatch({
        teamAId: Number(teamA),
        teamBId: Number(teamB),
        tournament,
        goalsA: Number(goalsA) || 0,
        goalsB: Number(goalsB) || 0,
        goalScorersA: [],
        goalScorersB: [],
      })
      setGoalsA("0")
      setGoalsB("0")
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteMatch(id)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cargar partido</CardTitle>
          <CardDescription>Elegí los dos equipos, poné los goles y guardá el resultado.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {teams.length < 2 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Necesitás al menos 2 equipos. Sorteá los equipos primero.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Equipo local</Label>
                  <Select value={teamA} onValueChange={setTeamA}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)} disabled={String(t.id) === teamB}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={goalsA}
                    onChange={(e) => setGoalsA(e.target.value)}
                    aria-label="Goles equipo local"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Equipo visitante</Label>
                  <Select value={teamB} onValueChange={setTeamB}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)} disabled={String(t.id) === teamA}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={goalsB}
                    onChange={(e) => setGoalsB(e.target.value)}
                    aria-label="Goles equipo visitante"
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={!canSave || isPending} className="sm:self-end">
                <Save className="h-4 w-4" />
                Guardar partido
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>El ganador se resalta. Los empates se marcan aparte.</CardDescription>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Todavía no hay partidos cargados.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {matches.map((m) => {
                const aWins = m.goalsA > m.goalsB
                const bWins = m.goalsB > m.goalsA
                const draw = m.goalsA === m.goalsB
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2"
                  >
                    <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <span className={`text-right text-sm font-medium ${aWins ? "text-primary" : ""}`}>
                        {teamName(m.teamAId)}
                      </span>
                      <span className="rounded-md bg-background px-2 py-1 text-center font-mono text-sm font-semibold tabular-nums">
                        {m.goalsA} - {m.goalsB}
                      </span>
                      <span className={`text-left text-sm font-medium ${bWins ? "text-primary" : ""}`}>
                        {teamName(m.teamBId)}
                      </span>
                    </div>
                    {draw && (
                      <Badge variant="secondary" className="hidden sm:inline-flex">
                        Empate
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(m.id)}
                      disabled={isPending}
                      aria-label="Eliminar partido"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.20.142"],
}

export default nextConfig
