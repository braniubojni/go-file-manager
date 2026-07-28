import { useEffect } from 'react';
import { usePaneStore } from '../../../features/pane/paneStore';
import { historyNav } from '../../../widgets/file-pane/helpers';
import { isEditableTarget } from '../helpers';

/** Mouse back/forward buttons (button 3 / 4). */
export const useMouseNavButtons = () => {
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (e.button !== 3 && e.button !== 4) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      const pane = usePaneStore.getState().activePane;
      historyNav(pane, e.button === 3 ? 'back' : 'forward');
    };
    window.addEventListener('mousedown', onMouse);
    window.addEventListener('auxclick', onMouse);
    return () => {
      window.removeEventListener('mousedown', onMouse);
      window.removeEventListener('auxclick', onMouse);
    };
  }, []);
};
