import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import type { FileEntry } from '../../entities/file/types';
import type { TreeChildren } from './hooks/useFolderTree';
import { treePaneSx, treeRowSx } from './styles';

type Props = {
  rootPath: string;
  selectedPath: string | null;
  childrenMap: TreeChildren;
  expanded: Record<string, boolean>;
  onToggle: (dir: string) => void;
  onOpenFile: (path: string) => void;
};

const NodeList: FC<{
  dir: string;
  depth: number;
  selectedPath: string | null;
  childrenMap: TreeChildren;
  expanded: Record<string, boolean>;
  onToggle: (dir: string) => void;
  onOpenFile: (path: string) => void;
}> = ({ dir, depth, selectedPath, childrenMap, expanded, onToggle, onOpenFile }) => {
  const entries = childrenMap[dir];
  if (!entries) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ pl: 2 + depth * 1.5 }}>
        Loading…
      </Typography>
    );
  }
  return (
    <>
      {entries.map((e: FileEntry) =>
        e.isDir ? (
          <Box key={e.path}>
            <Box sx={treeRowSx(false, depth)} onClick={() => onToggle(e.path)}>
              {expanded[e.path] ? (
                <ExpandLessIcon sx={{ fontSize: 16 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 16 }} />
              )}
              <FolderIcon sx={{ fontSize: 16 }} color="warning" />
              <Typography variant="body2" noWrap>
                {e.name}
              </Typography>
            </Box>
            {expanded[e.path] && (
              <NodeList
                dir={e.path}
                depth={depth + 1}
                selectedPath={selectedPath}
                childrenMap={childrenMap}
                expanded={expanded}
                onToggle={onToggle}
                onOpenFile={onOpenFile}
              />
            )}
          </Box>
        ) : (
          <Box
            key={e.path}
            sx={treeRowSx(selectedPath === e.path, depth)}
            onClick={() => onOpenFile(e.path)}
            data-testid={`tree-file-${e.name}`}
          >
            <Box sx={{ width: 16 }} />
            <InsertDriveFileIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2" noWrap>
              {e.name}
            </Typography>
          </Box>
        ),
      )}
    </>
  );
};

export const FolderTree: FC<Props> = ({
  rootPath,
  selectedPath,
  childrenMap,
  expanded,
  onToggle,
  onOpenFile,
}) => (
  <Box sx={treePaneSx} data-testid="editor-tree">
    <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 0.75, display: 'block' }}>
      {rootPath}
    </Typography>
    <NodeList
      dir={rootPath}
      depth={0}
      selectedPath={selectedPath}
      childrenMap={childrenMap}
      expanded={expanded}
      onToggle={onToggle}
      onOpenFile={onOpenFile}
    />
  </Box>
);
