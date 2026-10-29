import type { ViewerProps } from '../core/registry'
import RasterWorkerViewer from './RasterWorkerViewer'
const create = () => new Worker(new URL('../workers/tiff.worker.ts', import.meta.url), { type: 'module' })
export default function TiffViewer({ file }: ViewerProps) {
  return <RasterWorkerViewer file={file} create={create} noun="Page" failHint="This TIFF could not be decoded." />
}
