'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Room, RoomPlayer } from '@/types'

interface WaitingRoomProps {
  room: Room
  currentUserId: string
}

export default function WaitingRoom({ room, currentUserId }: WaitingRoomProps) {
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isHost = players.find(p => p.user_id === currentUserId)?.is_host ?? false

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', room.id)
      .order('turn_order')
    if (data) setPlayers(data)
  }, [supabase, room.id])

  useEffect(() => {
    fetchPlayers()

    const channel = supabase
      .channel(`waiting-${room.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${room.id}`,
      }, fetchPlayers)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        if (payload.new.status === 'playing') {
          router.refresh()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room.id, supabase, fetchPlayers, router])

  const handleStart = async () => {
    if (players.length < 2) return alert('최소 2명이 필요합니다')
    setLoading(true)
    const res = await fetch('/api/rooms/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error)
    }
    setLoading(false)
  }

  const handleLeave = async () => {
    await supabase.from('room_players').delete()
      .eq('room_id', room.id).eq('user_id', currentUserId)
    router.push('/')
  }

  const handleDeleteRoom = async () => {
    if (!confirm('방을 삭제하시겠습니까?')) return
    await supabase.from('rooms').delete().eq('id', room.id)
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-deep-navy flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-gold mb-2">대기실</h1>
          <div className="inline-flex items-center gap-3 bg-navy-800 rounded-xl px-6 py-3">
            <span className="text-gray-400 text-sm">방 코드</span>
            <span className="text-3xl font-mono font-bold text-gold tracking-widest">{room.code}</span>
            <button
              onClick={() => navigator.clipboard.writeText(room.code)}
              className="text-gray-400 hover:text-gold transition-colors text-xs"
            >
              복사
            </button>
          </div>
        </div>

        <div className="card-dark rounded-2xl p-6 mb-4">
          <h2 className="text-lg text-gold font-semibold mb-4">
            참여자 ({players.length}/6)
          </h2>
          <div className="space-y-2">
            {players.map((player, i) => (
              <div key={player.id} className="flex items-center gap-3 py-2 px-4 rounded-xl bg-navy-800">
                <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center text-sm font-bold text-gold">
                  {i + 1}
                </div>
                <span className="text-white font-medium">{player.nickname}</span>
                {player.is_host && (
                  <span className="ml-auto text-xs text-gold border border-gold/30 px-2 py-0.5 rounded-full">방장</span>
                )}
              </div>
            ))}
          </div>
          {players.length < 2 && (
            <p className="text-gray-500 text-sm mt-3 text-center">게임 시작까지 최소 2명 필요</p>
          )}
        </div>

        <div className="space-y-2">
          {isHost ? (
            <>
              <button
                onClick={handleStart}
                disabled={loading || players.length < 2}
                className="btn-gold w-full py-3 text-lg disabled:opacity-40"
              >
                {loading ? '시작 중...' : '🎮 게임 시작'}
              </button>
              <button onClick={handleDeleteRoom} className="btn-danger w-full py-2 text-sm">
                방 삭제
              </button>
            </>
          ) : (
            <button onClick={handleLeave} className="btn-secondary w-full py-3">
              나가기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
