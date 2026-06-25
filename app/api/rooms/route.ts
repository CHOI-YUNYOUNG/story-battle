import { createClient } from '@/lib/supabase-server'
import { generateRoomCode } from '@/lib/game-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { nickname } = await req.json()

    // Generate unique room code
    let code = generateRoomCode()
    let attempts = 0
    while (attempts < 10) {
      const { data } = await supabase.from('rooms').select('id').eq('code', code).single()
      if (!data) break
      code = generateRoomCode()
      attempts++
    }

    // Create room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({ code, host_id: user.id, status: 'waiting' })
      .select()
      .single()

    if (roomError) throw roomError

    // Update user nickname if provided
    if (nickname) {
      await supabase.from('users').update({ nickname }).eq('id', user.id)
    }

    // Add host as player
    const { error: playerError } = await supabase.from('room_players').insert({
      room_id: room.id,
      user_id: user.id,
      nickname: nickname || user.email?.split('@')[0] || 'Player',
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
