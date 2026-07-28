import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import HomeIcon from '@mui/icons-material/Home';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useRef, useState, type FC } from 'react';
import { usePathCompletions } from '../../entities/file/queries';
import type { PathBarProps } from './types';

/** Normalize path for navigation: trim, strip trailing slashes (except root). */
const normalizeNavPath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  // Keep Windows drive roots like C:\
  if (/^[a-zA-Z]:\\?$/.test(trimmed)) {
    return trimmed.endsWith('\\') ? trimmed : `${trimmed}\\`;
  }
  const stripped = trimmed.replace(/[/\\]+$/, '');
  return stripped || '/';
};

export const PathBar: FC<PathBarProps> = ({
  paneId,
  path,
  onNavigate,
  onUp,
  onHome,
  onFocusPane,
}) => {
  const highlightedRef = useRef<string | null>(null);
  const [draft, setDraft] = useState(path);
  const [open, setOpen] = useState(false);
  const completions = usePathCompletions(draft, open || draft !== path);
  const options = completions.data ?? [];

  useEffect(() => {
    setDraft(path);
  }, [path]);

  const submit = (value: string) => {
    const next = normalizeNavPath(value);
    if (next) onNavigate(next);
    setOpen(false);
    highlightedRef.current = null;
  };

  /** Pick best option for Enter: exact path match, else first ranked suggestion. */
  const pickFromOptions = (input: string): string | null => {
    if (!options.length) return null;
    const norm = normalizeNavPath(input).toLowerCase();
    const exact = options.find((o) => normalizeNavPath(o).toLowerCase() === norm);
    if (exact) return exact;
    // Prefer option whose basename starts with the typed tail
    const tail = input.split(/[/\\]/).pop()?.toLowerCase() ?? '';
    if (tail) {
      const starts = options.find((o) => {
        const base = normalizeNavPath(o).split(/[/\\]/).pop()?.toLowerCase() ?? '';
        return base.startsWith(tail);
      });
      if (starts) return starts;
    }
    return options[0];
  };

  return (
    <Box
      onMouseDown={(e) => {
        // Activate pane without immediately focusing the grid
        if ((e.target as HTMLElement).closest('input,button,textarea')) {
          onFocusPane();
          return;
        }
        onFocusPane();
      }}
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5, py: 0.5 }}
    >
      <Tooltip title="Parent folder">
        <IconButton data-testid={`btn-parent-${paneId}`} onClick={onUp} size="small">
          <ArrowUpwardIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Home">
        <IconButton data-testid={`btn-home-${paneId}`} onClick={onHome} size="small">
          <HomeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Autocomplete
        freeSolo
        fullWidth
        size="small"
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => {
          setOpen(false);
          highlightedRef.current = null;
        }}
        options={options}
        inputValue={draft}
        autoHighlight
        filterOptions={(x) => x}
        onHighlightChange={(_, option) => {
          highlightedRef.current = typeof option === 'string' ? option : null;
        }}
        onInputChange={(_, v, reason) => {
          if (reason === 'reset') return;
          setDraft(v);
          // Keep suggestions open while the user is typing a different path
          if (v !== path) setOpen(true);
        }}
        onChange={(_, v) => {
          // Mouse click / Autocomplete selection
          if (typeof v === 'string' && v) {
            setDraft(v);
            submit(v);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            data-testid={`path-input-${paneId}`}
            onFocus={() => onFocusPane()}
            onMouseDown={() => onFocusPane()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDraft(path);
                setOpen(false);
                highlightedRef.current = null;
                return;
              }
              if (e.key !== 'Enter') return;

              e.preventDefault();
              e.stopPropagation();
              if (open && highlightedRef.current) {
                const pick = highlightedRef.current;
                setDraft(pick);
                submit(pick);
                return;
              }
              // Fallback: best completion for partial draft, else raw path.
              if (options.length > 0 && draft.trim() !== path) {
                const pick = pickFromOptions(draft);
                if (pick) {
                  setDraft(pick);
                  submit(pick);
                  return;
                }
              }
              submit(draft);
            }}
            sx={{
              '& input': {
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
              },
            }}
          />
        )}
        renderOption={(props, option) => (
          <ListItem {...props} key={option} aria-label={`path-option-${option}`}>
            {option}
          </ListItem>
        )}
      />
    </Box>
  );
};
