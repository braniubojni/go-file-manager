import { useEffect, useRef } from 'react';
import { useFileOpsStore } from '../../../features/file-ops/fileOpsStore';
import { runToolbarRequest } from '../helpers';
import type { ToolbarRequestHandlers } from '../types';

/**
 * When the file-ops store fires a request (keyboard shortcut / menu),
 * invoke the matching handler and consume the request.
 *
 * Pass a stable-enough handlers object each render; latest handlers are
 * read via ref so the effect only re-runs on `nonce`.
 */
export const useFileOpsRequest = (handlers: ToolbarRequestHandlers): void => {
  const nonce = useFileOpsStore((s) => s.nonce);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const { request, consume } = useFileOpsStore.getState();
    if (!request) return;
    runToolbarRequest(request, handlersRef.current);
    consume();
  }, [nonce]);
};
