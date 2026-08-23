export type TransferKind = 'copy' | 'move';

export type TransferOp = {
  jobId: string;
  kind: TransferKind;
  label: string;
  destDir: string;
  bytesDone: number;
  bytesTotal: number;
  currentPath: string;
  destPath: string;
  destSize: number;
  destIsDir: boolean;
  /** 0–100; 0 when total unknown */
  percent: number;
};

export type TransferProgressPayload = {
  jobId?: string;
  kind?: string;
  bytesDone?: number;
  bytesTotal?: number;
  currentPath?: string;
  label?: string;
  destDir?: string;
  destPath?: string;
  destSize?: number;
  destIsDir?: boolean;
};

export type TransferDonePayload = {
  jobId?: string;
  kind?: string;
  error?: string;
};

export type TransferState = {
  byId: Record<string, TransferOp>;
  upsert: (op: TransferOp) => void;
  updateProgress: (payload: TransferProgressPayload) => void;
  remove: (jobId: string) => void;
  list: () => TransferOp[];
};
