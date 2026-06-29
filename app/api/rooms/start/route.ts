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

    if (!room) return NextResponse.json({ error: '방장만 시작할 수 있습니다' }, { status: 403 })

    const { count } = await supabase
      .from('room_players')
      .select('*', { count: 'exact' })
      .eq('room_id', roomId)

    if ((count ?? 0) < 2) return NextResponse.json({ error: '최소 2명이 필요합니다' }, { status: 400 })

    const { error } = await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Start game error:', err)
    return NextResponse.json({ error: '게임 시작 실패' }, { status: 500 })
  }
}
