import type { ViewerProps } from '../core/registry'
import RasterWorkerViewer from './RasterWorkerViewer'
const create = () => new Worker(new URL('../workers/heic.worker.ts', import.meta.url), { type: 'module' })
export default function HeicViewer({ file }: ViewerProps) {
  return <RasterWorkerViewer file={file} create={create} noun="Image" failHint="This HEIC/HEIF file could not be decoded." />
}
