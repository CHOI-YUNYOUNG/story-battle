'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Timer from '@/components/ui/Timer'
import type { Room, RoomPlayer, StoryTurn } from '@/types'
import Image from 'next/image'

interface GameRoomProps {
  room: Room
  currentUserId: string
  players: RoomPlayer[]
  onGameEnd: () => void
}

export default function GameRoom({ room, currentUserId, players, onGameEnd }: GameRoomProps) {
  const [turns, setTurns] = useState<StoryTurn[]>([])
  const [myText, setMyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const supabase = createClient()

  // 총 턴: 플레이어수 × 4 (사람 2회 + AI 2회씩)
  const totalTurns = players.length * 4
  const currentTurnNumber = turns.length
  const isAiTurn = currentTurnNumber % 2 === 1   // 홀수 = AI 그림
  const humanTurnIndex = Math.floor(currentTurnNumber / 2)
  const currentPlayerIndex = humanTurnIndex % players.length
  const currentPlayer = players[currentPlayerIndex]
  const isMyTurn = !isAiTurn && currentPlayer?.user_id === currentUserId
  const gameOver = currentTurnNumber >= totalTurns

  // 내가 볼 수 있는 이전 턴 (바로 직전 AI 그림)
  const prevAiTurn = turns.filter(t => t.author_type === 'ai').at(-1) ?? null
  const isFirstTurn = currentTurnNumber === 0

  const fetchTurns = useCallback(async () => {
    const { data } = await supabase
      .from('story_turns')
      .select('*')
      .eq('room_id', room.id)
      .order('turn_number')
    if (data) setTurns(data)
  }, [supabase, room.id])

  const triggerAiDraw = useCallback(async (word: string, turnNum: number) => {
    setAiLoading(true)
    try {
      await fetch('/api/ai-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, turnNumber: turnNum, word }),
      })
    } finally {
      setAiLoading(false)
    }
  }, [room.id])

  useEffect(() => {
    fetchTurns()
    const channel = supabase
      .channel(`game-${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'story_turns',
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        setTurns(prev => {
          const exists = prev.find(t => t.id === payload.new.id)
          if (exists) return prev
          return [...prev, payload.new as StoryTurn].sort((a, b) => a.turn_number - b.turn_number)
        })
        setTimerKey(k => k + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room.id, supabase, fetchTurns])

  // AI 턴 자동 트리거 (첫 번째 플레이어만 실행해서 중복 방지)
  useEffect(() => {
    if (gameOver) { onGameEnd(); return }
    if (!isAiTurn) return
    if (players[0]?.user_id !== currentUserId) return

    const alreadyExists = turns.find(t => t.turn_number === currentTurnNumber)
    if (alreadyExists) return

    const prevTurn = turns[currentTurnNumber - 1]
    if (!prevTurn) return

    triggerAiDraw(prevTurn.content, currentTurnNumber)
  }, [isAiTurn, currentTurnNumber, turns, currentUserId, players, gameOver, onGameEnd, triggerAiDraw])

  const handleSubmit = async () => {
    if (!myText.trim()) return
    if (myText.trim().length < 1) return
    setSubmitting(true)
    try {
      await supabase.from('story_turns').insert({
        room_id: room.id,
        turn_number: currentTurnNumber,
        author_type: 'human',
        author_id: currentUserId,
        author_nickname: currentPlayer?.nickname,
        content: myText.trim(),
        image_url: null,
        is_visible: false,
      })
      setMyText('')
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleTimeout = useCallback(async () => {
    if (!isMyTurn || submitting) return
    const fallback = myText.trim() || '???'
    await supabase.from('story_turns').insert({
      room_id: room.id,
      turn_number: currentTurnNumber,
      author_type: 'human',
      author_id: currentUserId,
      author_nickname: currentPlayer?.nickname,
      content: fallback,
      image_url: null,
      is_visible: false,
    })
    setMyText('')
  }, [isMyTurn, submitting, myText, supabase, room.id, currentTurnNumber, currentUserId, currentPlayer])

  const progressPct = (currentTurnNumber / totalTurns) * 100
  const roundNum = Math.floor(humanTurnIndex / players.length) + 1
  const totalRounds = 2

  return (
    <div className="min-h-screen bg-deep-navy flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-navy-700 px-4 py-3 flex items-center justify-between">
        <div className="text-gold font-serif text-lg">🎨 그림 대결</div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{roundNum}/{totalRounds} 라운드</span>
          {isMyTurn && (
            <Timer key={timerKey} seconds={90} onExpire={handleTimeout} isActive={isMyTurn && !submitting} />
          )}
        </div>
      </div>

      {/* 진행 바 */}
      <div className="h-1 bg-navy-800">
        <div className="h-full bg-gold transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full gap-6">

        {/* AI 그림 로딩 */}
        {isAiTurn && aiLoading && (
          <div className="w-full text-center py-16">
            <div className="inline-flex flex-col items-center gap-4 text-purple-300">
              <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
              <span className="font-serif text-lg">AI가 그림을 그리는 중...</span>
              <span className="text-gray-500 text-sm">얼마나 못 그릴지 기대해봐요 🖌️</span>
            </div>
          </div>
        )}

        {/* 다른 플레이어 차례 대기 */}
        {!isAiTurn && !isMyTurn && !gameOver && (
          <div className="w-full text-center py-16">
            <div className="text-4xl mb-4">✏️</div>
            <p className="font-serif text-lg text-gray-300">
              <span className="text-gold">{currentPlayer?.nickname}</span> 님이 단어를 쓰고 있습니다...
            </p>
          </div>
        )}

        {/* 내 차례 */}
        {isMyTurn && !gameOver && (
          <div className="w-full space-y-5">
            {/* 이전 AI 그림 표시 (첫 번째 턴 제외) */}
            {!isFirstTurn && prevAiTurn?.image_url && (
              <div className="w-full">
                <p className="text-gray-400 text-sm mb-2 text-center">
                  🖼️ AI가 그린 그림 — 무엇을 그린 걸까요?
                </p>
                <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-purple-700/40 bg-white">
                  <Image
                    src={prevAiTurn.image_url}
                    alt="AI 그림"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>
            )}

            {/* 텍스트 입력 */}
            <div className="text-center">
              <span className="text-gold font-serif text-xl">
                {isFirstTurn ? '✨ 첫 번째 단어를 입력해주세요!' : '🤔 이 그림은 무엇일까요?'}
              </span>
              {isFirstTurn && (
                <p className="text-gray-500 text-sm mt-1">AI가 이 단어를 그림으로 표현합니다</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={myText}
                onChange={e => setMyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !submitting && myText.trim() && handleSubmit()}
                placeholder={isFirstTurn ? '예: 고양이, 우주선, 떡볶이...' : '그림이 뭔지 입력해보세요'}
                maxLength={50}
                className="flex-1 bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-gold/60 placeholder-gray-600"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !myText.trim()}
                className="btn-gold px-6 py-3 text-lg disabled:opacity-40 whitespace-nowrap"
              >
                {submitting ? '...' : '제출'}
              </button>
            </div>
            <p className="text-gray-600 text-xs text-center">Enter 또는 제출 버튼</p>
          </div>
        )}
      </div>
    </div>
  )
}
