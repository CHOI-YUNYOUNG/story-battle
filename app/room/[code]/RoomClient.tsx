'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import WaitingRoom from '@/components/room/WaitingRoom'
import GameRoom from '@/components/room/GameRoom'
import StoryReveal from '@/components/room/StoryReveal'
import ResultsPanel from '@/components/room/ResultsPanel'
import type { Room, RoomPlayer, StoryTurn } from '@/types'

interface RoomClientProps {
  initialRoom: Room
  currentUserId: string
  nickname: string
}

type Phase = 'waiting' | 'playing' | 'revealing' | 'results'

export default function RoomClient({ initialRoom, currentUserId, nickname }: RoomClientProps) {
  const [room, setRoom] = useState<Room>(initialRoom)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [turns, setTurns] = useState<StoryTurn[]>([])
  const [phase, setPhase] = useState<Phase>(
    initialRoom.status === 'waiting' ? 'waiting' :
    initialRoom.status === 'playing' ? 'playing' : 'results'
  )
  const supabase = createClient()
  const myPlayer = players.find(p => p.user_id === currentUserId)

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('room_players').select('*')
      .eq('room_id', initialRoom.id).order('turn_order')
    if (data) setPlayers(data)
  }, [supabase, initialRoom.id])

  const fetchTurns = useCallback(async () => {
    const { data } = await supabase
      .from('story_turns').select('*')
      .eq('room_id', initialRoom.id).order('turn_number')
    if (data) setTurns(data)
  }, [supabase, initialRoom.id])

  useEffect(() => {
    fetchPlayers()
    fetchTurns()

    const channel = supabase
      .channel(`room-meta-${initialRoom.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${initialRoom.id}` },
        (payload) => {
          const updated = payload.new as Room
          setRoom(updated)
          if (updated.status === 'waiting') { setTurns([]); setPhase('waiting') }
          if (updated.status === 'playing') setPhase('playing')
          if (updated.status === 'finished') fetchTurns().then(() => setPhase('results'))
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${initialRoom.id}` },
        fetchPlayers)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [initialRoom.id, supabase, fetchPlayers, fetchTurns])

  const handleGameEnd = useCallback(async () => {
    const { data } = await supabase.from('story_turns').select('*').eq('room_id', initialRoom.id).order('turn_number')
    if (data) setTurns(data)
    await supabase.from('story_turns').update({ is_visible: true }).eq('room_id', initialRoom.id)
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', initialRoom.id)
    setPhase('revealing')
  }, [supabase, initialRoom.id])

  const handleRevealComplete = useCallback(() => setPhase('results'), [])

  if (phase === 'waiting') {
    return <WaitingRoom room={room} currentUserId={currentUserId} />
  }
  if (phase === 'playing') {
    return <GameRoom room={room} currentUserId={currentUserId} players={players} onGameEnd={handleGameEnd} />
  }
  if (phase === 'revealing') {
    return <StoryReveal turns={turns} onRevealComplete={handleRevealComplete} />
  }
  return (
    <ResultsPanel
      roomId={initialRoom.id}
      roomCode={initialRoom.code}
      turns={turns}
      players={players}
      currentUserId={currentUserId}
      nickname={myPlayer?.nickname || nickname}
      isHost={myPlayer?.is_host ?? false}
    />
  )
}
