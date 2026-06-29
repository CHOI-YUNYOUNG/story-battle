'use client'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import type { StoryTurn } from '@/types'

interface StoryRevealProps {
  turns: StoryTurn[]
  onRevealComplete: () => void
}

export default function StoryReveal({ turns, onRevealComplete }: StoryRevealProps) {
  const [revealed, setRevealed] = useState<number[]>([])
  const [isRevealing, setIsRevealing] = useState(false)
  const [done, setDone] = useState(false)
  const revealedRef = useRef<number[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRevealing(true)
      let i = 0
      const interval = setInterval(() => {
        if (i >= turns.length) {
          clearInterval(interval)
          setDone(true)
          setTimeout(onRevealComplete, 2000)
          return
        }
        revealedRef.current = [...revealedRef.current, i]
        setRevealed([...revealedRef.current])
        i++
      }, 1000)
    }, 1200)
    return () => clearTimeout(timer)
  }, [turns.length, onRevealComplete])

  return (
    <div className="min-h-screen bg-deep-navy flex flex-col items-center p-4 pt-12">
      <div className="w-full max-w-lg">
        {!isRevealing && (
          <div className="text-center py-20 animate-pulse">
            <div className="text-6xl mb-4">🎭</div>
            <h2 className="text-2xl font-serif text-gold">그림 일지를 공개합니다...</h2>
          </div>
        )}

        {isRevealing && (
          <>
            <h2 className="text-2xl font-serif text-gold text-center mb-8">
              {done ? '✨ 완성된 그림 일지' : '📖 공개 중...'}
            </h2>
            <div className="space-y-3">
              {turns.map((turn, idx) => (
                <div
                  key={turn.id}
                  className={`transform transition-all duration-600 ${
                    revealed.includes(idx) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}
                >
                  {turn.author_type === 'human' ? (
                    // 사람 턴 - 단어 카드
                    <div className="bg-blue-900/20 border border-blue-700/40 rounded-2xl px-5 py-4 flex items-center gap-3">
                      <span className="text-blue-300 text-xs bg-blue-900/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                        👤 {turn.author_nickname}
                      </span>
                      <span className="text-white font-serif text-xl font-semibold">
                        &ldquo;{turn.content}&rdquo;
                      </span>
                    </div>
                  ) : (
                    // AI 턴 - 그림 카드
                    <div className="bg-purple-900/20 border border-purple-700/40 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-purple-300 text-xs bg-purple-900/40 px-2 py-0.5 rounded-full">
                          🤖 AI 화가
                        </span>
                        <span className="text-gray-500 text-xs">&ldquo;{turn.content}&rdquo; 그리기 도전</span>
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
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
