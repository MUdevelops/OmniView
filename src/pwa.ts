// Opens files handed to the installed PWA by the OS (manifest "file_handlers"). Chromium only; a no-op elsewhere.
interface LaunchParams { files: { getFile(): Promise<File> }[] }
declare global { interface Window { launchQueue?: { setConsumer(cb: (p: LaunchParams) => void): void } } }
export function registerFileHandler(add: (files: File[]) => Promise<void>) {
  window.launchQueue?.setConsumer(async (p) => { if (p.files.length) await add(await Promise.all(p.files.map((h) => h.getFile()))) })
}
