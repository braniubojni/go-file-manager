import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror from '@uiw/react-codemirror';
import { useMemo, type FC } from 'react';
import { languageExtensionForPath } from './helpers';
import { editorPaneSx } from './styles';

type Props = {
  filePath: string | null;
  content: string;
  loading: boolean;
  loadError: string | null;
  onChange: (value: string | undefined) => void;
  onSave: () => void;
};

export const CodeMirrorPane: FC<Props> = ({
  filePath,
  content,
  loading,
  loadError,
  onChange,
  onSave,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const extensions = useMemo(() => {
    const saveKey = keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          onSave();
          return true;
        },
      },
    ]);
    return [
      lineNumbers(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      saveKey,
      EditorView.lineWrapping,
      ...languageExtensionForPath(filePath),
      ...(isDark ? [oneDark] : []),
    ];
  }, [filePath, isDark, onSave]);

  return (
    <Box sx={editorPaneSx} data-testid="codemirror-pane">
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', flex: 1 }}>
          <CircularProgress size={28} />
        </Box>
      ) : loadError ? (
        <Box sx={{ p: 2 }}>
          <Typography color="error" variant="body2">
            {loadError}
          </Typography>
        </Box>
      ) : (
        <CodeMirror
          key={filePath ?? 'untitled'}
          value={content}
          height="100%"
          theme={isDark ? 'dark' : 'light'}
          extensions={extensions}
          onChange={(value) => onChange(value)}
          basicSetup={{
            lineNumbers: false, // provided via extensions
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: true,
          }}
          style={{
            height: '100%',
            fontSize: 13,
            flex: 1,
            overflow: 'auto',
          }}
        />
      )}
    </Box>
  );
};
