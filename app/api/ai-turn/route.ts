import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { roomId, turnNumber, previousContent, isLastTurn } = await req.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const systemPrompt = `당신은 창의적인 스토리 작가입니다.
이전까지의 이야기를 받아서 자연스럽게 이어쓰되:
- 반드시 한국어로 작성
- 100~150자 분량
- 예상치 못한 반전이나 유머 요소 포함
- ${isLastTurn ? '전체 스토리를 감동적이거나 웃기게 마무리' : '다음 사람이 이어쓰기 쉽게 열린 결말로 끝내기'}
- 추가 설명 없이 이야기 본문만 작성`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `이전 내용:\n"${previousContent}"\n\n이 이야기를 자연스럽게 이어서 써주세요.`,
        },
      ],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''

    // Save AI turn to database
    const { error } = await supabase.from('story_turns').insert({
      room_id: roomId,
      turn_number: turnNumber,
      author_type: 'ai',
      author_id: null,
      author_nickname: 'AI 작가',
      content: content.trim(),
      is_visible: false,
    })

    if (error) throw error

    return NextResponse.json({ content: content.trim() })
  } catch (err) {
    console.error('AI turn error:', err)
    return NextResponse.json({ error: 'AI 이야기 생성 실패' }, { status: 500 })
  }
}
