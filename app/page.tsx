import { FutbolApp } from "@/components/futbol-app"
import { getMatches, getPlayers, getTeams } from "@/app/actions/futbol"

export const dynamic = "force-dynamic"

export default async function Page() {
  const [players, teams, matches] = await Promise.all([getPlayers(), getTeams(), getMatches()])

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
        <header className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m12 7 4.33 3.15-1.65 5.1H9.32l-1.65-5.1L12 7Z" />
              <path d="M12 7V2.5M16.33 10.15l4.28-1.4M14.68 15.25l2.64 3.65M9.32 15.25l-2.64 3.65M7.67 10.15l-4.28-1.4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">Mundialito MennarSas</h1>
            </div>
        </header>

        <FutbolApp initialPlayers={players} initialTeams={teams} initialMatches={matches} />
      </div>
    </main>
  )
}
