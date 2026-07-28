import { useEffect } from 'react';
import { useSavePaneTabs } from '../../../entities/file/queries';
import { usePaneStore } from '../../../features/pane/paneStore';

/** Debounced save of both panes' tab lists + active index when they change. */
export const usePersistPaneTabs = (ready: boolean) => {
  const leftTabs = usePaneStore((s) => s.leftTabs);
  const leftIndex = usePaneStore((s) => s.leftIndex);
  const rightTabs = usePaneStore((s) => s.rightTabs);
  const rightIndex = usePaneStore((s) => s.rightIndex);
  const saveTabs = useSavePaneTabs();

  useEffect(() => {
    if (!ready || !leftTabs.length || !rightTabs.length) return;
    const t = setTimeout(() => {
      saveTabs.mutate({
        left: leftTabs.map((tab) => ({ path: tab.path })),
        leftActive: leftIndex,
        right: rightTabs.map((tab) => ({ path: tab.path })),
        rightActive: rightIndex,
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only persist on tabs/index/ready change
  }, [leftTabs, leftIndex, rightTabs, rightIndex, ready]);
};
