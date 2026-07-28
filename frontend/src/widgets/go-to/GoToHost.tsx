import type { FC } from 'react';
import { useGoToStore } from '../../features/go-to/goToStore';
import { GoToDialog } from './GoToDialog';

export const GoToHost: FC = () => {
  const open = useGoToStore((s) => s.open);
  const closeGoTo = useGoToStore((s) => s.closeGoTo);
  return <GoToDialog open={open} onClose={closeGoTo} />;
};
