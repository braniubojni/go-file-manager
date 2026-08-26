import { FileService } from '../../shared/api/bindings';
import { errMessage } from '../../shared/lib/format';
import { useTransferStore } from '../transfers/transferStore';

const isPasswordError = (msg: string): boolean => {
  const m = msg.toLowerCase();
  return (
    m.includes('authentication') ||
    m.includes('passphrase') ||
    m.includes('password') ||
    m.includes('encrypted')
  );
};

export const startAttachDmg = (opts: {
  path: string;
  password?: string;
  show: (msg: string, severity?: 'success' | 'error' | 'info' | 'warning') => void;
  onMounted: (mountPoint: string) => void;
  onNeedPassword?: (path: string, error?: string) => void;
}): void => {
  const { path, password = '', show, onMounted, onNeedPassword } = opts;
  const upsert = useTransferStore.getState().upsert;
  const remove = useTransferStore.getState().remove;
  const label = `Attach ${path.split(/[/\\]/).pop() || path}`;

  void FileService.NewJobID()
    .catch(() => '')
    .then((jobId: string) => {
      if (jobId) {
        upsert({
          jobId,
          kind: 'attach',
          label,
          destDir: '',
          bytesDone: 0,
          bytesTotal: 0,
          currentPath: path,
          destPath: '',
          destSize: 0,
          destIsDir: false,
          percent: 0,
        });
      }
      return FileService.AttachDiskImage(jobId || '', path, password)
        .then((mp) => {
          if (jobId) remove(jobId);
          if (mp) onMounted(mp);
        })
        .catch((e) => {
          if (jobId) remove(jobId);
          const msg = errMessage(e);
          if (msg.toLowerCase().includes('cancel')) {
            show('Attach cancelled', 'info');
            return;
          }
          if (isPasswordError(msg) && onNeedPassword) {
            onNeedPassword(path, msg);
            return;
          }
          show(msg, 'error');
        });
    });
};
