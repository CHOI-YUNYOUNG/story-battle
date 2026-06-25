import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RoomClient from './RoomClient'

interface Props {
  params: Promise<{ code: string }>
}

export default async function RoomPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) redirect('/')

  // Check if player is in room
  const { data: player } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .single()

  if (!player) redirect('/')

  return <RoomClient initialRoom={room} currentUserId={user.id} />
}
