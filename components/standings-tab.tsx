"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Match, Team } from "@/lib/db/schema"

type Row = {
  id: number
  name: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

function buildStandings(teams: Team[], matches: Match[]): Row[] {
  const table = new Map<number, Row>()
  for (const t of teams) {
    table.set(t.id, {
      id: t.id,
      name: t.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    })
  }

  for (const m of matches) {
    const a = table.get(m.teamAId)
    const b = table.get(m.teamBId)
    if (!a || !b) continue
    if (m.completed === false) continue

    a.played++
    b.played++
    a.goalsFor += m.goalsA
    a.goalsAgainst += m.goalsB
    b.goalsFor += m.goalsB
    b.goalsAgainst += m.goalsA

    a.goalDifference = a.goalsFor - a.goalsAgainst
    b.goalDifference = b.goalsFor - b.goalsAgainst

    if (m.goalsA > m.goalsB) {
      a.won++
      a.points += 3
      b.lost++
    } else if (m.goalsB > m.goalsA) {
      b.won++
      b.points += 3
      a.lost++
    } else {
      a.drawn++
      b.drawn++
      a.points++
      b.points++
    }
  }

  return Array.from(table.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points
    if (y.goalDifference !== x.goalDifference) return y.goalDifference - x.goalDifference
    return y.goalsFor - x.goalsFor
  })
}

const getName = (teams: Team[], id: number) => teams.find((team) => team.id === id)?.name ?? "Equipo eliminado"

function buildBracket(teams: Team[], matches: Match[]) {
  const pairMap = new Map<string, { teamAId: number; teamBId: number; matches: Match[] }>()

  for (const match of matches) {
    const [teamAId, teamBId] = [match.teamAId, match.teamBId].sort((a, b) => a - b)
    const key = `${teamAId}-${teamBId}`
    const existing = pairMap.get(key)

    if (existing) {
      existing.matches.push(match)
    } else {
      pairMap.set(key, {
        teamAId,
        teamBId,
        matches: [match],
      })
    }
  }

  return Array.from(pairMap.values())
    .map((pair) => {
      const teamA = getName(teams, pair.teamAId)
      const teamB = getName(teams, pair.teamBId)
      const orderedMatches = [...pair.matches].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      let aggregateA = 0
      let aggregateB = 0

      for (const match of orderedMatches) {
        if (match.teamAId === pair.teamAId && match.teamBId === pair.teamBId) {
          aggregateA += match.goalsA
          aggregateB += match.goalsB
        } else {
          aggregateA += match.goalsB
          aggregateB += match.goalsA
        }
      }

      const winner = aggregateA > aggregateB ? teamA : aggregateB > aggregateA ? teamB : null

      return {
        teamA,
        teamB,
        matches: orderedMatches,
        aggregateA,
        aggregateB,
        winner,
      }
    })
    .sort((a, b) => {
      const aDate = a.matches.length ? new Date(a.matches[0].createdAt).getTime() : 0
      const bDate = b.matches.length ? new Date(b.matches[0].createdAt).getTime() : 0
      return aDate - bDate
    })
}

export function StandingsTab({
  teams,
  matches,
  matchMode,
}: {
  teams: Team[]
  matches: Match[]
  matchMode: "roundRobin" | "suddenDeath"
}) {
  const rows = buildStandings(teams, matches)
  const bracket = buildBracket(teams, matches)

  if (matchMode === "suddenDeath") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tabla de muerte súbita</CardTitle>
          <CardDescription>
            Los resultados se suman en ida y vuelta para definir al ganador por global.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bracket.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Cargá resultados para ver quién avanza en el bracket.
            </p>
          ) : (
            <div className="space-y-4">
              {bracket.map(({ teamA, teamB, matches, aggregateA, aggregateB, winner }, index) => (
                <div key={`${teamA}-${teamB}-${index}`} className="rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div className="grid gap-2">
                      <span className="text-sm text-muted-foreground">Encuentro {index + 1}</span>
                      <div className="space-y-3">
                        {matches.map((match) => (
                          <div key={match.id} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="font-medium">{getName(teams, match.teamAId)}</span>
                            <span className="rounded-full bg-background px-3 py-1 text-sm font-semibold">
                              {match.goalsA} - {match.goalsB}
                            </span>
                            <span className="font-medium">{getName(teams, match.teamBId)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-background p-3 text-sm font-semibold text-primary">
                      Global: {teamA} {"("} {aggregateA} - {aggregateB} {")"} {teamB} · {winner ? `Avanza: ${winner}` : "Empate - definir ganador"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tabla de posiciones</CardTitle>
        <CardDescription>3 puntos por victoria, 1 por empate. Se ordena por puntos, diferencia de gol y goles a favor.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Sorteá los equipos para ver la tabla.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="text-center" title="Partidos jugados">
                    PJ
                  </TableHead>
                  <TableHead className="text-center" title="Ganados">
                    G
                  </TableHead>
                  <TableHead className="text-center" title="Empatados">
                    E
                  </TableHead>
                  <TableHead className="text-center" title="Goles a favor">
                    GF
                  </TableHead>
                  <TableHead className="text-center" title="Goles en contra">
                    GC
                  </TableHead>
                  <TableHead className="text-center" title="Diferencia de goles">
                    GD
                  </TableHead>
                  <TableHead className="text-center font-semibold" title="Puntos">
                    Pts
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.played}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.won}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.drawn}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.goalsFor}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.goalsAgainst}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.goalDifference}</TableCell>
                    <TableCell className="text-center font-bold tabular-nums text-primary">{row.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
