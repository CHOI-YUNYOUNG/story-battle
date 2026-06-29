import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roomId } = await req.json()

    // 방장 확인
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('host_id', user.id)
      .single()

    if (!room) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    // 이전 스토리 삭제
    await supabase.from('story_turns').delete().eq('room_id', roomId)

    // 상태 초기화
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'waiting' })
      .eq('id', roomId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset room error:', err)
    return NextResponse.json({ error: '방 초기화 실패' }, { status: 500 })
  }
}
