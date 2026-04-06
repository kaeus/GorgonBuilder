import { useQuery } from '@tanstack/react-query';
import { loadCdnBundle } from './loader';
import type { CdnBundle } from './types';

export function useCdnData() {
  return useQuery<CdnBundle>({
    queryKey: ['cdn-bundle'],
    queryFn: loadCdnBundle,
  });
}
