export interface LayerLike { name?: string; hidden?: boolean; children?: LayerLike[] }
export interface LayerRow { id: string; name: string; hidden: boolean; depth: number; isGroup: boolean }
/** Rows for the layer list, top-most layer first. ids are index paths ("2", "2.0") into the PSD tree. */
export function flattenLayers(children: LayerLike[] | undefined, depth = 0, prefix = ''): LayerRow[] {
  const out: LayerRow[] = []
  const list = children ?? []
  for (let i = list.length - 1; i >= 0; i--) { // PSD stores bottom → top
    const l = list[i]; const id = prefix + i
    out.push({ id, name: l.name || '(unnamed)', hidden: !!l.hidden, depth, isGroup: !!l.children })
    if (l.children) out.push(...flattenLayers(l.children, depth + 1, id + '.'))
  }
  return out
}
