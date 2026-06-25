'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CreateRoomProps {
  defaultNickname: string
}

export default function CreateRoom({ defaultNickname }: CreateRoomProps) {
  const [nickname, setNickname] = useState(defaultNickname)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleCreate = async () => {
    if (!nickname.trim()) return setError('닉네임을 입력해주세요')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/room/${data.room.code}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '방 생성 실패')
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
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="btn-gold w-full py-3 text-lg disabled:opacity-50"
      >
        {loading ? '생성 중...' : '✨ 방 만들기'}
      </button>
    </div>
  )
}
