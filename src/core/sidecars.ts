/** Lower-cased file name of a URL or path; used to match sidecar files (.bin, .mtl, textures). */
export function baseName(u: string): string {
  try { u = decodeURIComponent(u) } catch { /* keep raw */ }
  return (u.split(/[?#]/)[0].split(/[\\/]/).pop() ?? '').toLowerCase()
}
export const findSibling = (files: File[], name: string) => files.find((f) => baseName(f.name) === baseName(name))
