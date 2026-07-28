import { useQuery } from '@tanstack/react-query';
import { GitService } from '../../../shared/api/bindings';

export type GitFileDiffView = {
  path: string;
  repoRoot: string;
  relPath: string;
  status: string;
  oldText: string;
  newText: string;
  binary: boolean;
  truncated: boolean;
  message: string;
};

export const useGitFileDiff = (path: string | null, enabled: boolean) => {
  return useQuery({
    queryKey: ['gitFileDiff', path ?? ''] as const,
    queryFn: async (): Promise<GitFileDiffView> => {
      const d = await GitService.FileDiff(path!);
      return {
        path: d?.path ?? path!,
        repoRoot: d?.repoRoot ?? '',
        relPath: d?.relPath ?? '',
        status: d?.status ?? '',
        oldText: d?.oldText ?? '',
        newText: d?.newText ?? '',
        binary: Boolean(d?.binary),
        truncated: Boolean(d?.truncated),
        message: d?.message ?? '',
      };
    },
    enabled: Boolean(enabled && path),
    staleTime: 0,
  });
};
