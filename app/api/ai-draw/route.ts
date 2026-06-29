import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DRAW_PROMPT = (word: string) =>
  `A terrible MS Paint drawing of: "${word}". White background only. Drawn clumsily with a mouse. Pixelated, low-res, jagged wobbly lines. Wrong proportions. Childlike amateur doodle. Crude sketch that vaguely resembles the subject but is mostly wrong. 90s computer paint program aesthetic. Extremely badly drawn.`

export async function POST(req: NextRequest) {
  const { roomId, turnNumber, word } = await req.json()
  if (!roomId || turnNumber === undefined || !word) {
    return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
  }

  // Step 1: OpenAI 이미지 생성 (URL 형식)
  let imageUrl = ''
  try {
    const response = await openai.images.generate({
      model: 'dall-e-2',
      prompt: DRAW_PROMPT(word),
      n: 1,
      size: '512x512',
    })
    imageUrl = response.data?.[0]?.url ?? ''
    if (!imageUrl) throw new Error('빈 응답')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('OpenAI error:', msg)
    return NextResponse.json({ error: `OpenAI 실패: ${msg}` }, { status: 500 })
  }

  // Step 2: 이미지 다운로드 후 Supabase Storage 업로드 (URL은 1시간 후 만료되므로)
  const supabase = createAdminClient()
  const filePath = `${roomId}/${turnNumber}.png`
  const imgRes = await fetch(imageUrl)
  const buffer = Buffer.from(await imgRes.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('story-images')
    .upload(filePath, buffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('Storage error:', uploadError)
    return NextResponse.json({ error: `스토리지 업로드 실패: ${uploadError.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('story-images').getPublicUrl(filePath)

  // Step 3: DB 저장
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

  if (dbError) {
    console.error('DB error:', dbError)
    return NextResponse.json({ error: `DB 저장 실패: ${dbError.message}` }, { status: 500 })
  }

  return NextResponse.json({ imageUrl: publicUrl })
}
