'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { ChatMessage } from '@/types'

interface ChatPanelProps {
  roomId: string
  currentUserId: string
  nickname: string
}

export default function ChatPanel({ roomId, currentUserId, nickname }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at')
      .limit(100)
    if (data) setMessages(data)
  }, [supabase, roomId])

  useEffect(() => {
    fetchMessages()
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [roomId, supabase, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    const content = text.trim()
    setText('')
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      user_id: currentUserId,
      nickname,
      content,
    })
  }

  return (
    <div className="flex flex-col h-80 bg-navy-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-2 border-b border-navy-600">
        <span className="text-gold text-sm font-semibold">💬 채팅</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.user_id === currentUserId ? 'flex-row-reverse' : ''}`}>
            <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
              msg.user_id === currentUserId
                ? 'bg-gold/20 text-gold'
                : 'bg-navy-700 text-gray-200'
            }`}>
              {msg.user_id !== currentUserId && (
                <div className="text-xs text-gray-500 mb-1">{msg.nickname}</div>
              )}
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t border-navy-600">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="메시지 입력..."
          maxLength={200}
          className="flex-1 bg-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gold/40"
        />
        <button type="submit" className="px-3 py-2 bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition-colors text-sm">
          전송
        </button>
      </form>
    </div>
  )
}
