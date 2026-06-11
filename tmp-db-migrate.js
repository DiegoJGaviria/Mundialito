const fs = require('fs');
const { Client } = require('pg');

const envPath = 'c:/Users/usuario/Downloads/uevo/Mundialito/.env.local';
const env = fs.readFileSync(envPath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .reduce((acc, line) => {
    const idx = line.indexOf('=');
    if (idx !== -1) {
      const key = line.slice(0, idx);
      let val = line.slice(idx + 1);
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      acc[key] = val;
    }
    return acc;
  }, {});

if (!env.DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const client = new Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const queries = [
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS tournament text NOT NULL DEFAULT 'general';`,
  `ALTER TABLE teams ADD COLUMN IF NOT EXISTS tournament text NOT NULL DEFAULT 'general';`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament text NOT NULL DEFAULT 'general';`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS goal_scorers_a jsonb NOT NULL DEFAULT '[]';`,
  `ALTER TABLE matches ADD COLUMN IF NOT EXISTS goal_scorers_b jsonb NOT NULL DEFAULT '[]';`,
];

(async () => {
  try {
    await client.connect();
    for (const query of queries) {
      console.log('Executing:', query);
      await client.query(query);
    }
    const tables = ['players', 'teams', 'matches'];
    for (const table of tables) {
      const res = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
        [table],
      );
      console.log(table + ':', res.rows.map((r) => r.column_name).join(','));
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
