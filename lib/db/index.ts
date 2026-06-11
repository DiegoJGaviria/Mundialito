import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const globalForPg = globalThis as typeof globalThis & {
  _drizzlePool?: Pool
}

const pool =
  globalForPg._drizzlePool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    allowExitOnIdle: true,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  })

if (!globalForPg._drizzlePool) {
  globalForPg._drizzlePool = pool
}

export const db = drizzle(pool, { schema })
