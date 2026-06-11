"use client"

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
  return (
    <Tabs defaultValue="jugadores" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="jugadores">Jugadores</TabsTrigger>
        <TabsTrigger value="equipos">Equipos</TabsTrigger>
        <TabsTrigger value="partidos">Partidos</TabsTrigger>
        <TabsTrigger value="tabla">Tabla</TabsTrigger>
      </TabsList>

      <TabsContent value="jugadores" className="mt-6">
        <PlayersTab players={initialPlayers} />
      </TabsContent>

      <TabsContent value="equipos" className="mt-6">
        <TeamsTab players={initialPlayers} teams={initialTeams} />
      </TabsContent>

      <TabsContent value="partidos" className="mt-6">
        <MatchesTab teams={initialTeams} matches={initialMatches} />
      </TabsContent>

      <TabsContent value="tabla" className="mt-6">
        <StandingsTab teams={initialTeams} matches={initialMatches} />
      </TabsContent>
    </Tabs>
  )
}
