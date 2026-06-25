const fs = require("fs")
const { Client } = require("pg")
const env = fs.readFileSync(".env.local", "utf8").split(/\r?\n/).reduce((acc, line) => {
  const m = line.match(/^([^=]+)=\"?(.*?)\"?$/)
  if (m) acc[m[1]] = m[2]
  return acc
}, {})

const client = new Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

;(async () => {
  await client.connect()
  await client.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url text')
  await client.query('ALTER TABLE matches ADD COLUMN IF NOT EXISTS cards_a jsonb NOT NULL DEFAULT \'[]\'')
  await client.query('ALTER TABLE matches ADD COLUMN IF NOT EXISTS cards_b jsonb NOT NULL DEFAULT \'[]\'')
  await client.query('ALTER TABLE matches ADD COLUMN IF NOT EXISTS fouls_a integer NOT NULL DEFAULT 0')
  await client.query('ALTER TABLE matches ADD COLUMN IF NOT EXISTS fouls_b integer NOT NULL DEFAULT 0')
  console.log('OK - columnas agregadas: teams.logo_url, matches.cards_a, matches.cards_b, matches.fouls_a, matches.fouls_b')
  await client.end()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
