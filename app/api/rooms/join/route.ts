import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { code, userId, nickname } = await req.json()
    if (!userId || !nickname || !code) return NextResponse.json({ error: '필수값 누락' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 })
    if (room.status !== 'waiting') return NextResponse.json({ error: '이미 게임이 시작된 방입니다' }, { status: 400 })

    const { count } = await supabase
      .from('room_players')
      .select('*', { count: 'exact' })
      .eq('room_id', room.id)

    if ((count ?? 0) >= 6) return NextResponse.json({ error: '방이 가득 찼습니다 (최대 6명)' }, { status: 400 })

    // 이미 입장해 있으면 바로 반환
    const { data: existing } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single()

    if (existing) return NextResponse.json({ room })

    const { error: playerError } = await supabase.from('room_players').insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      turn_order: count ?? 0,
      is_host: false,
    })

    if (playerError) throw playerError

    return NextResponse.json({ room })
  } catch (err) {
    console.error('Join room error:', err)
    return NextResponse.json({ error: '방 참여 실패' }, { status: 500 })
  }
}
