import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { roomId, userId } = await req.json()
    const supabase = createAdminClient()

    await supabase.from('room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Leave room error:', err)
    return NextResponse.json({ error: '나가기 실패' }, { status: 500 })
  }
}
