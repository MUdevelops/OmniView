import { create } from 'zustand'
import type { FileKind } from './fileSniffer'
import { sniffFile } from './fileSniffer'
export interface Item { id: string; file: File; kind: FileKind }
interface S {
  items: Item[]; index: number; dark: boolean; maxBytes: number
  dims: { file: File; w: number; h: number } | null; setDims: (file: File, w: number, h: number) => void
  add: (files: File[]) => Promise<void>; go: (i: number) => void; step: (d: number) => void
  toggleDark: () => void; clear: () => void
}
let n = 0
const isSidecar = (k: FileKind) => k === 'mtl' || k === 'bin'
export const useStore = create<S>((set, get) => ({
  items: [], index: 0, dark: matchMedia?.('(prefers-color-scheme: dark)').matches ?? false, maxBytes: 200 * 1024 * 1024,
  dims: null, setDims: (file, w, h) => set({ dims: { file, w, h } }),
  add: async (files) => {
    const next: Item[] = []
    for (const file of files) next.push({ id: `f${n++}`, file, kind: await sniffFile(file).catch(() => 'unknown' as const) })
    const start = get().items.length
    const pri = next.findIndex((x) => ['obj','gltf','glb'].includes(x.kind))
    const first = next.findIndex((x) => !['mtl','bin'].includes(x.kind))
    const pick = pri >= 0 ? pri : Math.max(first, 0)
    set((s) => ({ items: [...s.items, ...next], index: next.length ? start + pick : s.index }))
  },
  go: (i) => set((s) => ({ index: Math.max(0, Math.min(i, s.items.length - 1)) })),
  step: (d) => set((s) => { // skips .mtl/.bin sidecars so arrow keys only visit viewable files
    const len = s.items.length; if (!len) return { index: 0 }
    let i = s.index
    for (let t = 0; t < len; t++) { i = (i + d + len) % len; if (!isSidecar(s.items[i].kind)) return { index: i } }
    return { index: s.index }
  }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),
  clear: () => set({ items: [], index: 0 }),
}))
