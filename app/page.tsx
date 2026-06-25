import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import CreateRoom from '@/components/lobby/CreateRoom'
import JoinRoom from '@/components/lobby/JoinRoom'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <div className="min-h-screen bg-deep-navy flex flex-col">
      {/* Header */}
      <header className="border-b border-navy-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📖</span>
          <span className="text-gold font-serif text-xl font-bold">Story Battle</span>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-gray-400 hover:text-gold text-sm transition-colors">
              {profile?.nickname || user.email?.split('@')[0]}
            </Link>
            <LogoutButton />
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {!user ? (
          <div className="w-full max-w-md">
            {/* Hero */}
            <div className="text-center mb-10">
              <div className="text-7xl mb-4">🎭</div>
              <h1 className="text-4xl font-serif text-gold mb-3">Story Battle</h1>
              <p className="text-gray-400 text-lg">AI와 함께하는 즉흥 스토리 대결</p>
              <p className="text-gray-500 text-sm mt-2">갈틱폰처럼, 이전 내용만 보고 이야기를 이어쓰세요</p>
            </div>
            <LoginForm />
          </div>
        ) : (
          <div className="w-full max-w-md space-y-4">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🎭</div>
              <h1 className="text-3xl font-serif text-gold">Story Battle</h1>
              <p className="text-gray-400 text-sm mt-1">
                안녕하세요, <span className="text-gold">{profile?.nickname}</span>님!
              </p>
            </div>

            {/* Create Room */}
            <div className="card-dark rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">✨ 새 방 만들기</h2>
              <CreateRoom defaultNickname={profile?.nickname || user.email?.split('@')[0] || ''} />
            </div>

            {/* Join Room */}
            <div className="card-dark rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">🚪 방 참여하기</h2>
              <JoinRoom defaultNickname={profile?.nickname || user.email?.split('@')[0] || ''} />
            </div>

            {/* How to play */}
            <div className="card-dark rounded-2xl p-6">
              <h3 className="text-gold font-semibold mb-3">🎮 게임 방법</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>1. 방을 만들거나 코드로 참여</p>
                <p>2. 이전 사람이 쓴 내용만 보고 이어쓰기</p>
                <p>3. 사람 → AI → 사람 → AI 순으로 진행</p>
                <p>4. 마지막에 전체 스토리 공개 + 투표!</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function LogoutButton() {
  return (
    <form action="/auth/signout" method="POST">
      <button type="submit" className="text-gray-500 hover:text-red-400 text-sm transition-colors">
        로그아웃
      </button>
    </form>
  )
}
