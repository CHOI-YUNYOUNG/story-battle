'use client'
import { useRef, useState } from 'react'
import type { StoryTurn, VoteResult, RoomPlayer } from '@/types'
import VotingPanel from './VotingPanel'
import ChatPanel from './ChatPanel'

interface ResultsPanelProps {
  roomId: string
  turns: StoryTurn[]
  players: RoomPlayer[]
  currentUserId: string
  nickname: string
}

export default function ResultsPanel({ roomId, turns, players, currentUserId, nickname }: ResultsPanelProps) {
  const storyRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      if (!storyRef.current) return
      const canvas = await html2canvas(storyRef.current, {
        backgroundColor: '#0d1b2a',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `story-battle-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (err) {
      console.error(err)
      alert('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-deep-navy p-4">
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        {/* Story for saving */}
        <div ref={storyRef} className="rounded-2xl overflow-hidden">
          <div className="bg-navy-900 p-6">
            <h2 className="text-2xl font-serif text-gold text-center mb-6">✨ 완성된 이야기</h2>
            <div className="space-y-4">
              {turns.map((turn, idx) => (
                <div
                  key={turn.id}
                  className={`rounded-xl p-4 border ${
                    turn.author_type === 'ai'
                      ? 'bg-purple-900/20 border-purple-700/40'
                      : 'bg-blue-900/20 border-blue-700/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-500 text-xs">#{idx + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      turn.author_type === 'ai'
                        ? 'bg-purple-700/60 text-purple-100'
                        : 'bg-blue-700/60 text-blue-100'
                    }`}>
                      {turn.author_type === 'ai' ? '🤖 AI 작가' : `👤 ${turn.author_nickname}`}
                    </span>
                  </div>
                  <p className="text-gray-100 font-serif leading-relaxed">{turn.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-gold w-full py-3 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '💾 이미지로 저장하기'}
        </button>

        {/* Voting */}
        <div className="card-dark rounded-2xl p-6">
          <VotingPanel roomId={roomId} currentUserId={currentUserId} players={players} />
        </div>

        {/* Chat */}
        <ChatPanel roomId={roomId} currentUserId={currentUserId} nickname={nickname} />
      </div>
    </div>
  )
}
