"use server"

import { db } from "@/lib/db"
import { matches, players, teams } from "@/lib/db/schema"
import { asc, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ---------- Jugadores ----------

export async function getPlayers() {
  return db.select().from(players).orderBy(asc(players.name))
}

export async function addPlayer(name: string, tournament: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  await db.insert(players).values({ name: trimmed, tournament })
  revalidatePath("/")
}

export async function deletePlayer(id: number) {
  await db.delete(players).where(eq(players.id, id))
  revalidatePath("/")
}

// ---------- Equipos ----------

export async function getTeams() {
  return db.select().from(teams).orderBy(asc(teams.id))
}

export async function drawTeams(playersPerTeam: number, tournament: string) {
  const allPlayers = await db.select().from(players).where(eq(players.tournament, tournament))
  const names = allPlayers.map((p) => p.name)

  // Mezcla aleatoria (Fisher-Yates)
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[names[i], names[j]] = [names[j], names[i]]
  }

  const size = Math.max(1, playersPerTeam)
  const groups: string[][] = []
  for (let i = 0; i < names.length; i += size) {
    groups.push(names.slice(i, i + size))
  }

  // Volver a sortear reemplaza los equipos del torneo y limpia los partidos previos de ese torneo
  await db.delete(matches).where(eq(matches.tournament, tournament))
  await db.delete(teams).where(eq(teams.tournament, tournament))

  if (groups.length > 0) {
    await db.insert(teams).values(
      groups.map((members, index) => ({
        name: `Equipo ${index + 1}`,
        tournament,
        members,
      })),
    )
  }

  revalidatePath("/")
}

// ---------- Partidos ----------

export async function getMatches() {
  return db.select().from(matches).orderBy(desc(matches.createdAt))
}

export async function addMatch(input: {
  teamAId: number
  teamBId: number
  tournament: string
  goalsA: number
  goalsB: number
  goalScorersA: string[]
  goalScorersB: string[]
}) {
  if (input.teamAId === input.teamBId) return
  await db.insert(matches).values({
    teamAId: input.teamAId,
    teamBId: input.teamBId,
    tournament: input.tournament,
    goalsA: Math.max(0, input.goalsA),
    goalsB: Math.max(0, input.goalsB),
    goalScorersA: input.goalScorersA,
    goalScorersB: input.goalScorersB,
  })
  revalidatePath("/")
}

export async function deleteMatch(id: number) {
  await db.delete(matches).where(eq(matches.id, id))
  revalidatePath("/")
}

// ---------- Actualizar equipos ----------

export async function updateTeamName(teamId: number, newName: string) {
  const trimmed = newName.trim()
  if (!trimmed) return
  await db.update(teams).set({ name: trimmed }).where(eq(teams.id, teamId))
  revalidatePath("/")
}

// Sortear confrontaciones (todos contra todos)
export async function drawMatchups(tournament: string, suddenDeath: boolean) {
  const allTeams = await db.select().from(teams).where(eq(teams.tournament, tournament))

  // Limpiar partidos anteriores del torneo
  await db.delete(matches).where(eq(matches.tournament, tournament))

  if (suddenDeath) {
    // Emparejar en bracket simple: 1-2, 3-4, ...
    for (let i = 0; i < allTeams.length; i += 2) {
      if (i + 1 < allTeams.length) {
        await db.insert(matches).values({
          teamAId: allTeams[i].id,
          teamBId: allTeams[i + 1].id,
          tournament,
          goalsA: 0,
          goalsB: 0,
          goalScorersA: [],
          goalScorersB: [],
        })
      }
    }
  } else {
    for (let i = 0; i < allTeams.length; i++) {
      for (let j = i + 1; j < allTeams.length; j++) {
        await db.insert(matches).values({
          teamAId: allTeams[i].id,
          teamBId: allTeams[j].id,
          tournament,
          goalsA: 0,
          goalsB: 0,
          goalScorersA: [],
          goalScorersB: [],
        })
      }
    }
  }

  revalidatePath("/")
}
