import type { StoryTurn } from '@/types'

const FRAME_SIZE = 480
const FRAME_DELAY = 2000

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split('')
  let line = ''
  const lines: string[] = []

  // For Korean/short text, just split by character width
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i]
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line !== '') {
      lines.push(line)
      line = words[i]
    } else {
      line = testLine
    }
  }
  lines.push(line)

  const totalHeight = lines.length * lineHeight
  const startY = y - totalHeight / 2 + lineHeight / 2

  lines.forEach((l, i) => {
    ctx.fillText(l, x, startY + i * lineHeight)
  })
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function drawTextFrame(ctx: CanvasRenderingContext2D, turn: StoryTurn, isFirst: boolean) {
  // Background
  ctx.fillStyle = '#0f2035'
  ctx.fillRect(0, 0, FRAME_SIZE, FRAME_SIZE)

  // Decorative border
  ctx.strokeStyle = '#d4af37'
  ctx.lineWidth = 3
  ctx.strokeRect(16, 16, FRAME_SIZE - 32, FRAME_SIZE - 32)

  // Label
  const label = isFirst ? '💡 제시어' : '🤔 추측'
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, FRAME_SIZE / 2, 70)

  // Word
  ctx.fillStyle = '#d4af37'
  ctx.font = `bold ${turn.content.length > 8 ? 44 : 56}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  wrapText(ctx, `"${turn.content}"`, FRAME_SIZE / 2, FRAME_SIZE / 2, FRAME_SIZE - 80, 66)

  // Author
  ctx.fillStyle = '#475569'
  ctx.font = '18px sans-serif'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`by ${turn.author_nickname}`, FRAME_SIZE / 2, FRAME_SIZE - 44)
}

function drawAiLabelFrame(ctx: CanvasRenderingContext2D, word: string, img: HTMLImageElement | null) {
  // White background for drawing area
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, FRAME_SIZE, FRAME_SIZE)

  if (img) {
    ctx.drawImage(img, 0, 0, FRAME_SIZE, FRAME_SIZE)
  } else {
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('이미지 로딩 실패', FRAME_SIZE / 2, FRAME_SIZE / 2)
  }

  // Top label banner
  ctx.fillStyle = 'rgba(76, 29, 149, 0.88)'
  ctx.fillRect(0, 0, FRAME_SIZE, 52)
  ctx.fillStyle = '#e9d5ff'
  ctx.font = 'bold 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`🤖 AI 화가가 "${word}" 그리기 도전`, FRAME_SIZE / 2, 32)
}

export async function generateStoryGIF(turns: StoryTurn[]): Promise<string> {
  // Dynamic import to avoid SSR issues
  const GIF = (await import('gif.js')).default

  const gif = new GIF({
    workers: 2,
    quality: 8,
    workerScript: '/gif.worker.js',
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  })

  const canvas = document.createElement('canvas')
  canvas.width = FRAME_SIZE
  canvas.height = FRAME_SIZE
  const ctx = canvas.getContext('2d')!
  let humanCount = 0

  for (const turn of turns) {
    ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE)

    if (turn.author_type === 'human') {
      drawTextFrame(ctx, turn, humanCount === 0)
      humanCount++
      gif.addFrame(canvas, { delay: FRAME_DELAY, copy: true })
    } else if (turn.image_url) {
      const img = await loadImage(turn.image_url)
      drawAiLabelFrame(ctx, turn.content, img)
      gif.addFrame(canvas, { delay: FRAME_DELAY, copy: true })
    }
  }

  return new Promise<string>((resolve, reject) => {
    gif.on('finished', (blob: Blob) => {
      resolve(URL.createObjectURL(blob))
    })
    gif.on('error', reject)
    gif.render()
  })
}
