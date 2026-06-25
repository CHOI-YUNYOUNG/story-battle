import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code, nickname } = await req.json()

    // Find room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 })
    if (room.status !== 'waiting') return NextResponse.json({ error: '이미 게임이 시작된 방입니다' }, { status: 400 })

    // Check player count
    const { count } = await supabase
      .from('room_players')
      .select('*', { count: 'exact' })
      .eq('room_id', room.id)

    if ((count ?? 0) >= 6) return NextResponse.json({ error: '방이 가득 찼습니다' }, { status: 400 })

    // Check if already in room
    const { data: existing } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single()

    if (existing) return NextResponse.json({ room })

    // Get current player count for turn order
    const { count: playerCount } = await supabase
      .from('room_players')
      .select('*', { count: 'exact' })
      .eq('room_id', room.id)

    if (nickname) {
      await supabase.from('users').update({ nickname }).eq('id', user.id)
    }

    const { error: playerError } = await supabase.from('room_players').insert({
      room_id: room.id,
      user_id: user.id,
      nickname: nickname || user.email?.split('@')[0] || 'Player',
      turn_order: playerCount ?? 0,
      is_host: false,
    })

    if (playerError) throw playerError

    return NextResponse.json({ room })
  } catch (err) {
    console.error('Join room error:', err)
    return NextResponse.json({ error: '방 참여 실패' }, { status: 500 })
  }
}
