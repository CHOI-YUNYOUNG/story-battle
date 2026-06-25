'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Timer from '@/components/ui/Timer'
import type { Room, RoomPlayer, StoryTurn } from '@/types'

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

  const totalTurns = players.length * 4
  const currentTurnNumber = turns.length
  const isAiTurn = currentTurnNumber % 2 === 1
  const humanTurnIndex = Math.floor(currentTurnNumber / 2)
  const currentPlayerIndex = humanTurnIndex % players.length
  const currentPlayer = players[currentPlayerIndex]
  const isMyTurn = !isAiTurn && currentPlayer?.user_id === currentUserId
  const lastTurn = turns[turns.length - 1]
  const isLastTurn = currentTurnNumber === totalTurns - 1
  const gameOver = currentTurnNumber >= totalTurns

  const fetchTurns = useCallback(async () => {
    const { data } = await supabase
      .from('story_turns')
      .select('*')
      .eq('room_id', room.id)
      .order('turn_number')
    if (data) setTurns(data)
  }, [supabase, room.id])

  // Trigger AI turn
  const triggerAiTurn = useCallback(async (prevContent: string, turnNum: number) => {
    setAiLoading(true)
    try {
      await fetch('/api/ai-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          turnNumber: turnNum,
          previousContent: prevContent,
          isLastTurn: turnNum === totalTurns - 1,
        }),
      })
    } finally {
      setAiLoading(false)
    }
  }, [room.id, totalTurns])

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
          const newTurns = [...prev, payload.new as StoryTurn]
          return newTurns.sort((a, b) => a.turn_number - b.turn_number)
        })
        setTimerKey(k => k + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room.id, supabase, fetchTurns])

  // Check if AI should take its turn
  useEffect(() => {
    if (gameOver) {
      onGameEnd()
      return
    }

    if (!isAiTurn) return

    // Only the first player triggers AI (to avoid duplicates)
    const firstPlayer = players[0]
    if (firstPlayer?.user_id !== currentUserId) return

    // Check if AI turn already exists
    const aiTurnExists = turns.find(t => t.turn_number === currentTurnNumber)
    if (aiTurnExists) return

    const prevTurn = turns[currentTurnNumber - 1]
    if (!prevTurn) return

    triggerAiTurn(prevTurn.content, currentTurnNumber)
  }, [isAiTurn, currentTurnNumber, turns, currentUserId, players, gameOver, onGameEnd, triggerAiTurn])

  const handleSubmit = async () => {
    if (myText.trim().length < 20) return alert('최소 20자 이상 작성해주세요')
    if (myText.trim().length > 200) return alert('200자 이내로 작성해주세요')
    if (!isMyTurn) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('story_turns').insert({
        room_id: room.id,
        turn_number: currentTurnNumber,
        author_type: 'human',
        author_id: currentUserId,
        author_nickname: currentPlayer?.nickname,
        content: myText.trim(),
        is_visible: false,
      })
      if (error) throw error
      setMyText('')
    } catch (err) {
      console.error(err)
      alert('제출 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTimeout = useCallback(async () => {
    if (!isMyTurn || submitting) return
    // Auto-submit a placeholder on timeout
    const text = myText.trim() || '...(시간 초과)'
    const submitText = text.length < 20 ? text + ' 그리고 이야기는 계속되었다.' : text
    await supabase.from('story_turns').insert({
      room_id: room.id,
      turn_number: currentTurnNumber,
      author_type: 'human',
      author_id: currentUserId,
      author_nickname: currentPlayer?.nickname,
      content: submitText,
      is_visible: false,
    })
    setMyText('')
  }, [isMyTurn, submitting, myText, supabase, room.id, currentTurnNumber, currentUserId, currentPlayer])

  const progressPct = (currentTurnNumber / totalTurns) * 100

  return (
    <div className="min-h-screen bg-deep-navy flex flex-col">
      {/* Header */}
      <div className="border-b border-navy-700 px-4 py-3 flex items-center justify-between">
        <div className="text-gold font-serif text-lg">이야기 대결</div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            {Math.floor(currentTurnNumber / 2) + 1} / {Math.floor(totalTurns / 2)} 턴
          </span>
          {isMyTurn && (
            <Timer key={timerKey} seconds={90} onExpire={handleTimeout} isActive={isMyTurn && !submitting} />
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="h-1 bg-navy-800">
        <div className="h-full bg-gold transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full">

        {/* Previous turn preview */}
        {lastTurn && (
          <div className={`w-full mb-6 p-5 rounded-2xl border ${
            lastTurn.author_type === 'ai'
              ? 'bg-purple-900/20 border-purple-700/40'
              : 'bg-blue-900/20 border-blue-700/40'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                lastTurn.author_type === 'ai'
                  ? 'bg-purple-700/50 text-purple-200'
                  : 'bg-blue-700/50 text-blue-200'
              }`}>
                {lastTurn.author_type === 'ai' ? '🤖 AI 작가' : `👤 ${lastTurn.author_nickname}`}
              </span>
              <span className="text-gray-500 text-xs">이전 내용</span>
            </div>
            <p className="text-gray-200 font-serif leading-relaxed">{lastTurn.content}</p>
          </div>
        )}

        {/* AI Loading */}
        {isAiTurn && aiLoading && (
          <div className="w-full text-center py-12">
            <div className="inline-flex items-center gap-3 text-purple-300">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="font-serif text-lg">AI가 이야기를 이어쓰는 중...</span>
            </div>
          </div>
        )}

        {/* Waiting for other player */}
        {!isAiTurn && !isMyTurn && !gameOver && (
          <div className="w-full text-center py-12">
            <div className="text-gray-400">
              <div className="text-4xl mb-3">✍️</div>
              <p className="font-serif text-lg text-gray-300">
                <span className="text-gold">{currentPlayer?.nickname}</span> 님이 이야기를 쓰고 있습니다...
              </p>
            </div>
          </div>
        )}

        {/* My turn - text input */}
        {isMyTurn && !gameOver && (
          <div className="w-full space-y-4">
            <div className="text-center">
              <span className="text-gold font-serif text-xl">✨ 당신의 차례입니다!</span>
              {turns.length === 0 && (
                <p className="text-gray-400 text-sm mt-1">첫 번째 이야기를 시작해보세요</p>
              )}
            </div>
            <div className="relative">
              <textarea
                value={myText}
                onChange={e => setMyText(e.target.value)}
                maxLength={200}
                rows={5}
                placeholder={turns.length === 0 ? "이야기를 시작해보세요..." : "이야기를 이어써보세요..."}
                className="w-full bg-navy-800 border border-navy-600 rounded-xl p-4 text-white font-serif text-lg resize-none focus:outline-none focus:border-gold/60 placeholder-gray-600"
              />
              <div className={`absolute bottom-3 right-3 text-xs ${
                myText.length < 20 ? 'text-red-400' :
                myText.length > 180 ? 'text-yellow-400' : 'text-gray-500'
              }`}>
                {myText.length}/200
              </div>
            </div>
            {myText.length > 0 && myText.length < 20 && (
              <p className="text-red-400 text-sm">최소 20자 이상 작성해주세요 ({20 - myText.length}자 더)</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || myText.trim().length < 20}
              className="btn-gold w-full py-3 text-lg disabled:opacity-40"
            >
              {submitting ? '제출 중...' : isLastTurn ? '📖 이야기 마무리하기' : '제출하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
