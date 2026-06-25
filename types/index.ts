export type UserProfile = {
  id: string
  email: string
  nickname: string
  avatar_url: string | null
  best_writer_count: number
  worst_writer_count: number
}

export type Room = {
  id: string
  code: string
  host_id: string
  status: 'waiting' | 'playing' | 'voting' | 'finished'
  created_at: string
}

export type RoomPlayer = {
  id: string
  room_id: string
  user_id: string
  nickname: string
  turn_order: number
  is_host: boolean
}

export type StoryTurn = {
  id: string
  room_id: string
  turn_number: number
  author_type: 'human' | 'ai'
  author_id: string | null
  author_nickname: string | null
  content: string
  is_visible: boolean
  created_at: string
}

export type ChatMessage = {
  id: string
  room_id: string
  user_id: string
  nickname: string
  content: string
  created_at: string
}

export type Vote = {
  id: string
  room_id: string
  voter_id: string
  best_writer_id: string
  worst_writer_id: string
}

export type VoteResult = {
  userId: string
  nickname: string
  bestCount: number
  worstCount: number
}
