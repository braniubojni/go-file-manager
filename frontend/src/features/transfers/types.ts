export type TransferKind = 'copy' | 'move' | 'attach';

type TransferFileStatus = 'active' | 'done' | 'canceled';

export type TransferFile = {
  path: string;
  dest: string;
  done: number;
  total: number;
  status: TransferFileStatus;
  /** 0–100; 0 when total unknown */
  percent: number;
};

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
  /** one entry per top-level source selected for this job */
  files: TransferFile[];
};

type TransferFileProgressPayload = {
  path?: string;
  dest?: string;
  done?: number;
  total?: number;
  status?: string;
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
  files?: TransferFileProgressPayload[];
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
  /** Marks jobId's still-active files 'canceled' so their grid rows get cleaned up. */
  cancelAllFiles: (jobId: string) => void;
  remove: (jobId: string) => void;
  list: () => TransferOp[];
};
