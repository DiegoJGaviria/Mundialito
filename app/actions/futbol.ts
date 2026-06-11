"use server"

import { db } from "@/lib/db"
import { matches, players, teams } from "@/lib/db/schema"
import { asc, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ---------- Jugadores ----------

export async function getPlayers() {
  return db.select().from(players).orderBy(asc(players.name))
}

export async function addPlayer(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  await db.insert(players).values({ name: trimmed })
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

export async function drawTeams(playersPerTeam: number) {
  const allPlayers = await db.select().from(players)
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

  // Volver a sortear reemplaza los equipos y limpia los partidos previos
  await db.delete(matches)
  await db.delete(teams)

  if (groups.length > 0) {
    await db.insert(teams).values(
      groups.map((members, index) => ({
        name: `Equipo ${index + 1}`,
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
  goalsA: number
  goalsB: number
}) {
  if (input.teamAId === input.teamBId) return
  await db.insert(matches).values({
    teamAId: input.teamAId,
    teamBId: input.teamBId,
    goalsA: Math.max(0, input.goalsA),
    goalsB: Math.max(0, input.goalsB),
  })
  revalidatePath("/")
}

export async function deleteMatch(id: number) {
  await db.delete(matches).where(eq(matches.id, id))
  revalidatePath("/")
}
