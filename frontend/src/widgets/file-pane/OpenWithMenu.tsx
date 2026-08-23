import AppsIcon from '@mui/icons-material/Apps';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useEffect, useState, type FC, type MouseEvent } from 'react';
import { FileService } from '../../shared/api/bindings';
import { errMessage } from '../../shared/lib/format';
import { useSnack } from '../../shared/ui/SnackbarHost';

const APP_CAP = 12;

type App = { id: string; name: string };

type Props = {
  path: string;
  onDone: () => void;
};

const pickerOnly = /Win/i.test(navigator.platform);

/** Nested “Open with” items (or a single picker row on Windows). */
export const OpenWithMenu: FC<Props> = ({ path, onDone }) => {
  const show = useSnack((s) => s.show);
  const [apps, setApps] = useState<App[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (pickerOnly) return;
    let cancelled = false;
    void FileService.ListOpenWithApps(path)
      .then((list) => {
        if (!cancelled) setApps(list ?? []);
      })
      .catch((e) => {
        if (!cancelled) show(errMessage(e), 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [path, show]);

  const fail = (e: unknown) => show(errMessage(e), 'error');

  const pickApp = (id: string) => {
    onDone();
    void FileService.OpenWith(path, id).catch(fail);
  };

  const pickOther = () => {
    onDone();
    void FileService.OpenWithPicker(path).catch(fail);
  };

  if (pickerOnly) {
    return (
      <MenuItem dense data-testid="ctx-open-with" onClick={pickOther}>
        <ListItemIcon>
          <AppsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Open with…" />
      </MenuItem>
    );
  }

  const openSub = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  return (
    <>
      <MenuItem dense data-testid="ctx-open-with" onMouseEnter={openSub} onClick={openSub}>
        <ListItemIcon>
          <AppsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Open with" />
        <ChevronRightIcon fontSize="small" />
      </MenuItem>
      <Menu
        hideBackdrop
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        {apps.slice(0, APP_CAP).map((app) => (
          <MenuItem key={app.id} dense onClick={() => pickApp(app.id)}>
            <ListItemText primary={app.name} />
          </MenuItem>
        ))}
        {apps.length > 0 ? <Divider /> : null}
        <MenuItem dense data-testid="ctx-open-with-other" onClick={pickOther}>
          <ListItemText primary="Other…" />
        </MenuItem>
      </Menu>
    </>
  );
};
