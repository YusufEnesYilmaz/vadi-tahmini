import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
    .filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
}

export function useModalFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!active) return
    const dialog = ref.current
    if (!dialog) return

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.tabIndex = -1

    const focusInitial = () => {
      const focusables = getFocusable(dialog)
      ;(focusables[0] ?? dialog).focus()
    }
    focusInitial()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusables = getFocusable(dialog)
      if (focusables.length === 0) {
        e.preventDefault()
        dialog.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement instanceof HTMLElement ? document.activeElement : null

      if (e.shiftKey) {
        if (!current || current === first || !dialog.contains(current)) {
          e.preventDefault()
          last.focus()
        }
        return
      }

      if (!current || current === last || !dialog.contains(current)) {
        e.preventDefault()
        first.focus()
      }
    }

    dialog.addEventListener('keydown', onKeyDown)
    return () => {
      dialog.removeEventListener('keydown', onKeyDown)
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [active])

  return ref
}
