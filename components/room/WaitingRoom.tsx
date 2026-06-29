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
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isHost = players.find(p => p.user_id === currentUserId)?.is_host ?? false
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${room.code}` : ''

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('room_players').select('*')
      .eq('room_id', room.id).order('turn_order')
    if (data) setPlayers(data)
  }, [supabase, room.id])

  useEffect(() => {
    fetchPlayers()
    const channel = supabase
      .channel(`waiting-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` }, fetchPlayers)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => { if (payload.new.status === 'playing') router.refresh() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room.id, supabase, fetchPlayers, router])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStart = async () => {
    if (players.length < 2) return alert('최소 2명이 필요합니다')
    setLoading(true)
    const res = await fetch('/api/rooms/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id, userId: currentUserId }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error)
    }
    setLoading(false)
  }

  const handleLeave = async () => {
    await fetch('/api/rooms/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id, userId: currentUserId }),
    })
    router.push('/')
  }

  const handleDelete = async () => {
    if (!confirm('방을 삭제하시겠습니까?')) return
    const supabaseAdmin = createClient()
    await supabaseAdmin.from('rooms').delete().eq('id', room.id)
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-deep-navy flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">

        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-serif text-gold mb-4">대기실</h1>

          {/* 초대 링크 */}
          <div className="card-dark rounded-2xl px-5 py-4 space-y-3">
            <p className="text-gray-400 text-xs">친구에게 공유하세요</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-navy-800 rounded-xl px-3 py-2 text-left overflow-hidden">
                <p className="text-gray-300 text-sm truncate">{inviteUrl}</p>
              </div>
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  copied ? 'bg-green-700/40 text-green-300' : 'bg-gold/20 text-gold hover:bg-gold/30'
                }`}
              >
                {copied ? '✓ 복사됨' : '링크 복사'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-navy-700" />
              <span className="text-gray-600 text-xs">또는 코드 공유</span>
              <div className="flex-1 h-px bg-navy-700" />
            </div>
            <div className="text-center">
              <span className="text-3xl font-mono font-bold text-gold tracking-widest">{room.code}</span>
            </div>
          </div>
        </div>

        {/* 참여자 목록 */}
        <div className="card-dark rounded-2xl p-5">
          <h2 className="text-sm text-gray-400 mb-3">참여자 ({players.length}/6)</h2>
          <div className="space-y-2">
            {players.map((player, i) => (
              <div key={player.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-navy-800">
                <div className="w-7 h-7 rounded-full bg-navy-600 flex items-center justify-center text-xs font-bold text-gold">
                  {i + 1}
                </div>
                <span className="text-white">{player.nickname}</span>
                {player.is_host && (
                  <span className="ml-auto text-xs text-gold border border-gold/30 px-2 py-0.5 rounded-full">방장</span>
                )}
                {player.user_id === currentUserId && !player.is_host && (
                  <span className="ml-auto text-xs text-gray-500">나</span>
                )}
              </div>
            ))}
          </div>
          {players.length < 2 && (
            <p className="text-gray-600 text-xs text-center mt-3">게임 시작까지 최소 2명 필요</p>
          )}
        </div>

        {/* 버튼 */}
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
              <button onClick={handleDelete} className="btn-danger w-full py-2 text-sm">
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
