"use client"

import { useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Match, Player, Team } from "@/lib/db/schema"
import { PlayersTab } from "@/components/players-tab"
import { TeamsTab } from "@/components/teams-tab"
import { MatchesTab } from "@/components/matches-tab"
import { StandingsTab } from "@/components/standings-tab"

export function FutbolApp({
  initialPlayers,
  initialTeams,
  initialMatches,
}: {
  initialPlayers: Player[]
  initialTeams: Team[]
  initialMatches: Match[]
}) {
  // Detectar torneos base (hombres, mujeres) y sus fases
  const tournamentStructure = useMemo(() => {
    const structure = new Map<string, Set<string>>()
    
    for (const team of initialTeams) {
      let base = team.tournament
      let phase = "principal"
      
      if (team.tournament.includes("_round")) {
        base = team.tournament.split("_round")[0]
        phase = "semifinal"
      } else if (team.tournament.includes("_final")) {
        base = team.tournament.split("_final")[0]
        phase = "final"
      }

      if (base !== "general") {
        if (!structure.has(base)) {
          structure.set(base, new Set())
        }
        structure.get(base)!.add(phase)
      }
    }

    return structure
  }, [initialTeams])

  const baseTournaments = Array.from(tournamentStructure.keys()).sort((a, b) => {
    if (a === "hombres") return -1
    if (b === "hombres") return 1
    if (a === "mujeres") return -1
    if (b === "mujeres") return 1
    return a.localeCompare(b)
  })

  const [selectedBase, setSelectedBase] = useState<string>(baseTournaments[0] || "hombres")
  const [selectedPhase, setSelectedPhase] = useState<string>("principal")

  const availablePhases = Array.from(tournamentStructure.get(selectedBase) || ["principal"]).sort((a, b) => {
    const order: Record<string, number> = { principal: 0, semifinal: 1, final: 2 }
    return (order[a] || 3) - (order[b] || 3)
  })

  // Construir el nombre del torneo actual
  const currentTournament = selectedPhase === "principal" 
    ? selectedBase 
    : selectedPhase === "semifinal" 
    ? `${selectedBase}_round2` 
    : `${selectedBase}_final`

  const matchMode = selectedBase === "hombres" ? "suddenDeath" : "roundRobin"

  const players = useMemo(
    () => initialPlayers.filter((player) => player.tournament === selectedBase),
    [initialPlayers, selectedBase],
  )

  const teams = useMemo(
    () => initialTeams.filter((team) => team.tournament === currentTournament),
    [initialTeams, currentTournament],
  )

  const matches = useMemo(
    () => initialMatches.filter((match) => match.tournament === currentTournament),
    [initialMatches, currentTournament],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <h2 className="text-lg font-semibold">
            {selectedBase === "hombres" ? "Torneo de hombres" : selectedBase === "mujeres" ? "Torneo de mujeres" : selectedBase} 
            {selectedPhase !== "principal" && ` - ${selectedPhase.charAt(0).toUpperCase() + selectedPhase.slice(1)}`}
          </h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedBase}
            onChange={(e) => {
              setSelectedBase(e.target.value)
              setSelectedPhase("principal")
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {baseTournaments.map((base) => (
              <option key={base} value={base}>
                {base === "hombres" ? "Torneo de hombres" : base === "mujeres" ? "Torneo de mujeres" : base}
              </option>
            ))}
          </select>

          {availablePhases.length > 0 && (
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availablePhases.map((phase) => (
                <option key={phase} value={phase}>
                  {phase === "principal" ? "Principal" : phase === "semifinal" ? "Semifinal" : "Final"}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <Tabs defaultValue="jugadores" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jugadores">Jugadores</TabsTrigger>
          <TabsTrigger value="equipos">Equipos</TabsTrigger>
          <TabsTrigger value="partidos">Partidos</TabsTrigger>
          <TabsTrigger value="tabla">Tabla</TabsTrigger>
        </TabsList>

        <TabsContent value="jugadores" className="mt-6">
          <PlayersTab players={players} tournament={selectedBase} />
        </TabsContent>

        <TabsContent value="equipos" className="mt-6">
          <TeamsTab players={players} teams={teams} tournament={currentTournament} matchMode={matchMode} />
        </TabsContent>

        <TabsContent value="partidos" className="mt-6">
          <MatchesTab teams={teams} matches={matches} tournament={currentTournament} />
        </TabsContent>

        <TabsContent value="tabla" className="mt-6">
          <StandingsTab teams={teams} matches={matches} matchMode={matchMode} tournament={currentTournament} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
