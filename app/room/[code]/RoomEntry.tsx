'use client'
import { useState, useEffect } from 'react'
import { getLocalUser, saveNickname } from '@/lib/local-user'
import RoomClient from './RoomClient'
import type { Room } from '@/types'

interface RoomEntryProps {
  code: string
}

export default function RoomEntry({ code }: RoomEntryProps) {
  const [userId, setUserId] = useState('')
  const [nickname, setNickname] = useState('')
  const [nickInput, setNickInput] = useState('')
  const [needNickname, setNeedNickname] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const user = getLocalUser()
    setUserId(user.userId)
    setMounted(true)
    if (!user.nickname) {
      setNeedNickname(true)
    } else {
      setNickname(user.nickname)
      join(user.userId, user.nickname)
    }
  }, [])

  const join = async (uid: string, nick: string) => {
    setJoining(true)
    setError('')
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, nickname: nick, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRoom(data.room)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '입장 실패')
    } finally {
      setJoining(false)
    }
  }

  const handleNicknameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickInput.trim()) return
    const nick = nickInput.trim()
    saveNickname(nick)
    setNickname(nick)
    setNeedNickname(false)
    join(userId, nick)
  }

  if (!mounted) return null

  // 닉네임 입력 오버레이
  if (needNickname) {
    return (
      <div className="min-h-screen bg-deep-navy flex items-center justify-center p-4">
        <div className="w-full max-w-sm card-dark rounded-2xl p-8 space-y-5">
          <div className="text-center">
            <div className="text-4xl mb-3">👋</div>
            <h2 className="text-xl font-serif text-gold">방에 입장하려면</h2>
            <p className="text-gray-400 text-sm mt-1">닉네임을 입력해주세요</p>
          </div>
          <form onSubmit={handleNicknameSubmit} className="space-y-3">
            <input
              value={nickInput}
              onChange={e => setNickInput(e.target.value)}
              placeholder="닉네임"
              maxLength={12}
              className="input-dark w-full text-lg text-center"
              autoFocus
            />
            <button type="submit" className="btn-gold w-full py-3">
              입장하기
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 입장 중
  if (joining || !room) {
    return (
      <div className="min-h-screen bg-deep-navy flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="flex gap-1 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-gold animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-gray-400">{error || '입장 중...'}</p>
          {error && (
            <button onClick={() => window.location.href = '/'} className="btn-secondary px-6 py-2 mt-2">
              홈으로
            </button>
          )}
        </div>
      </div>
    )
  }

  return <RoomClient initialRoom={room} currentUserId={userId} nickname={nickname} />
}
