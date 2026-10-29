import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { FileKind } from './fileSniffer'
export interface ViewerProps { file: File; kind: FileKind; siblings: File[] }
type V = LazyExoticComponent<ComponentType<ViewerProps>>
// Add a format by adding ONE entry here (and, if it needs new detection, a line in fileSniffer.ts).
const entries: { kinds: FileKind[]; viewer: V }[] = [
  { kinds: ['jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'], viewer: lazy(() => import('../viewers/ImageViewer')) },
  { kinds: ['tiff'], viewer: lazy(() => import('../viewers/TiffViewer')) },
  { kinds: ['heic'], viewer: lazy(() => import('../viewers/HeicViewer')) },
  { kinds: ['psd'], viewer: lazy(() => import('../viewers/PsdViewer')) },
  { kinds: ['raw'], viewer: lazy(() => import('../viewers/RawViewer')) },
  { kinds: ['eps', 'ai'], viewer: lazy(() => import('../viewers/EpsViewer')) },
  { kinds: ['pdf'], viewer: lazy(() => import('../viewers/PdfViewer')) },
  { kinds: ['obj', 'gltf', 'glb'], viewer: lazy(() => import('../viewers/ModelViewer')) },
  { kinds: ['docx'], viewer: lazy(() => import('../viewers/DocxViewer')) },
  { kinds: ['xlsx', 'ods', 'csv'], viewer: lazy(() => import('../viewers/SheetViewer')) },
  { kinds: ['pptx'], viewer: lazy(() => import('../viewers/PptxViewer')) },
  { kinds: ['text', 'rtf', 'odt', 'odp'], viewer: lazy(() => import('../viewers/TextViewer')) },
  { kinds: ['legacy'], viewer: lazy(() => import('../viewers/LegacyViewer')) },
]
const fallback: V = lazy(() => import('../viewers/UnsupportedViewer'))
export const viewerFor = (k: FileKind): V => entries.find((e) => e.kinds.includes(k))?.viewer ?? fallback
