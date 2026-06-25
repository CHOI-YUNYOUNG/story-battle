import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get rooms the user participated in
  const { data: participations } = await supabase
    .from('room_players')
    .select('room_id, rooms(id, code, created_at, status)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen bg-deep-navy">
      <header className="border-b border-navy-700 px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-gold transition-colors">← 돌아가기</Link>
        <span className="text-gold font-serif text-lg">마이페이지</span>
      </header>

      <main className="max-w-2xl mx-auto p-4 pt-8 space-y-6">
        {/* Profile Card */}
        <div className="card-dark rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-navy-700 flex items-center justify-center text-2xl">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
              ) : '🎭'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile?.nickname}</h2>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-navy-800 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-gold">{profile?.best_writer_count ?? 0}</div>
              <div className="text-xs text-gray-400 mt-1">👑 최고 작성자 투표</div>
            </div>
            <div className="bg-navy-800 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{profile?.worst_writer_count ?? 0}</div>
              <div className="text-xs text-gray-400 mt-1">💀 최악 작성자 투표</div>
            </div>
          </div>
        </div>

        {/* Game History */}
        <div className="card-dark rounded-2xl p-6">
          <h3 className="text-gold font-semibold mb-4">게임 히스토리</h3>
          {!participations || participations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">아직 참여한 게임이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {participations.map((p) => {
                const room = Array.isArray(p.rooms) ? p.rooms[0] : p.rooms
                if (!room) return null
                return (
                  <div key={p.room_id} className="flex items-center justify-between py-3 px-4 bg-navy-800 rounded-xl">
                    <div>
                      <span className="font-mono text-gold text-sm">{room.code}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        room.status === 'finished' ? 'bg-green-900/40 text-green-400' :
                        room.status === 'playing' ? 'bg-blue-900/40 text-blue-400' :
                        'bg-navy-600 text-gray-400'
                      }`}>
                        {room.status === 'finished' ? '완료' :
                         room.status === 'playing' ? '진행 중' :
                         room.status === 'voting' ? '투표 중' : '대기 중'}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {new Date(room.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
