import type { FC } from 'react';
import { useSearchStore } from '../../features/search/searchStore';
import { SearchDialog } from './SearchDialog';

export const SearchHost: FC = () => {
  const open = useSearchStore((s) => s.open);
  const closeSearch = useSearchStore((s) => s.closeSearch);
  return <SearchDialog open={open} onClose={closeSearch} />;
};
