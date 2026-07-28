import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CloudIcon from '@mui/icons-material/Cloud';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import type { FC } from 'react';
import type { PaneId } from '../../entities/file/types';
import type { PaneTab } from '../../features/pane/paneStore';
import { tabLabel } from './helpers';
import {
  addTabBtnSx,
  tabCloseBtnSx,
  tabCloudIconSx,
  tabLabelRowSx,
  tabSx,
  tabsRowSx,
  tabsSx,
} from './styles';

type Props = {
  id: PaneId;
  tabs: PaneTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onAddTab: () => void;
};

export const PaneTabs: FC<Props> = ({
  id,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
}) => (
  <Box sx={tabsRowSx} data-testid={`pane-${id}-tabs`}>
    <Tabs
      value={activeTabId}
      onChange={(_e, val: string) => onSelectTab(val)}
      variant="scrollable"
      scrollButtons="auto"
      sx={tabsSx}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          value={tab.id}
          data-testid={`pane-${id}-tab-${tab.id}`}
          sx={tabSx(tab.id === activeTabId)}
          onAuxClick={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              onCloseTab(tab.id);
            }
          }}
          label={
            <Box sx={tabLabelRowSx}>
              {tab.path.startsWith('ssh://') && <CloudIcon sx={tabCloudIconSx} />}
              <span title={tab.path}>{tabLabel(tab.path)}</span>
              {tabs.length > 1 && (
                <IconButton
                  size="small"
                  sx={tabCloseBtnSx}
                  data-testid={`pane-${id}-tab-close-${tab.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                >
                  <CloseIcon sx={tabCloudIconSx} />
                </IconButton>
              )}
            </Box>
          }
        />
      ))}
    </Tabs>
    <Tooltip title="New tab">
      <IconButton
        size="small"
        sx={addTabBtnSx}
        data-testid={`pane-${id}-tab-add`}
        onClick={onAddTab}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Box>
);
