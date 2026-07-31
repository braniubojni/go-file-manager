import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useCallback, useState, type FC, type KeyboardEvent, type SyntheticEvent } from 'react';
import { SettingsService } from '../../shared/api/bindings';
import type { HistoryField } from './types';

type Props = {
  field: HistoryField;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  testId?: string;
  size?: 'small' | 'medium';
  sx?: object;
  fullWidth?: boolean;
};

export const HistoryTextField: FC<Props> = ({
  field,
  value,
  onChange,
  onEnter,
  placeholder,
  disabled,
  autoFocus,
  testId,
  size = 'small',
  sx,
  fullWidth = true,
}) => {
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const loadHistory = useCallback(() => {
    void SettingsService.ListSearchHistory(field, 500)
      .then((list) => setOptions(list ?? []))
      .catch(() => setOptions([]));
  }, [field]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' && !open) {
      e.preventDefault();
      loadHistory();
      setOpen(true);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter?.();
    }
  };

  return (
    <Autocomplete
      freeSolo
      fullWidth={fullWidth}
      open={open}
      onOpen={() => {
        loadHistory();
        setOpen(true);
      }}
      onClose={() => setOpen(false)}
      options={options}
      inputValue={value}
      onInputChange={(_e: SyntheticEvent, v: string, reason) => {
        if (reason === 'input' || reason === 'clear' || reason === 'reset') {
          onChange(v);
        }
      }}
      onChange={(_e, v) => {
        if (typeof v === 'string') onChange(v);
      }}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus={autoFocus}
          placeholder={placeholder}
          size={size}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          onKeyDown={onKeyDown}
          slotProps={{
            htmlInput: {
              ...(params.slotProps?.htmlInput as object | undefined),
              'data-testid': testId,
            },
          }}
          sx={sx}
        />
      )}
    />
  );
};
