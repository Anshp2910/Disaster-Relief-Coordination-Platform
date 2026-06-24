import { useRef, useEffect } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function useFocusTrap(active) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active || !ref.current) return

    const el = ref.current
    const previouslyFocused = document.activeElement

    const focusable = () => el.querySelectorAll(FOCUSABLE)
    const first = () => focusable()[0]
    const last = () => focusable()[focusable().length - 1]

    first()?.focus()

    function handler(e) {
      if (e.key !== 'Tab') return
      const f = focusable()
      if (f.length === 0) return
      const fst = f[0]
      const lst = f[f.length - 1]
      if (e.shiftKey && document.activeElement === fst) {
        e.preventDefault()
        lst.focus()
      } else if (!e.shiftKey && document.activeElement === lst) {
        e.preventDefault()
        fst.focus()
      }
    }

    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus()
      }
    }
  }, [active])

  return ref
}
