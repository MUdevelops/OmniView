// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../../src/components/ErrorBoundary'
import HelpOverlay from '../../src/components/HelpOverlay'
import Sidebar from '../../src/components/Sidebar'
import UnsupportedViewer from '../../src/viewers/UnsupportedViewer'

const Boom = () => { throw new Error('kaboom') }
describe('ErrorBoundary', () => {
  it('shows a friendly message and recovers when the resetKey changes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { rerender } = render(<ErrorBoundary resetKey="a"><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('could not be shown')
    rerender(<ErrorBoundary resetKey="b"><p>fine</p></ErrorBoundary>)
    expect(screen.getByText('fine')).toBeInTheDocument()
  })
})
describe('HelpOverlay', () => {
  it('is a labelled modal dialog, focuses its close button and closes on Escape', () => {
    const onClose = vi.fn(); render(<HelpOverlay onClose={onClose} />)
    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: /close help/i })).toHaveFocus()
    fireEvent.keyDown(document.body, { key: 'Escape' }); expect(onClose).toHaveBeenCalled()
  })
})
describe('Sidebar', () => {
  const mk = (id: string, name: string, kind: 'pdf' | 'mtl') => ({ id, kind, file: new File(['x'], name) })
  it('marks the current file, labels sidecars and reports clicks', () => {
    const onPick = vi.fn(); render(<Sidebar items={[mk('1', 'a.pdf', 'pdf'), mk('2', 'a.mtl', 'mtl')]} index={0} onPick={onPick} />)
    expect(screen.getByRole('button', { name: /a\.pdf/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText('sidecar')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /a\.mtl/ })); expect(onPick).toHaveBeenCalledWith(1)
  })
})
describe('UnsupportedViewer', () => {
  it('explains sidecars and unsupported types', () => {
    const { rerender } = render(<UnsupportedViewer file={new File([''], 'x.bin')} kind="bin" siblings={[]} />)
    expect(screen.getByText(/sidecar file/)).toBeInTheDocument()
    rerender(<UnsupportedViewer file={new File([''], 'x.zip')} kind="zip" siblings={[]} />)
    expect(screen.getByText(/can't display x\.zip/)).toBeInTheDocument()
  })
})
