export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function getTurnOwner(turnNumber: number, players: { user_id: string; turn_order: number }[]): string | null {
  // Pattern: human(0), ai(1), human(0), ai(1), ... cycling through players
  // Even turns (0-indexed) are human, odd are AI
  if (turnNumber % 2 === 1) return null // AI turn

  const humanTurnIndex = Math.floor(turnNumber / 2)
  const playerIndex = humanTurnIndex % players.length
  const player = players.find(p => p.turn_order === playerIndex)
  return player?.user_id ?? null
}

export function isAiTurn(turnNumber: number): boolean {
  return turnNumber % 2 === 1
}

export function getTotalTurns(playerCount: number): number {
  // Each player writes twice, AI writes between each human turn + final ending
  // Pattern for 2 players: H A H A H A H A (end) = 4 human + 4 AI = 8 turns (0-indexed: 0-7)
  return playerCount * 4
}
