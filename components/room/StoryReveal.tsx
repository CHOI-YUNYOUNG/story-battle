'use client'
import { useEffect, useState, useRef } from 'react'
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
          setTimeout(onRevealComplete, 1500)
          return
        }
        revealedRef.current = [...revealedRef.current, i]
        setRevealed([...revealedRef.current])
        i++
      }, 800)
    }, 1000)
    return () => clearTimeout(timer)
  }, [turns.length, onRevealComplete])

  return (
    <div className="min-h-screen bg-deep-navy flex flex-col items-center justify-start p-4 pt-12">
      <div className="w-full max-w-2xl">
        {!isRevealing && (
          <div className="text-center py-20 animate-pulse">
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-2xl font-serif text-gold">이야기를 공개합니다...</h2>
          </div>
        )}

        {isRevealing && (
          <>
            <h2 className="text-2xl font-serif text-gold text-center mb-8">
              {done ? '✨ 완성된 이야기' : '📖 공개 중...'}
            </h2>
            <div className="space-y-4">
              {turns.map((turn, idx) => (
                <div
                  key={turn.id}
                  className={`transform transition-all duration-700 ${
                    revealed.includes(idx)
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  }`}
                >
                  <div className={`relative rounded-2xl p-5 border ${
                    turn.author_type === 'ai'
                      ? 'bg-purple-900/20 border-purple-700/40'
                      : 'bg-blue-900/20 border-blue-700/40'
                  }`}>
                    {/* Card flip effect overlay */}
                    {revealed.includes(idx) && (
                      <div className={`absolute inset-0 rounded-2xl animate-flip-in pointer-events-none ${
                        turn.author_type === 'ai' ? 'bg-purple-500/10' : 'bg-blue-500/10'
                      }`} />
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{idx + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        turn.author_type === 'ai'
                          ? 'bg-purple-700/60 text-purple-100'
                          : 'bg-blue-700/60 text-blue-100'
                      }`}>
                        {turn.author_type === 'ai' ? '🤖 AI 작가' : `👤 ${turn.author_nickname}`}
                      </span>
                    </div>
                    <p className="text-gray-100 font-serif leading-relaxed text-lg">{turn.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
