declare module 'gif.js' {
  interface GIFOptions {
    workers?: number
    quality?: number
    workerScript?: string
    width?: number
    height?: number
    repeat?: number
    background?: string
    transparent?: number | null
    dither?: boolean | string
    debug?: boolean
  }
  class GIF {
    constructor(options: GIFOptions)
    addFrame(element: HTMLCanvasElement | CanvasRenderingContext2D | ImageData, options?: { delay?: number; copy?: boolean; dispose?: number }): void
    on(event: 'finished', callback: (blob: Blob) => void): void
    on(event: 'progress', callback: (p: number) => void): void
    on(event: 'error', callback: (err: Error) => void): void
    render(): void
    abort(): void
  }
  export default GIF
}
