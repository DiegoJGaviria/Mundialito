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
  await client.query('ALTER TABLE matches ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false')
  await client.query('UPDATE matches SET completed = true WHERE goals_a <> 0 OR goals_b <> 0')
  console.log('OK')
  await client.end()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
