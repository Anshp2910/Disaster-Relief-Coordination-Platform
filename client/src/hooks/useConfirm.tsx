import { useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { RippleBtn } from '../components/ui'
import useFocusTrap from './useFocusTrap'

interface ConfirmOptions {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState {
  open: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  danger: boolean
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', danger: false })
  const resolveRef = useRef<((value: boolean) => void) | null>(null)
  const trapRef = useFocusTrap(state.open)

  const confirm = useCallback((opts: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setState({
        open: true,
        title: opts.title || 'Confirm',
        message: opts.message || 'Are you sure?',
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        danger: opts.danger || false,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    setState((s) => ({ ...s, open: false }))
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    setState((s) => ({ ...s, open: false }))
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleCancel()
  }, [handleCancel])

  const ConfirmDialog = state.open
    ? createPortal(
        <div className="modal-overlay" ref={trapRef} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" onKeyDown={handleKeyDown}>
          <div className="modal-card text-center">
            <div className="modal-icon">{state.danger ? '\u26A0' : '?'}</div>
            <h2 id="confirm-title" className="modal-title">{state.title}</h2>
            <p id="confirm-message" className="modal-desc">{state.message}</p>
            <div className="modal-actions mt">
              <button onClick={handleCancel} className="btn-secondary" autoFocus>{state.cancelText}</button>
              <RippleBtn onClick={handleConfirm} className={state.danger ? 'btn-danger' : ''}>{state.confirmText}</RippleBtn>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return { confirm, ConfirmDialog }
}
