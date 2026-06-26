"use client"

import { useState, useTransition, useRef, type Dispatch, type SetStateAction } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shuffle, Dices, Trash2, X, ImagePlus, ShieldOff } from "lucide-react"
import { drawTeams, updateTeamName, drawMatchups, clearTournament, updateTeamMembers, updateTeamLogo } from "@/app/actions/futbol"
import type { Player, Team } from "@/lib/db/schema"

async function fileToCompressedDataUrl(file: File, maxSize = 256): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL("image/png", 0.85)
}

export function TeamsTab({
  players,
  teams,
  tournament,
  matchMode,
}: {
  players: Player[]
  teams: Team[]
  tournament: string
  matchMode: "roundRobin" | "suddenDeath"
}) {
  const [perTeam, setPerTeam] = useState(4)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingMembersId, setEditingMembersId] = useState<number | null>(null)
  const [editNames, setEditNames] = useState<Record<number, string>>({})
  const [editMembers, setEditMembers] = useState<Record<number, string[]>>({})
  const [newMemberInput, setNewMemberInput] = useState<Record<number, string>>({})
  const [isPending, startTransition] = useTransition()
  const [uploadingLogoId, setUploadingLogoId] = useState<number | null>(null)
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  function handleLogoSelect(teamId: number, file: File | undefined) {
    if (!file) return
    setUploadingLogoId(teamId)
    fileToCompressedDataUrl(file)
      .then((dataUrl) => {
        startTransition(async () => {
          await updateTeamLogo(teamId, dataUrl)
          setUploadingLogoId(null)
        })
      })
      .catch(() => setUploadingLogoId(null))
  }

  function handleRemoveLogo(teamId: number) {
    startTransition(async () => {
      await updateTeamLogo(teamId, null)
    })
  }

  function handleDraw() {
    startTransition(async () => {
      await drawTeams(perTeam, tournament)
    })
  }

  function handleEditClick(team: Team) {
    setEditingId(team.id)
    setEditNames({ ...editNames, [team.id]: team.name })
  }

  function handleSaveName(teamId: number) {
    const newName = editNames[teamId]?.trim()
    if (newName && newName !== teams.find((t) => t.id === teamId)?.name) {
      startTransition(async () => {
        await updateTeamName(teamId, newName)
      })
    }
    setEditingId(null)
  }

  function handleEditMembersClick(team: Team) {
    setEditingMembersId(team.id)
    setEditMembers({ ...editMembers, [team.id]: [...(team.members || [])] })
    setNewMemberInput({ ...newMemberInput, [team.id]: "" })
  }

  function handleAddMember(teamId: number) {
    const newMember = newMemberInput[teamId]?.trim()
    if (newMember) {
      const currentMembers = editMembers[teamId] || []
      setEditMembers({ ...editMembers, [teamId]: [...currentMembers, newMember] })
      setNewMemberInput({ ...newMemberInput, [teamId]: "" })
    }
  }

  function handleRemoveMember(teamId: number, index: number) {
    const currentMembers = editMembers[teamId] || []
    setEditMembers({
      ...editMembers,
      [teamId]: currentMembers.filter((_, i) => i !== index),
    })
  }

  function handleSaveMembers(teamId: number) {
    const members = editMembers[teamId] || []
    if (members.length > 0) {
      startTransition(async () => {
        await updateTeamMembers(teamId, members)
      })
    }
    setEditingMembersId(null)
  }

  function handleDrawMatchups() {
    startTransition(async () => {
      await drawMatchups(tournament, matchMode === "suddenDeath")
    })
  }

  function handleClearTournament() {
    startTransition(async () => {
      await clearTournament(tournament)
    })
  }

  const getPlayerNames = (members: string[]) => {
    if (!Array.isArray(members)) return []
    return members
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Sortear equipos</CardTitle>
         </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="perTeam">Jugadores por equipo</Label>
            <Input
              id="perTeam"
              type="number"
              min={1}
              max={Math.max(1, players.length)}
              value={perTeam}
              onChange={(e) => setPerTeam(Math.max(1, Number(e.target.value) || 1))}
              className="w-40"
            />
          </div>
          <Button onClick={handleDraw} disabled={isPending || players.length === 0} className="sm:ml-auto">
            <Shuffle className="h-4 w-4" />
            Sortear equipos
          </Button>
        </CardContent>
      </Card>

      {players.length === 0 && (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Agregá jugadores en la pestaña anterior para poder sortear.
        </p>
      )}

      {teams.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Equipos creados</CardTitle>
</CardHeader>
            <CardContent className="space-y-4">
              {teams.map((team) => (
                <div key={team.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={`Logo ${team.name}`} className="h-full w-full object-contain" />
                      ) : (
                        <ShieldOff className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[team.id] = el
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoSelect(team.id, e.target.files?.[0])}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={isPending || uploadingLogoId === team.id}
                      onClick={() => fileInputRefs.current[team.id]?.click()}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {uploadingLogoId === team.id ? "Subiendo..." : team.logoUrl ? "Cambiar logo" : "Subir logo"}
                    </Button>
                    {team.logoUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() => handleRemoveLogo(team.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="mb-3 flex items-center gap-2">
                    {editingId === team.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editNames[team.id] || ""}
                          onChange={(e) => setEditNames({ ...editNames, [team.id]: e.target.value })}
                          className="w-40"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveName(team.id)}
                          disabled={isPending}
                        >
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold">{team.name}</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditClick(team)}
                          disabled={isPending}
                        >
                          Editar nombre
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Participantes</label>
                      {editingMembersId === team.id ? (
                        <div className="mt-2 space-y-3 rounded-lg bg-secondary/40 p-3">
                          <div className="flex flex-wrap gap-2">
                            {(editMembers[team.id] || []).map((member, idx) => (
                              <Badge key={idx} variant="default" className="flex items-center gap-1">
                                {member}
                                <button
                                  onClick={() => handleRemoveMember(team.id, idx)}
                                  className="ml-1 hover:text-white"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nuevo participante"
                              value={newMemberInput[team.id] || ""}
                              onChange={(e) => setNewMemberInput({ ...newMemberInput, [team.id]: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleAddMember(team.id)
                                }
                              }}
                              className="h-8 text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAddMember(team.id)}
                              className="h-8"
                            >
                              Agregar
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveMembers(team.id)}
                              disabled={isPending}
                              variant="default"
                            >
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingMembersId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getPlayerNames(team.members).map((member, idx) => (
                            <Badge key={idx} variant="secondary">
                              {member}
                            </Badge>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditMembersClick(team)}
                            disabled={isPending}
                            className="ml-2 h-6"
                          >
                            Editar participantes
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sortear confrontaciones</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="matchMode">Modo de sorteo</Label>
                  <div className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                    {matchMode === "suddenDeath" ? "Muerte súbita" : "Todos contra todos"}
                  </div>
                </div>
              </div>
              <Button onClick={handleDrawMatchups} disabled={isPending || teams.length < 2} className="w-full sm:w-auto">
                <Dices className="h-4 w-4" />
                Sortear partidos
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearTournament}
                disabled={isPending || teams.length === 0}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar torneo
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
