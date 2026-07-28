export type ArchiveState = {
  open: boolean;
  formats: string[];
  format: string;
  name: string;
  encrypt: boolean;
  password: string;
  busy: boolean;
  error: string | null;
};

export type ArchiveAction =
  | { type: 'open'; defaultName: string; formats?: string[] }
  | { type: 'close' }
  | {
      type: 'set';
      patch: Partial<Pick<ArchiveState, 'format' | 'name' | 'encrypt' | 'password' | 'formats'>>;
    }
  | { type: 'submit_start' }
  | { type: 'submit_ok' }
  | { type: 'submit_fail'; error: string };

export type ExtractState = {
  open: boolean;
  password: string;
  busy: boolean;
  error: string | null;
  itemCount: number;
};

export type ExtractAction =
  | { type: 'open'; itemCount: number }
  | { type: 'close' }
  | { type: 'set_password'; password: string }
  | { type: 'submit_start' }
  | { type: 'submit_ok' }
  | { type: 'submit_fail'; error: string };
