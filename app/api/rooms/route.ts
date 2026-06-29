import { createAdminClient } from '@/lib/supabase-admin'
import { generateRoomCode } from '@/lib/game-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, nickname } = await req.json()
    if (!userId || !nickname) return NextResponse.json({ error: 'userId, nickname 필요' }, { status: 400 })

    const supabase = createAdminClient()

    let code = generateRoomCode()
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase.from('rooms').select('id').eq('code', code).single()
      if (!data) break
      code = generateRoomCode()
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({ code, host_id: userId, status: 'waiting' })
      .select()
      .single()

    if (roomError) throw roomError

    const { error: playerError } = await supabase.from('room_players').insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      turn_order: 0,
      is_host: true,
    })

    if (playerError) throw playerError

    return NextResponse.json({ room })
  } catch (err) {
    console.error('Create room error:', err)
    return NextResponse.json({ error: '방 생성 실패' }, { status: 500 })
  }
}
