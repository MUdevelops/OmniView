// Message protocol shared by the TIFF and HEIC decode workers and useRasterWorker.
export interface PageInfo { width: number; height: number }
export type In = { type: 'open'; buf: ArrayBuffer } | { type: 'page'; index: number }
export type Out =
  | { type: 'opened'; pages: PageInfo[] }
  | { type: 'page'; index: number; width: number; height: number; data: ArrayBuffer }
  | { type: 'error'; message: string }
export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Unknown decoder error'
}
