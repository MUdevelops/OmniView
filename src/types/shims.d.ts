// Hand-written minimal typings. If a package ships its own types these ambient
// declarations still win, so delete a block once you confirm the package's own typings work.
declare module 'utif2' {
  export interface IFD { [tag: string]: any; width: number; height: number; data: Uint8Array }
  export function decode(buf: ArrayBuffer | Uint8Array): IFD[]
  export function decodeImage(buf: ArrayBuffer | Uint8Array, ifd: IFD, all?: IFD[]): void
  export function toRGBA8(ifd: IFD): Uint8Array
}
declare module 'libheif-js/wasm-bundle' {
  export interface HeifImage {
    get_width(): number
    get_height(): number
    display(target: { data: Uint8ClampedArray; width: number; height: number }, cb: (result: unknown) => void): void
  }
  export class HeifDecoder { decode(buf: Uint8Array | ArrayBuffer): HeifImage[] }
  const libheif: { HeifDecoder: typeof HeifDecoder }
  export default libheif
}
