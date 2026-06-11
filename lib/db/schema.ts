import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  members: jsonb("members").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  teamAId: integer("team_a_id").notNull(),
  teamBId: integer("team_b_id").notNull(),
  goalsA: integer("goals_a").notNull().default(0),
  goalsB: integer("goals_b").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Player = typeof players.$inferSelect
export type Team = typeof teams.$inferSelect
export type Match = typeof matches.$inferSelect
