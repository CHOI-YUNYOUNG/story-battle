import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DRAW_PROMPT = (word: string) =>
  `A terrible MS Paint drawing of: "${word}". White background only. Drawn clumsily with a mouse. Pixelated, low-res, jagged wobbly lines. Wrong proportions. Childlike amateur doodle. Crude sketch that vaguely resembles the subject but is mostly wrong. 90s computer paint program aesthetic. Extremely badly drawn.`

export async function POST(req: NextRequest) {
  try {
    const { roomId, turnNumber, word } = await req.json()
    if (!roomId || turnNumber === undefined || !word) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
    }

    const response = await openai.images.generate({
      model: 'dall-e-2',
      prompt: DRAW_PROMPT(word),
      n: 1,
      size: '512x512',
      response_format: 'b64_json',
    })

    const b64 = response.data?.[0]?.b64_json ?? ''
    if (!b64) throw new Error('No image data returned')

    const buffer = Buffer.from(b64, 'base64')
    const supabase = createAdminClient()
    const filePath = `${roomId}/${turnNumber}.png`

    const { error: uploadError } = await supabase.storage
      .from('story-images')
      .upload(filePath, buffer, { contentType: 'image/png', upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('story-images')
      .getPublicUrl(filePath)

    const { error: dbError } = await supabase.from('story_turns').insert({
      room_id: roomId,
      turn_number: turnNumber,
      author_type: 'ai',
      author_id: null,
      author_nickname: 'AI 화가',
      content: word,
      image_url: publicUrl,
      is_visible: false,
    })

    if (dbError) throw dbError

    return NextResponse.json({ imageUrl: publicUrl })
  } catch (err) {
    console.error('AI draw error:', err)
    return NextResponse.json({ error: 'AI 그림 생성 실패' }, { status: 500 })
  }
}
