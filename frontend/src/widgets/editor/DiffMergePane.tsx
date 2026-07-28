import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { MergeView } from '@codemirror/merge';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { useEffect, useRef, type FC } from 'react';
import { languageExtensionForPath } from './helpers';
import { editorPaneSx, mergeColLabelSx, mergeColsHeaderSx, mergeHostSx } from './styles';

type Props = {
  filePath: string | null;
  oldText: string;
  newText: string;
  loading: boolean;
  error: string | null;
  truncated: boolean;
  status: string;
};

const makeExtensions = (filePath: string | null, isDark: boolean) => [
  lineNumbers(),
  EditorView.editable.of(false),
  EditorState.readOnly.of(true),
  EditorView.lineWrapping,
  ...languageExtensionForPath(filePath),
  ...(isDark ? [oneDark] : []),
];

export const DiffMergePane: FC<Props> = ({
  filePath,
  oldText,
  newText,
  loading,
  error,
  truncated,
  status,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<MergeView | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || loading || error) return;

    // Never share the same extension instances across the two editors.
    viewRef.current?.destroy();
    host.replaceChildren();

    const view = new MergeView({
      a: {
        doc: oldText,
        extensions: makeExtensions(filePath, isDark),
      },
      b: {
        doc: newText,
        extensions: makeExtensions(filePath, isDark),
      },
      parent: host,
      orientation: 'a-b',
      gutter: true,
      highlightChanges: true,
      collapseUnchanged: { margin: 3, minSize: 6 },
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [filePath, oldText, newText, loading, error, isDark]);

  return (
    <Box sx={editorPaneSx} data-testid="diff-merge-pane">
      {(truncated || status) && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
          {status ? `git status: ${status}` : ''}
          {status && truncated ? ' · ' : ''}
          {truncated ? 'Content truncated for size limit' : ''}
        </Typography>
      )}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', flex: 1 }}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2 }}>
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={mergeColsHeaderSx}>
            <Typography variant="caption" sx={mergeColLabelSx}>
              HEAD (committed)
            </Typography>
            <Typography variant="caption" sx={mergeColLabelSx}>
              Working tree
            </Typography>
          </Box>
          <Box ref={hostRef} sx={mergeHostSx} />
        </>
      )}
    </Box>
  );
};
