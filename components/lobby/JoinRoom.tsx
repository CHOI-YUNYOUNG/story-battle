'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface JoinRoomProps {
  defaultNickname: string
}

export default function JoinRoom({ defaultNickname }: JoinRoomProps) {
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState(defaultNickname)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleJoin = async () => {
    if (!code.trim() || code.length !== 6) return setError('6자리 코드를 입력해주세요')
    if (!nickname.trim()) return setError('닉네임을 입력해주세요')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase(), nickname: nickname.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/room/${data.room.code}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '방 참여 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        value={nickname}
        onChange={e => setNickname(e.target.value)}
        placeholder="닉네임"
        maxLength={12}
        className="input-dark w-full"
      />
      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="방 코드 (6자리)"
        maxLength={6}
        className="input-dark w-full tracking-widest text-center text-lg font-mono"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={handleJoin}
        disabled={loading}
        className="btn-primary w-full py-3 text-lg disabled:opacity-50"
      >
        {loading ? '참여 중...' : '🚪 방 참여하기'}
      </button>
    </div>
  )
}
