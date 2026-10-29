import type { ViewerProps } from '../core/registry'
export default function UnsupportedViewer({ file, kind }: ViewerProps) {
  const side = kind === 'mtl' || kind === 'bin'
  return <div className="m-8 max-w-md" role="status"><p className="font-bold">{side ? `${file.name} is a sidecar file.` : `OmniView can't display ${file.name}.`}</p>
    <p style={{ color: 'var(--mute)' }}>{side ? 'It is loaded automatically by the 3D model it belongs to when you drop them together.' : `Detected type: ${kind}. This format isn't supported.`}</p></div>
}
