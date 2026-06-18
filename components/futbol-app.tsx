"use client"

import { useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Match, Player, Team } from "@/lib/db/schema"
import { PlayersTab } from "@/components/players-tab"
import { TeamsTab } from "@/components/teams-tab"
import { MatchesTab } from "@/components/matches-tab"
import { StandingsTab } from "@/components/standings-tab"

const tournaments = [
  { value: "hombres", label: "Torneo de hombres" },
  { value: "mujeres", label: "Torneo de mujeres" },
]

export function FutbolApp({
  initialPlayers,
  initialTeams,
  initialMatches,
}: {
  initialPlayers: Player[]
  initialTeams: Team[]
  initialMatches: Match[]
}) {
  const [tournament, setTournament] = useState<string>(tournaments[0].value)
  const matchMode = tournament === "hombres" ? "suddenDeath" : "roundRobin"

  const players = useMemo(
    () => initialPlayers.filter((player) => player.tournament === tournament),
    [initialPlayers, tournament],
  )

  const teams = useMemo(
    () => initialTeams.filter((team) => team.tournament === tournament),
    [initialTeams, tournament],
  )

  const matches = useMemo(
    () => initialMatches.filter((match) => match.tournament === tournament),
    [initialMatches, tournament],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
        <h2 className="text-lg font-semibold">{tournaments.find((item) => item.value === tournament)?.label}</h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {tournaments.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tournament === item.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-muted text-muted-foreground hover:bg-secondary"
              }`}
              onClick={() => setTournament(item.value)}
            >
              {item.label}
            </button>
          ))}
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
          <PlayersTab players={players} tournament={tournament} />
        </TabsContent>

        <TabsContent value="equipos" className="mt-6">
          <TeamsTab players={players} teams={teams} tournament={tournament} matchMode={matchMode} />
        </TabsContent>

        <TabsContent value="partidos" className="mt-6">
          <MatchesTab teams={teams} matches={matches} tournament={tournament} />
        </TabsContent>

        <TabsContent value="tabla" className="mt-6">
          <StandingsTab teams={teams} matches={matches} matchMode={matchMode} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
