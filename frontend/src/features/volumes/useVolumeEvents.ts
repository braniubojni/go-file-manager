import { useQueryClient } from '@tanstack/react-query';
import { Events } from '@wailsio/runtime';
import { useEffect } from 'react';

/** Keep the drives menu in sync with OS mounts (SMB, DMG, USB). */
export const useVolumeEvents = (): void => {
  const qc = useQueryClient();
  useEffect(() => {
    const unsub = Events.On('volumes:changed', () => {
      void qc.invalidateQueries({ queryKey: ['volumes'] });
    });
    return () => {
      unsub();
    };
  }, [qc]);
};
