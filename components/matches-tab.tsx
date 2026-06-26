"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, Trash2, Edit2, X, Plus, ShieldOff } from "lucide-react"
import { addMatch, deleteMatch, updateMatch } from "@/app/actions/futbol"
import type { Match, Team, CardEntry } from "@/lib/db/schema"

function TeamLogo({ team }: { team: Team | undefined }) {
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center">
      {team?.logoUrl ? (
        <img src={team.logoUrl} alt="" className="h-full w-full object-contain" />
      ) : (
        <ShieldOff className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  )
}

// Editor de goleadores: lista de nombres (multiset) para un equipo, limitada por los goles cargados
function ScorersEditor({
  label,
  members,
  scorers,
  setScorers,
  maxGoals,
}: {
  label: string
  members: string[]
  scorers: string[]
  setScorers: (s: string[]) => void
  maxGoals: number
}) {
  const [selected, setSelected] = useState("")

  function addScorer() {
    if (!selected) return
    if (scorers.length >= maxGoals) return
    setScorers([...scorers, selected])
  }

  function removeScorer(idx: number) {
    setScorers(scorers.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label} · Goleadores ({scorers.length}/{maxGoals})</Label>
      <div className="flex flex-wrap gap-1.5">
        {scorers.map((s, idx) => (
          <Badge key={idx} variant="secondary" className="flex items-center gap-1">
            ⚽ {s}
            <button onClick={() => removeScorer(idx)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {members.length > 0 && scorers.length < maxGoals && (
        <div className="flex flex-wrap gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="min-w-0 flex-1 basis-32 rounded-lg border border-border bg-background px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Elegir jugador...</option>
            {members.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" className="h-8 flex-shrink-0" onClick={addScorer} disabled={!selected}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

// Editor de tarjetas: jugador + tipo (amarilla/roja)
function CardsEditor({
  label,
  members,
  cards,
  setCards,
}: {
  label: string
  members: string[]
  cards: CardEntry[]
  setCards: (c: CardEntry[]) => void
}) {
  const [selected, setSelected] = useState("")
  const [cardType, setCardType] = useState<"yellow" | "red">("yellow")

  function addCard() {
    if (!selected) return
    setCards([...cards, { player: selected, card: cardType }])
  }

  function removeCard(idx: number) {
    setCards(cards.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label} · Tarjetas</Label>
      <div className="flex flex-wrap gap-1.5">
        {cards.map((c, idx) => (
          <Badge key={idx} variant={c.card === "red" ? "destructive" : "secondary"} className="flex items-center gap-1">
            {c.card === "red" ? "🟥" : "🟨"} {c.player}
            <button onClick={() => removeCard(idx)} className="ml-1 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {members.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="min-w-0 flex-1 basis-32 rounded-lg border border-border bg-background px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Elegir jugador...</option>
            {members.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={cardType}
            onChange={(e) => setCardType(e.target.value as "yellow" | "red")}
            className="w-28 flex-shrink-0 rounded-lg border border-border bg-background px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="yellow">🟨 Amarilla</option>
            <option value="red">🟥 Roja</option>
          </select>
          <Button size="sm" variant="outline" className="h-8 flex-shrink-0" onClick={addCard} disabled={!selected}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function MatchesTab({ teams, matches, tournament }: { teams: Team[]; matches: Match[]; tournament: string }) {
  const [teamA, setTeamA] = useState<string | null>(null)
  const [teamB, setTeamB] = useState<string | null>(null)
  const [goalsA, setGoalsA] = useState("0")
  const [goalsB, setGoalsB] = useState("0")
  const [scorersA, setScorersA] = useState<string[]>([])
  const [scorersB, setScorersB] = useState<string[]>([])
  const [cardsA, setCardsA] = useState<CardEntry[]>([])
  const [cardsB, setCardsB] = useState<CardEntry[]>([])
  const [foulsA, setFoulsA] = useState("0")
  const [foulsB, setFoulsB] = useState("0")

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editGoalsA, setEditGoalsA] = useState("0")
  const [editGoalsB, setEditGoalsB] = useState("0")
  const [editScorersA, setEditScorersA] = useState<string[]>([])
  const [editScorersB, setEditScorersB] = useState<string[]>([])
  const [editCardsA, setEditCardsA] = useState<CardEntry[]>([])
  const [editCardsB, setEditCardsB] = useState<CardEntry[]>([])
  const [editFoulsA, setEditFoulsA] = useState("0")
  const [editFoulsB, setEditFoulsB] = useState("0")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [isPending, startTransition] = useTransition()

  const findTeam = (id: number) => teams.find((t) => t.id === id)
  const teamName = (id: number) => findTeam(id)?.name ?? "Equipo eliminado"
  const teamMembers = (id: string | null) => (id ? findTeam(Number(id))?.members ?? [] : [])

  const canSave = Boolean(teamA && teamB && teamA !== teamB)

  function handleSave() {
    if (!canSave) return
    startTransition(async () => {
      await addMatch({
        teamAId: Number(teamA),
        teamBId: Number(teamB),
        tournament,
        goalsA: Number(goalsA) || 0,
        goalsB: Number(goalsB) || 0,
        goalScorersA: scorersA,
        goalScorersB: scorersB,
        cardsA,
        cardsB,
        foulsA: Number(foulsA) || 0,
        foulsB: Number(foulsB) || 0,
      })
      setGoalsA("0")
      setGoalsB("0")
      setScorersA([])
      setScorersB([])
      setCardsA([])
      setCardsB([])
      setFoulsA("0")
      setFoulsB("0")
      setTeamA(null)
      setTeamB(null)
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteMatch(id)
    })
  }

  function handleEditClick(match: Match) {
    setEditingId(match.id)
    setExpandedId(match.id)
    setEditGoalsA(String(match.goalsA))
    setEditGoalsB(String(match.goalsB))
    setEditScorersA(match.goalScorersA ?? [])
    setEditScorersB(match.goalScorersB ?? [])
    setEditCardsA(match.cardsA ?? [])
    setEditCardsB(match.cardsB ?? [])
    setEditFoulsA(String(match.foulsA ?? 0))
    setEditFoulsB(String(match.foulsB ?? 0))
  }

  function handleSaveEdit(id: number) {
    startTransition(async () => {
      await updateMatch(id, {
        goalsA: Number(editGoalsA) || 0,
        goalsB: Number(editGoalsB) || 0,
        goalScorersA: editScorersA,
        goalScorersB: editScorersB,
        cardsA: editCardsA,
        cardsB: editCardsB,
        foulsA: Number(editFoulsA) || 0,
        foulsB: Number(editFoulsB) || 0,
      })
      setEditingId(null)
    })
  }

  function handleCancelEdit() {
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cargar partido</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {teams.length < 2 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Todavía no hay Equipos cargados.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="teamA">Equipo local</Label>
                  <select
                    id="teamA"
                    value={teamA ?? ""}
                    onChange={(e) => { setTeamA(e.target.value || null); setScorersA([]); setCardsA([]) }}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Elegir equipo</option>
                    {teams.map((t) => (
                      <option key={t.id} value={String(t.id)} disabled={String(t.id) === teamB}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={0}
                    value={goalsA}
                    onChange={(e) => setGoalsA(e.target.value)}
                    aria-label="Goles equipo local"
                  />
                  <Label className="text-xs text-muted-foreground">Faltas cometidas</Label>
                  <Input
                    type="number"
                    min={0}
                    value={foulsA}
                    onChange={(e) => setFoulsA(e.target.value)}
                    aria-label="Faltas equipo local"
                    className="h-8"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="teamB">Equipo visitante</Label>
                  <select
                    id="teamB"
                    value={teamB ?? ""}
                    onChange={(e) => { setTeamB(e.target.value || null); setScorersB([]); setCardsB([]) }}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Elegir equipo</option>
                    {teams.map((t) => (
                      <option key={t.id} value={String(t.id)} disabled={String(t.id) === teamA}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={0}
                    value={goalsB}
                    onChange={(e) => setGoalsB(e.target.value)}
                    aria-label="Goles equipo visitante"
                  />
                  <Label className="text-xs text-muted-foreground">Faltas cometidas</Label>
                  <Input
                    type="number"
                    min={0}
                    value={foulsB}
                    onChange={(e) => setFoulsB(e.target.value)}
                    aria-label="Faltas equipo visitante"
                    className="h-8"
                  />
                </div>
              </div>

              {(teamA || teamB) && (
                <div className="grid gap-4 rounded-lg border border-dashed border-border p-3 sm:grid-cols-2">
                  <ScorersEditor
                    label="Local"
                    members={teamMembers(teamA)}
                    scorers={scorersA}
                    setScorers={setScorersA}
                    maxGoals={Number(goalsA) || 0}
                  />
                  <ScorersEditor
                    label="Visitante"
                    members={teamMembers(teamB)}
                    scorers={scorersB}
                    setScorers={setScorersB}
                    maxGoals={Number(goalsB) || 0}
                  />
                  <CardsEditor label="Local" members={teamMembers(teamA)} cards={cardsA} setCards={setCardsA} />
                  <CardsEditor label="Visitante" members={teamMembers(teamB)} cards={cardsB} setCards={setCardsB} />
                </div>
              )}

              <Button onClick={handleSave} disabled={!canSave || isPending} className="sm:self-end">
                <Save className="h-4 w-4" />
                Guardar partido
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Todavía no hay partidos cargados.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {matches.map((m) => {
                const aWins = m.goalsA > m.goalsB
                const bWins = m.goalsB > m.goalsA
                const draw = m.goalsA === m.goalsB
                const isEditing = editingId === m.id
                const isExpanded = expandedId === m.id
                const teamObjA = findTeam(m.teamAId)
                const teamObjB = findTeam(m.teamBId)
                const hasDetails = (m.goalScorersA?.length ?? 0) > 0 || (m.goalScorersB?.length ?? 0) > 0 ||
                  (m.cardsA?.length ?? 0) > 0 || (m.cardsB?.length ?? 0) > 0 || (m.foulsA ?? 0) > 0 || (m.foulsB ?? 0) > 0

                return (
                  <li
                    key={m.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2"
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <TeamLogo team={teamObjA} />
                          <span className="text-sm font-medium">{teamName(m.teamAId)}</span>
                          <Input
                            type="number"
                            min={0}
                            value={editGoalsA}
                            onChange={(e) => setEditGoalsA(e.target.value)}
                            className="h-8 w-16 flex-shrink-0 text-center"
                          />
                          <span className="text-xs">-</span>
                          <Input
                            type="number"
                            min={0}
                            value={editGoalsB}
                            onChange={(e) => setEditGoalsB(e.target.value)}
                            className="h-8 w-16 flex-shrink-0 text-center"
                          />
                          <span className="text-sm font-medium">{teamName(m.teamBId)}</span>
                          <TeamLogo team={teamObjB} />
                          <div className="ml-auto flex flex-shrink-0 gap-2">
                            <Button size="sm" onClick={() => handleSaveEdit(m.id)} disabled={isPending} className="h-8">
                              Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-3 rounded-lg border border-dashed border-border p-3 sm:grid-cols-2">
                          <ScorersEditor
                            label="Local"
                            members={teamObjA?.members ?? []}
                            scorers={editScorersA}
                            setScorers={setEditScorersA}
                            maxGoals={Number(editGoalsA) || 0}
                          />
                          <ScorersEditor
                            label="Visitante"
                            members={teamObjB?.members ?? []}
                            scorers={editScorersB}
                            setScorers={setEditScorersB}
                            maxGoals={Number(editGoalsB) || 0}
                          />
                          <CardsEditor label="Local" members={teamObjA?.members ?? []} cards={editCardsA} setCards={setEditCardsA} />
                          <CardsEditor label="Visitante" members={teamObjB?.members ?? []} cards={editCardsB} setCards={setEditCardsB} />
                          <div className="flex flex-col gap-2">
                            <Label className="text-xs text-muted-foreground">Faltas local</Label>
                            <Input type="number" min={0} value={editFoulsA} onChange={(e) => setEditFoulsA(e.target.value)} className="h-8 w-24" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label className="text-xs text-muted-foreground">Faltas visitante</Label>
                            <Input type="number" min={0} value={editFoulsB} onChange={(e) => setEditFoulsB(e.target.value)} className="h-8 w-24" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
                            <TeamLogo team={teamObjA} />
                            <span className={`truncate text-right text-sm font-medium ${aWins ? "text-primary" : ""}`}>
                              {teamName(m.teamAId)}
                            </span>
                            <span className="rounded-md bg-background px-2 py-1 text-center font-mono text-sm font-semibold tabular-nums">
                              {m.goalsA} - {m.goalsB}
                            </span>
                            <span className={`truncate text-left text-sm font-medium ${bWins ? "text-primary" : ""}`}>
                              {teamName(m.teamBId)}
                            </span>
                            <TeamLogo team={teamObjB} />
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1">
                            {draw && (
                              <Badge variant="secondary" className="hidden sm:inline-flex">
                                Empate
                              </Badge>
                            )}
                            {hasDetails && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground"
                                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                              >
                                {isExpanded ? "Ocultar" : "Detalles"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleEditClick(m)}
                              disabled={isPending}
                              aria-label="Editar partido"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(m.id)}
                              disabled={isPending}
                              aria-label="Eliminar partido"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="grid gap-3 rounded-lg bg-background/60 p-3 text-xs sm:grid-cols-2">
                            <div>
                              <p className="mb-1 font-medium text-muted-foreground">Goleadores {teamName(m.teamAId)}</p>
                              <div className="flex flex-wrap gap-1">
                                {(m.goalScorersA ?? []).length === 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  m.goalScorersA!.map((s, i) => <Badge key={i} variant="secondary">⚽ {s}</Badge>)
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 font-medium text-muted-foreground">Goleadores {teamName(m.teamBId)}</p>
                              <div className="flex flex-wrap gap-1">
                                {(m.goalScorersB ?? []).length === 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  m.goalScorersB!.map((s, i) => <Badge key={i} variant="secondary">⚽ {s}</Badge>)
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 font-medium text-muted-foreground">Tarjetas {teamName(m.teamAId)}</p>
                              <div className="flex flex-wrap gap-1">
                                {(m.cardsA ?? []).length === 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  m.cardsA!.map((c, i) => (
                                    <Badge key={i} variant={c.card === "red" ? "destructive" : "secondary"}>
                                      {c.card === "red" ? "🟥" : "🟨"} {c.player}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 font-medium text-muted-foreground">Tarjetas {teamName(m.teamBId)}</p>
                              <div className="flex flex-wrap gap-1">
                                {(m.cardsB ?? []).length === 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  m.cardsB!.map((c, i) => (
                                    <Badge key={i} variant={c.card === "red" ? "destructive" : "secondary"}>
                                      {c.card === "red" ? "🟥" : "🟨"} {c.player}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                            <div className="text-muted-foreground">
                              Faltas: {teamName(m.teamAId)} {m.foulsA ?? 0} · {teamName(m.teamBId)} {m.foulsB ?? 0}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
