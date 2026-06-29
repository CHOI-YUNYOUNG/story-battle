'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { StoryTurn, RoomPlayer } from '@/types'
import ChatPanel from './ChatPanel'

interface ResultsPanelProps {
  roomId: string
  roomCode: string
  turns: StoryTurn[]
  players: RoomPlayer[]
  currentUserId: string
  nickname: string
  isHost: boolean
}

export default function ResultsPanel({ roomId, roomCode, turns, players, currentUserId, nickname, isHost }: ResultsPanelProps) {
  const [gifLoading, setGifLoading] = useState(false)
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const router = useRouter()

  const handleGIF = async () => {
    setGifLoading(true)
    try {
      const { generateStoryGIF } = await import('@/lib/generate-gif')
      const url = await generateStoryGIF(turns)
      setGifUrl(url)

      // 자동 다운로드
      const link = document.createElement('a')
      link.download = `story-battle-${roomCode}.gif`
      link.href = url
      link.click()
    } catch (err) {
      console.error(err)
      alert('GIF 생성 실패')
    } finally {
      setGifLoading(false)
    }
  }

  const handleRestart = async () => {
    if (!isHost) return
    setResetting(true)
    try {
      const res = await fetch('/api/rooms/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, userId: currentUserId }),
      })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      alert('다시 시작 실패')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-deep-navy p-4">
      <div className="max-w-lg mx-auto space-y-5 pb-20">

        {/* 그림 일지 */}
        <div className="bg-navy-900 rounded-2xl p-5">
          <h2 className="text-2xl font-serif text-gold text-center mb-6">🎨 그림 일지</h2>
          <div className="space-y-2">
            {turns.map((turn, idx) => (
              <div key={turn.id}>
                {turn.author_type === 'human' ? (
                  <div className="bg-blue-900/20 border border-blue-700/40 rounded-2xl px-5 py-4 flex items-center gap-3">
                    <span className="text-blue-300 text-xs bg-blue-900/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                      👤 {turn.author_nickname}
                    </span>
                    <span className="text-white font-serif text-xl font-semibold">
                      &ldquo;{turn.content}&rdquo;
                    </span>
                  </div>
                ) : (
                  <div className="bg-purple-900/20 border border-purple-700/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-300 text-xs bg-purple-900/40 px-2 py-0.5 rounded-full">
                        🤖 AI 화가
                      </span>
                      <span className="text-gray-500 text-xs">&ldquo;{turn.content}&rdquo; 도전</span>
                    </div>
                    {turn.image_url && (
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white">
                        <Image
                          src={turn.image_url}
                          alt={`AI가 그린 ${turn.content}`}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    )}
                  </div>
                )}
                {idx < turns.length - 1 && (
                  <div className="text-center text-gray-600 py-0.5">↓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* GIF 미리보기 */}
        {gifUrl && (
          <div className="bg-navy-900 rounded-2xl p-4 text-center">
            <p className="text-gold text-sm mb-3">🎬 생성된 GIF</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gifUrl} alt="story GIF" className="rounded-xl mx-auto max-w-full" />
          </div>
        )}

        {/* 버튼들 */}
        <button
          onClick={handleGIF}
          disabled={gifLoading}
          className="btn-gold w-full py-3 disabled:opacity-50"
        >
          {gifLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-navy-900/40 border-t-navy-900 rounded-full animate-spin" />
              GIF 생성 중... (30초 정도 걸려요)
            </span>
          ) : gifUrl ? '🎬 GIF 다시 저장' : '🎬 GIF로 저장하기'}
        </button>

        {isHost && (
          <button
            onClick={handleRestart}
            disabled={resetting}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {resetting ? '초기화 중...' : '🔄 같은 방에서 다시 시작'}
          </button>
        )}

        {/* 채팅 */}
        <ChatPanel roomId={roomId} currentUserId={currentUserId} nickname={nickname} />
      </div>
    </div>
  )
}
