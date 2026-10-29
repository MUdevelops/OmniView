import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
import type { ViewerProps } from '../core/registry'
import { baseName, findSibling } from '../core/sidecars'

type Stats = { vertices: number; triangles: number; materials: number }
type Api = { wire: (b: boolean) => void; grid: (b: boolean) => void; light: (p: string) => void }
const LIGHTS: Record<string, { amb: number; dir: number; pos: [number, number, number] }> = {
  studio: { amb: 0.6, dir: 2.2, pos: [3, 5, 4] }, soft: { amb: 1.3, dir: 0.6, pos: [0, 5, 2] }, dramatic: { amb: 0.12, dir: 3.2, pos: [-4, 2, 3] },
}
function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    m.geometry?.dispose()
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
    for (const mat of mats) {
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose()
      mat.dispose()
    }
  })
}

export default function ModelViewer({ file, kind, siblings }: ViewerProps) {
  const host = useRef<HTMLDivElement>(null); const api = useRef<Api | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState(''); const [stats, setStats] = useState<Stats | null>(null)
  const [wire, setWire] = useState(false); const [grid, setGrid] = useState(true); const [light, setLight] = useState('studio')

  useEffect(() => {
    const el = host.current!; let dead = false; let raf = 0
    const urls: string[] = []; setStatus('loading'); setStats(null); setError('')
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true }) } catch { setStatus('error'); setError('WebGL is not available in this browser.'); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); el.appendChild(renderer.domElement)
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000)
    const controls = new OrbitControls(camera, renderer.domElement)
    const rig = new THREE.Group(); scene.add(rig)
    const helpers = new THREE.Group(); const gridH = new THREE.GridHelper(10, 10); const axes = new THREE.AxesHelper(2)
    helpers.add(gridH, axes); scene.add(helpers)
    let model: THREE.Object3D | undefined
    const resize = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix() }
    const ro = new ResizeObserver(resize); ro.observe(el); resize()
    const setLights = (name: string) => {
      rig.clear(); const c = LIGHTS[name] ?? LIGHTS.studio
      rig.add(new THREE.AmbientLight(0xffffff, c.amb)); const d = new THREE.DirectionalLight(0xffffff, c.dir); d.position.set(...c.pos); rig.add(d)
    }
    setLights('studio')
    api.current = {
      wire: (b) => model?.traverse((o) => { const m = (o as THREE.Mesh).material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { (x as THREE.MeshBasicMaterial).wireframe = b }) }),
      grid: (b) => { helpers.visible = b }, light: setLights,
    }
    const map = new Map<string, string>()
    for (const f of siblings) if (f !== file) { const u = URL.createObjectURL(f); urls.push(u); map.set(baseName(f.name), u) }
    const manager = new THREE.LoadingManager(); manager.setURLModifier((u) => map.get(baseName(u)) ?? u)

    ;(async () => {
      try {
        if (kind === 'glb' || kind === 'gltf') {
          const g = await new GLTFLoader(manager).parseAsync(kind === 'glb' ? await file.arrayBuffer() : await file.text(), '')
          model = g.scene
        } else {
          const text = await file.text(); const loader = new OBJLoader(manager)
          const mtlName = /^mtllib\s+(.+)$/m.exec(text)?.[1]?.trim(); const mtl = mtlName ? findSibling(siblings, mtlName) : undefined
          if (mtl) { const mats = new MTLLoader(manager).parse(await mtl.text(), ''); mats.preload(); loader.setMaterials(mats) }
          model = loader.parse(text)
          model.traverse((o) => { const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined; if (g && !g.getAttribute('normal')) g.computeVertexNormals() })
        }
        if (dead) return
        scene.add(model)
        const box = new THREE.Box3().setFromObject(model); const size = box.getSize(new THREE.Vector3()); const ctr = box.getCenter(new THREE.Vector3())
        model.position.sub(ctr); const maxDim = Math.max(size.x, size.y, size.z) || 1
        gridH.scale.setScalar(maxDim / 5); gridH.position.y = -size.y / 2; axes.scale.setScalar(maxDim / 4)
        const dist = (maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.8
        camera.position.set(dist * 0.6, dist * 0.4, dist); camera.near = dist / 100; camera.far = dist * 100; camera.updateProjectionMatrix()
        controls.target.set(0, 0, 0); controls.update()
        let v = 0, t = 0; const ms = new Set<THREE.Material>()
        model.traverse((o) => {
          const m = o as THREE.Mesh; if (!m.isMesh) return
          const p = m.geometry.getAttribute('position'); v += p.count; t += (m.geometry.index?.count ?? p.count) / 3
          ;(Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => ms.add(x))
        })
        setStats({ vertices: v, triangles: Math.round(t), materials: ms.size }); setStatus('ready')
      } catch (e) {
        if (!dead) { setError(e instanceof Error ? e.message : 'Could not parse this model'); setStatus('error') }
      }
    })()
    const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera) }
    loop()
    return () => {
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose()
      disposeTree(scene); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
      urls.forEach((u) => URL.revokeObjectURL(u)); api.current = null
    }
  }, [file, kind, siblings])

  useEffect(() => { api.current?.wire(wire) }, [wire, status])
  useEffect(() => { api.current?.grid(grid) }, [grid])
  useEffect(() => { api.current?.light(light) }, [light])
  const btn = 'rounded border px-3 py-1 text-sm'
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b p-2" style={{ borderColor: 'var(--line)' }} role="toolbar" aria-label="3D controls">
        <button className={btn} aria-pressed={wire} onClick={() => setWire((w) => !w)}>Wireframe</button>
        <button className={btn} aria-pressed={grid} onClick={() => setGrid((g) => !g)}>Grid and axes</button>
        <label className="text-sm">Lighting <select value={light} onChange={(e) => setLight(e.target.value)} className="rounded border px-2 py-1" style={{ background: 'var(--panel)' }}>
          {Object.keys(LIGHTS).map((k) => <option key={k}>{k}</option>)}</select></label>
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={host} className="absolute inset-0" data-testid="model-host" />
        {status === 'loading' && <p className="absolute left-4 top-4">Loading model…</p>}
        {status === 'error' && <p role="alert" className="absolute left-4 top-4 max-w-md">Could not show this model: {error}. For .gltf and .obj files, drop the .bin, .mtl and texture files together with the model.</p>}
        {stats && <dl className="absolute bottom-3 right-3 rounded border p-3 text-sm" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }} aria-label="Model statistics">
          <div className="flex justify-between gap-6"><dt>Vertices</dt><dd>{stats.vertices.toLocaleString()}</dd></div>
          <div className="flex justify-between gap-6"><dt>Triangles</dt><dd>{stats.triangles.toLocaleString()}</dd></div>
          <div className="flex justify-between gap-6"><dt>Materials</dt><dd>{stats.materials}</dd></div></dl>}
      </div>
    </div>)
}
