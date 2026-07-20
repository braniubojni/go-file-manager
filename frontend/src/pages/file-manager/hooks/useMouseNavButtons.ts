import { useEffect } from 'react'
import { usePaneStore } from '../../../features/pane/paneStore'
import { isEditableTarget } from '../helpers'

/** Mouse back/forward buttons (button 3 / 4). */
export const useMouseNavButtons = () => {
  const goBack = usePaneStore((s) => s.goBack)
  const goForward = usePaneStore((s) => s.goForward)

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (e.button !== 3 && e.button !== 4) return
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      const pane = usePaneStore.getState().activePane
      if (e.button === 3) goBack(pane)
      else goForward(pane)
    }
    window.addEventListener('mousedown', onMouse)
    window.addEventListener('auxclick', onMouse)
    return () => {
      window.removeEventListener('mousedown', onMouse)
      window.removeEventListener('auxclick', onMouse)
    }
  }, [goBack, goForward])
}
