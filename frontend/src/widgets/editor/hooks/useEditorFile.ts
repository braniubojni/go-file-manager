import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEditorStore } from '../../../features/editor/editorStore';
import { FileService } from '../../../shared/api/bindings';
import { errMessage } from '../../../shared/lib/format';
import { useSnack } from '../../../shared/ui/SnackbarHost';

export const useEditorFile = () => {
  const filePath = useEditorStore((s) => s.filePath);
  const dirty = useEditorStore((s) => s.dirty);
  const setDirty = useEditorStore((s) => s.setDirty);
  const show = useSnack((s) => s.show);
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setContent('');
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void FileService.ReadTextFile(filePath)
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setDirty(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = errMessage(e);
          setLoadError(msg);
          setContent('');
          show(msg, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filePath, setDirty, show]);

  const onChange = useCallback(
    (value: string | undefined) => {
      setContent(value ?? '');
      setDirty(true);
    },
    [setDirty],
  );

  const save = useCallback(() => {
    if (!filePath || !dirty) return;
    void FileService.WriteTextFile(filePath, content)
      .then(() => {
        setDirty(false);
        show('Saved', 'success');
        const parent = filePath.replace(/\/+$/, '').split(/[/\\]/).slice(0, -1).join('/') || '/';
        void qc.invalidateQueries({ queryKey: ['dir', parent] });
        void qc.invalidateQueries({ queryKey: ['gitStatus', parent] });
      })
      .catch((e) => show(errMessage(e), 'error'));
  }, [filePath, dirty, content, setDirty, show, qc]);

  return { content, loading, loadError, onChange, save, dirty, filePath };
};
