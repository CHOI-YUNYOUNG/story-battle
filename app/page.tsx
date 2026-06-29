'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLocalUser, saveNickname } from '@/lib/local-user'

export default function HomePage() {
  const [nickname, setNickname] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const user = getLocalUser()
    setUserId(user.userId)
    setNickname(user.nickname)
    setMounted(true)
  }, [])

  const validate = () => {
    if (!nickname.trim()) { setError('닉네임을 입력해주세요'); return false }
    saveNickname(nickname.trim())
    setError('')
    return true
  }

  const handleCreate = async () => {
    if (!validate()) return
    setLoading('create')
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nickname: nickname.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/room/${data.room.code}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '방 생성 실패')
      setLoading(null)
    }
  }

  const handleJoin = async () => {
    if (!validate()) return
    if (joinCode.trim().length !== 6) { setError('6자리 코드를 입력해주세요'); return }
    setLoading('join')
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nickname: nickname.trim(), code: joinCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/room/${data.room.code}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '방 참여 실패')
      setLoading(null)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-deep-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">

        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎨</div>
          <h1 className="text-4xl font-serif text-gold">Story Battle</h1>
          <p className="text-gray-500 text-sm mt-2">AI가 그린 그림으로 하는 갈틱폰</p>
        </div>

        {/* 닉네임 */}
        <div className="card-dark rounded-2xl p-5 space-y-3">
          <label className="text-gray-400 text-sm">닉네임</label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="닉네임 입력"
            maxLength={12}
            className="input-dark w-full text-lg"
            autoFocus
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* 방 만들기 */}
        <button
          onClick={handleCreate}
          disabled={!!loading}
          className="btn-gold w-full py-4 text-lg disabled:opacity-50"
        >
          {loading === 'create' ? '생성 중...' : '✨ 방 만들기'}
        </button>

        {/* 방 참여 */}
        <div className="card-dark rounded-2xl p-5 space-y-3">
          <label className="text-gray-400 text-sm">초대 코드로 참여</label>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="코드 6자리"
              maxLength={6}
              className="input-dark flex-1 text-center text-xl tracking-widest font-mono"
            />
            <button
              onClick={handleJoin}
              disabled={!!loading}
              className="btn-primary px-5 py-3 disabled:opacity-50"
            >
              {loading === 'join' ? '...' : '입장'}
            </button>
          </div>
        </div>

        {/* 게임 방법 */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-gray-600 text-xs">단어 입력 → AI가 그림 그림 → 다음 사람이 추측 → 반복</p>
        </div>
      </div>
    </div>
  )
}
