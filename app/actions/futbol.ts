"use server"

import { db } from "@/lib/db"
import { matches, players, teams, type CardEntry } from "@/lib/db/schema"
import { asc, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// Migración idempotente: agrega columnas nuevas si no existen todavía.
// Se ejecuta una sola vez por instancia (cache en memoria) y no falla
// la operación principal si ya están creadas.
let migrated = false
async function ensureSchema() {
  if (migrated) return
  try {
    await db.execute(sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url text`)
    await db.execute(sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS cards_a jsonb NOT NULL DEFAULT '[]'`)
    await db.execute(sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS cards_b jsonb NOT NULL DEFAULT '[]'`)
    await db.execute(sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS fouls_a integer NOT NULL DEFAULT 0`)
    await db.execute(sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS fouls_b integer NOT NULL DEFAULT 0`)
    migrated = true
  } catch (e) {
    console.error("ensureSchema failed", e)
  }
}

// ---------- Jugadores ----------

export async function getPlayers() {
  await ensureSchema()
  return db.select().from(players).orderBy(asc(players.name))
}

export async function addPlayer(name: string, tournament: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  await db.insert(players).values({ name: trimmed, tournament })
  revalidatePath("/")
}

export async function addPlayersBulk(names: string[], tournament: string) {
  const playersToInsert = names
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, tournament }))

  if (playersToInsert.length === 0) return
  await db.insert(players).values(playersToInsert)
  revalidatePath("/")
}

export async function deletePlayer(id: number) {
  await db.delete(players).where(eq(players.id, id))
  revalidatePath("/")
}

// ---------- Equipos ----------

export async function getTeams() {
  await ensureSchema()
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
  await ensureSchema()
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
  cardsA?: CardEntry[]
  cardsB?: CardEntry[]
  foulsA?: number
  foulsB?: number
}) {
  if (input.teamAId === input.teamBId) return
  await db.insert(matches).values({
    teamAId: input.teamAId,
    teamBId: input.teamBId,
    tournament: input.tournament,
    goalsA: Math.max(0, input.goalsA),
    goalsB: Math.max(0, input.goalsB),
    completed: true,
    goalScorersA: input.goalScorersA,
    goalScorersB: input.goalScorersB,
    cardsA: input.cardsA ?? [],
    cardsB: input.cardsB ?? [],
    foulsA: Math.max(0, input.foulsA ?? 0),
    foulsB: Math.max(0, input.foulsB ?? 0),
  })
  revalidatePath("/")
}

export async function deleteMatch(id: number) {
  await db.delete(matches).where(eq(matches.id, id))
  revalidatePath("/")
}

export async function updateMatch(
  id: number,
  data: {
    goalsA: number
    goalsB: number
    goalScorersA?: string[]
    goalScorersB?: string[]
    cardsA?: CardEntry[]
    cardsB?: CardEntry[]
    foulsA?: number
    foulsB?: number
  },
) {
  await db
    .update(matches)
    .set({
      goalsA: Math.max(0, data.goalsA),
      goalsB: Math.max(0, data.goalsB),
      ...(data.goalScorersA !== undefined ? { goalScorersA: data.goalScorersA } : {}),
      ...(data.goalScorersB !== undefined ? { goalScorersB: data.goalScorersB } : {}),
      ...(data.cardsA !== undefined ? { cardsA: data.cardsA } : {}),
      ...(data.cardsB !== undefined ? { cardsB: data.cardsB } : {}),
      ...(data.foulsA !== undefined ? { foulsA: Math.max(0, data.foulsA) } : {}),
      ...(data.foulsB !== undefined ? { foulsB: Math.max(0, data.foulsB) } : {}),
    })
    .where(eq(matches.id, id))
  revalidatePath("/")
}

// ---------- Actualizar equipos ----------

export async function updateTeamName(teamId: number, newName: string) {
  const trimmed = newName.trim()
  if (!trimmed) return
  await db.update(teams).set({ name: trimmed }).where(eq(teams.id, teamId))
  revalidatePath("/")
}

export async function updateTeamMembers(teamId: number, newMembers: string[]) {
  const cleanedMembers = newMembers
    .map((m) => m.trim())
    .filter(Boolean)

  await db.update(teams).set({ members: cleanedMembers }).where(eq(teams.id, teamId))
  revalidatePath("/")
}

export async function updateTeamLogo(teamId: number, logoUrl: string | null) {
  await db.update(teams).set({ logoUrl }).where(eq(teams.id, teamId))
  revalidatePath("/")
}

// Sortear confrontaciones (todos contra todos)
export async function drawMatchups(tournament: string, suddenDeath: boolean) {
  const allTeams = await db.select().from(teams).where(eq(teams.tournament, tournament))

  // Limpiar partidos anteriores del torneo
  await db.delete(matches).where(eq(matches.tournament, tournament))

  const shuffledTeams = [...allTeams]
  for (let i = shuffledTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]]
  }

  if (suddenDeath) {
    // Emparejar al azar en bracket de ida y vuelta: 1-2, 3-4, ...
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const teamA = shuffledTeams[i]
        const teamB = shuffledTeams[i + 1]

        await db.insert(matches).values({
          teamAId: teamA.id,
          teamBId: teamB.id,
          tournament,
          goalsA: 0,
          goalsB: 0,
          completed: false,
          goalScorersA: [],
          goalScorersB: [],
        })

        await db.insert(matches).values({
          teamAId: teamB.id,
          teamBId: teamA.id,
          tournament,
          goalsA: 0,
          goalsB: 0,
          completed: false,
          goalScorersA: [],
          goalScorersB: [],
        })
      }
    }
  } else {
    const matchups = [] as Array<{ teamAId: number; teamBId: number }>
    for (let i = 0; i < shuffledTeams.length; i++) {
      for (let j = i + 1; j < shuffledTeams.length; j++) {
        matchups.push({
          teamAId: shuffledTeams[i].id,
          teamBId: shuffledTeams[j].id,
        })
      }
    }

    for (const matchup of matchups) {
      await db.insert(matches).values({
        teamAId: matchup.teamAId,
        teamBId: matchup.teamBId,
        tournament,
        goalsA: 0,
        goalsB: 0,
        completed: false,
        goalScorersA: [],
        goalScorersB: [],
      })
    }
  }

  revalidatePath("/")
}

export async function clearTournament(tournament: string) {
  await db.delete(matches).where(eq(matches.tournament, tournament))
  await db.delete(teams).where(eq(teams.tournament, tournament))
  revalidatePath("/")
}

// Obtener ganadores de una ronda de ida y vuelta
export async function playNextRound(tournament: string) {
  const allTeams = await db.select().from(teams).where(eq(teams.tournament, tournament))
  const allMatches = await db.select().from(matches).where(eq(matches.tournament, tournament))

  // Agrupar partidos por enfrentamiento
  const pairMap = new Map<string, { teamAId: number; teamBId: number; matches: typeof allMatches }>()

  for (const match of allMatches) {
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

  // Extraer ganadores
  const winners: { teamId: number; team: typeof allTeams[0] }[] = []

  for (const pair of pairMap.values()) {
    let aggregateA = 0
    let aggregateB = 0

    for (const match of pair.matches) {
      if (match.teamAId === pair.teamAId && match.teamBId === pair.teamBId) {
        aggregateA += match.goalsA
        aggregateB += match.goalsB
      } else {
        aggregateA += match.goalsB
        aggregateB += match.goalsA
      }
    }

    let winnerId: number | null = null
    if (aggregateA > aggregateB) {
      winnerId = pair.teamAId
    } else if (aggregateB > aggregateA) {
      winnerId = pair.teamBId
    }

    if (winnerId) {
      const winnerTeam = allTeams.find((t) => t.id === winnerId)
      if (winnerTeam) {
        winners.push({ teamId: winnerId, team: winnerTeam })
      }
    }
  }

  // Crear nuevo torneo con los ganadores
  // Si es round2, crea round3, etc.
  let newTournament = tournament
  if (tournament.includes("_round")) {
    const roundNum = parseInt(tournament.split("_round")[1]) || 2
    const baseName = tournament.split("_round")[0]
    newTournament = `${baseName}_round${roundNum + 1}`
  } else {
    newTournament = `${tournament}_round2`
  }

  // Limpiar partidos y equipos del nuevo torneo si existe
  await db.delete(matches).where(eq(matches.tournament, newTournament))
  await db.delete(teams).where(eq(teams.tournament, newTournament))

  // Crear equipos con los ganadores
  if (winners.length > 0) {
    await db.insert(teams).values(
      winners.map((w) => ({
        name: w.team.name,
        tournament: newTournament,
        members: w.team.members,
      })),
    )

    // Sortear automáticamente los matchups de la nueva ronda
    const newTeams = await db.select().from(teams).where(eq(teams.tournament, newTournament))

    // Detectar si es muerte súbita o round robin basándose en el torneo base
    const baseTournament = tournament.includes("_round") ? tournament.split("_round")[0] : tournament
    const isSuddenDeath = baseTournament === "hombres"

    const shuffledTeams = [...newTeams]
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]]
    }

    if (isSuddenDeath) {
      // Emparejar al azar en bracket de ida y vuelta: 1-2, 3-4, ...
      for (let i = 0; i < shuffledTeams.length; i += 2) {
        if (i + 1 < shuffledTeams.length) {
          const teamA = shuffledTeams[i]
          const teamB = shuffledTeams[i + 1]

          await db.insert(matches).values({
            teamAId: teamA.id,
            teamBId: teamB.id,
            tournament: newTournament,
            goalsA: 0,
            goalsB: 0,
            completed: false,
            goalScorersA: [],
            goalScorersB: [],
          })

          await db.insert(matches).values({
            teamAId: teamB.id,
            teamBId: teamA.id,
            tournament: newTournament,
            goalsA: 0,
            goalsB: 0,
            completed: false,
            goalScorersA: [],
            goalScorersB: [],
          })
        }
      }
    } else {
      const matchups = [] as Array<{ teamAId: number; teamBId: number }>
      for (let i = 0; i < shuffledTeams.length; i++) {
        for (let j = i + 1; j < shuffledTeams.length; j++) {
          matchups.push({
            teamAId: shuffledTeams[i].id,
            teamBId: shuffledTeams[j].id,
          })
        }
      }

      for (const matchup of matchups) {
        await db.insert(matches).values({
          teamAId: matchup.teamAId,
          teamBId: matchup.teamBId,
          tournament: newTournament,
          goalsA: 0,
          goalsB: 0,
          completed: false,
          goalScorersA: [],
          goalScorersB: [],
        })
      }
    }
  }

  revalidatePath("/")
  return newTournament
}

// Crear la final con los ganadores de las semifinales
export async function createFinal(tournament: string) {
  const allTeams = await db.select().from(teams).where(eq(teams.tournament, tournament))
  const allMatches = await db.select().from(matches).where(eq(matches.tournament, tournament))

  // Agrupar partidos por enfrentamiento
  const pairMap = new Map<string, { teamAId: number; teamBId: number; matches: typeof allMatches }>()

  for (const match of allMatches) {
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

  // Extraer ganadores
  const winners: { teamId: number; team: typeof allTeams[0] }[] = []

  for (const pair of pairMap.values()) {
    let aggregateA = 0
    let aggregateB = 0

    for (const match of pair.matches) {
      if (match.teamAId === pair.teamAId && match.teamBId === pair.teamBId) {
        aggregateA += match.goalsA
        aggregateB += match.goalsB
      } else {
        aggregateA += match.goalsB
        aggregateB += match.goalsA
      }
    }

    let winnerId: number | null = null
    if (aggregateA > aggregateB) {
      winnerId = pair.teamAId
    } else if (aggregateB > aggregateA) {
      winnerId = pair.teamBId
    }

    if (winnerId) {
      const winnerTeam = allTeams.find((t) => t.id === winnerId)
      if (winnerTeam) {
        winners.push({ teamId: winnerId, team: winnerTeam })
      }
    }
  }

  // Crear torneo de final
  const baseTournament = tournament.includes("_round") ? tournament.split("_round")[0] : tournament
  const finalTournament = `${baseTournament}_final`

  // Limpiar partidos y equipos de la final si existe
  await db.delete(matches).where(eq(matches.tournament, finalTournament))
  await db.delete(teams).where(eq(teams.tournament, finalTournament))

  // Crear equipos con los ganadores
  if (winners.length >= 2) {
    await db.insert(teams).values(
      winners.slice(0, 2).map((w) => ({
        name: w.team.name,
        tournament: finalTournament,
        members: w.team.members,
      })),
    )

    // Crear los matchups de la final (ida y vuelta)
    const finalTeams = await db.select().from(teams).where(eq(teams.tournament, finalTournament))
    if (finalTeams.length === 2) {
      const [teamA, teamB] = finalTeams

      // Ida
      await db.insert(matches).values({
        teamAId: teamA.id,
        teamBId: teamB.id,
        tournament: finalTournament,
        goalsA: 0,
        goalsB: 0,
        completed: false,
        goalScorersA: [],
        goalScorersB: [],
      })

      // Vuelta
      await db.insert(matches).values({
        teamAId: teamB.id,
        teamBId: teamA.id,
        tournament: finalTournament,
        goalsA: 0,
        goalsB: 0,
        completed: false,
        goalScorersA: [],
        goalScorersB: [],
      })
    }
  }

  revalidatePath("/")
  return finalTournament
}
