import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roomId, bestWriterId, worstWriterId } = await req.json()

    if (bestWriterId === user.id || worstWriterId === user.id) {
      return NextResponse.json({ error: '자기 자신에게 투표할 수 없습니다' }, { status: 400 })
    }

    const { error } = await supabase.from('votes').insert({
      room_id: roomId,
      voter_id: user.id,
      best_writer_id: bestWriterId,
      worst_writer_id: worstWriterId,
    })

    if (error) throw error

    // Check if all players have voted
    const { count: playerCount } = await supabase
      .from('room_players')
      .select('*', { count: 'exact' })
      .eq('room_id', roomId)

    const { count: voteCount } = await supabase
      .from('votes')
      .select('*', { count: 'exact' })
      .eq('room_id', roomId)

    if (voteCount === playerCount) {
      // Tally votes and update user stats
      const { data: votes } = await supabase
        .from('votes')
        .select('best_writer_id, worst_writer_id')
        .eq('room_id', roomId)

      const bestCounts: Record<string, number> = {}
      const worstCounts: Record<string, number> = {}

      votes?.forEach(v => {
        bestCounts[v.best_writer_id] = (bestCounts[v.best_writer_id] || 0) + 1
        worstCounts[v.worst_writer_id] = (worstCounts[v.worst_writer_id] || 0) + 1
      })

      // Update user stats
      for (const [userId, count] of Object.entries(bestCounts)) {
        await supabase.rpc('increment_best_count', { user_id: userId, amount: count })
      }
      for (const [userId, count] of Object.entries(worstCounts)) {
        await supabase.rpc('increment_worst_count', { user_id: userId, amount: count })
      }

      await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Vote error:', err)
    return NextResponse.json({ error: '투표 실패' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')
    if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 })

    const { data: votes } = await supabase
      .from('votes')
      .select('best_writer_id, worst_writer_id')
      .eq('room_id', roomId)

    const { data: players } = await supabase
      .from('room_players')
      .select('user_id, nickname')
      .eq('room_id', roomId)

    const bestCounts: Record<string, number> = {}
    const worstCounts: Record<string, number> = {}

    votes?.forEach(v => {
      bestCounts[v.best_writer_id] = (bestCounts[v.best_writer_id] || 0) + 1
      worstCounts[v.worst_writer_id] = (worstCounts[v.worst_writer_id] || 0) + 1
    })

    const results = players?.map(p => ({
      userId: p.user_id,
      nickname: p.nickname,
      bestCount: bestCounts[p.user_id] || 0,
      worstCount: worstCounts[p.user_id] || 0,
    }))

    return NextResponse.json({ results, voteCount: votes?.length ?? 0, playerCount: players?.length ?? 0 })
  } catch (err) {
    console.error('Get votes error:', err)
    return NextResponse.json({ error: '투표 결과 조회 실패' }, { status: 500 })
  }
}
