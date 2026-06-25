'use client'
import { useState, useEffect } from 'react'
import type { RoomPlayer, VoteResult } from '@/types'

interface VotingPanelProps {
  roomId: string
  currentUserId: string
  players: RoomPlayer[]
}

export default function VotingPanel({ roomId, currentUserId, players }: VotingPanelProps) {
  const [bestId, setBestId] = useState('')
  const [worstId, setWorstId] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<VoteResult[] | null>(null)
  const [voteStatus, setVoteStatus] = useState({ voteCount: 0, playerCount: players.length })
  const [error, setError] = useState('')
  const otherPlayers = players.filter(p => p.user_id !== currentUserId)

  const pollResults = async () => {
    const res = await fetch(`/api/votes?roomId=${roomId}`)
    const data = await res.json()
    setVoteStatus({ voteCount: data.voteCount, playerCount: data.playerCount })
    if (data.voteCount === data.playerCount && data.playerCount > 0) {
      setResults(data.results)
    }
  }

  useEffect(() => {
    if (!submitted) return
    const interval = setInterval(pollResults, 2000)
    return () => clearInterval(interval)
  })

  const handleSubmit = async () => {
    if (!bestId || !worstId) return setError('최고와 최악 작성자를 모두 선택해주세요')
    if (bestId === worstId) return setError('같은 사람을 선택할 수 없습니다')
    setError('')

    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, bestWriterId: bestId, worstWriterId: worstId }),
    })
    const data = await res.json()
    if (!res.ok) return setError(data.error)
    setSubmitted(true)
    await pollResults()
  }

  if (results) {
    const bestWriter = results.reduce((a, b) => a.bestCount >= b.bestCount ? a : b)
    const worstWriter = results.reduce((a, b) => a.worstCount >= b.worstCount ? a : b)

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-serif text-gold text-center">🏆 투표 결과</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 text-center">
            <div className="text-3xl mb-2">👑</div>
            <div className="text-xs text-gray-400 mb-1">최고의 작성자</div>
            <div className="text-lg font-bold text-gold">{bestWriter.nickname}</div>
            <div className="text-sm text-gray-300">{bestWriter.bestCount}표</div>
          </div>
          <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-4 text-center">
            <div className="text-3xl mb-2">💀</div>
            <div className="text-xs text-gray-400 mb-1">최악의 작성자</div>
            <div className="text-lg font-bold text-red-400">{worstWriter.nickname}</div>
            <div className="text-sm text-gray-300">{worstWriter.worstCount}표</div>
          </div>
        </div>
        <div className="space-y-2">
          {results.sort((a, b) => b.bestCount - a.bestCount).map(r => (
            <div key={r.userId} className="flex items-center justify-between py-2 px-4 bg-navy-800 rounded-xl">
              <span className="text-white">{r.nickname}</span>
              <div className="flex gap-4 text-sm">
                <span className="text-gold">👑 {r.bestCount}</span>
                <span className="text-red-400">💀 {r.worstCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-4xl">✅</div>
        <p className="text-gray-300">투표 완료!</p>
        <p className="text-gray-500 text-sm">
          {voteStatus.voteCount}/{voteStatus.playerCount}명 투표 중...
        </p>
        <div className="flex justify-center gap-1 mt-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-gold animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-serif text-gold text-center">투표하기</h3>

      <div>
        <p className="text-gray-400 text-sm mb-3">👑 최고의 작성자</p>
        <div className="space-y-2">
          {otherPlayers.map(p => (
            <button
              key={p.user_id}
              onClick={() => setBestId(p.user_id)}
              className={`w-full py-3 px-4 rounded-xl text-left transition-all ${
                bestId === p.user_id
                  ? 'bg-gold/20 border-2 border-gold text-gold'
                  : 'bg-navy-800 border-2 border-transparent text-gray-300 hover:border-gold/40'
              }`}
            >
              {p.nickname}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-gray-400 text-sm mb-3">💀 최악의 작성자</p>
        <div className="space-y-2">
          {otherPlayers.map(p => (
            <button
              key={p.user_id}
              onClick={() => setWorstId(p.user_id)}
              className={`w-full py-3 px-4 rounded-xl text-left transition-all ${
                worstId === p.user_id
                  ? 'bg-red-900/30 border-2 border-red-500 text-red-400'
                  : 'bg-navy-800 border-2 border-transparent text-gray-300 hover:border-red-500/40'
              }`}
            >
              {p.nickname}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!bestId || !worstId}
        className="btn-gold w-full py-3 disabled:opacity-40"
      >
        투표 제출
      </button>
    </div>
  )
}
