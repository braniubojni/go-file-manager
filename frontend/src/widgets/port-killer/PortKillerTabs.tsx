import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import type { FC } from 'react';
import { killerTabsSx } from './styles';

export type KillerTab = 'ports' | 'processes';

type Props = {
  tab: KillerTab;
  onChange: (tab: KillerTab) => void;
};

export const PortKillerTabs: FC<Props> = ({ tab, onChange }) => (
  <Tabs
    value={tab}
    onChange={(_e, v: KillerTab) => onChange(v)}
    variant="fullWidth"
    sx={killerTabsSx}
  >
    <Tab value="ports" label="Local Ports" data-testid="tab-ports" />
    <Tab value="processes" label="Processes" data-testid="tab-processes" />
  </Tabs>
);
