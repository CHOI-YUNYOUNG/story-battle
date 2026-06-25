'use client'
import { useEffect, useState, useCallback } from 'react'

interface TimerProps {
  seconds: number
  onExpire: () => void
  isActive: boolean
}

export default function Timer({ seconds, onExpire, isActive }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds)

  const handleExpire = useCallback(() => {
    onExpire()
  }, [onExpire])

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (!isActive) return
    if (remaining <= 0) {
      handleExpire()
      return
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, isActive, handleExpire])

  const pct = (remaining / seconds) * 100
  const isUrgent = remaining <= 10

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#1e2a4a" strokeWidth="4" />
          <circle
            cx="28" cy="28" r="24"
            fill="none"
            stroke={isUrgent ? '#ef4444' : '#d4af37'}
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${isUrgent ? 'text-red-400 animate-pulse' : 'text-gold'}`}>
          {remaining}
        </span>
      </div>
    </div>
  )
}
