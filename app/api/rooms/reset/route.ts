import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { roomId, userId } = await req.json()
    const supabase = createAdminClient()

    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('host_id', userId)
      .single()

    if (!room) return NextResponse.json({ error: '방장만 초기화할 수 있습니다' }, { status: 403 })

    await supabase.from('story_turns').delete().eq('room_id', roomId)
    const { error } = await supabase.from('rooms').update({ status: 'waiting' }).eq('id', roomId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset room error:', err)
    return NextResponse.json({ error: '방 초기화 실패' }, { status: 500 })
  }
}
