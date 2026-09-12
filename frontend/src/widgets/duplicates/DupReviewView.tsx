import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { useDuplicatesStore } from '../../features/duplicates/duplicatesStore';
import { checkedPaths } from '../../features/duplicates/helpers';
import { DupGroupCard } from './DupGroupCard';
import { groupsSx, skippedSx, viewSx } from './styles';

export const DupReviewView: FC = () => {
  const groups = useDuplicatesStore((s) => s.groups);
  const skipped = useDuplicatesStore((s) => s.skipped);
  const keepByHash = useDuplicatesStore((s) => s.keepByHash);
  const checkedByHash = useDuplicatesStore((s) => s.checkedByHash);
  const setKeep = useDuplicatesStore((s) => s.setKeep);
  const toggleChecked = useDuplicatesStore((s) => s.toggleChecked);
  const setPhase = useDuplicatesStore((s) => s.setPhase);
  const backToSetup = useDuplicatesStore((s) => s.backToSetup);
  const closeDialog = useDuplicatesStore((s) => s.closeDialog);
  const paths = checkedPaths(checkedByHash);

  return (
    <>
      <Stack sx={viewSx} data-testid="dup-review">
        {groups.length === 0 ? (
          <Typography data-testid="dup-empty">No exact duplicates.</Typography>
        ) : (
          <Stack sx={groupsSx}>
            {groups.map((g) => (
              <DupGroupCard
                key={g.hash}
                group={g}
                keep={keepByHash[g.hash] ?? ''}
                checked={checkedByHash[g.hash] ?? []}
                onKeep={(p) => setKeep(g.hash, p)}
                onToggle={(p) => toggleChecked(g.hash, p)}
              />
            ))}
          </Stack>
        )}
        {skipped.length > 0 ? (
          <>
            <Typography variant="subtitle2">Skipped ({skipped.length})</Typography>
            <Stack sx={skippedSx}>
              {skipped.map((s) => (
                <Typography key={`${s.path}:${s.message}`} variant="caption">
                  {s.path}: {s.message}
                </Typography>
              ))}
            </Stack>
          </>
        ) : null}
      </Stack>
      <DialogActions>
        <Button onClick={backToSetup} data-testid="btn-dup-back">
          Back
        </Button>
        <Button onClick={closeDialog} data-testid="btn-dup-close">
          Close
        </Button>
        <Button
          variant="contained"
          disabled={paths.length === 0}
          onClick={() => setPhase('merging')}
          data-testid="btn-dup-merge"
        >
          Delete {paths.length} files · Merge
        </Button>
      </DialogActions>
    </>
  );
};
