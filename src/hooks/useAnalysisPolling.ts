import { useState, useEffect, useRef } from 'react';
import type { Analysis } from '../types';
import { analysisService } from '../services/analysisService';

export function useAnalysisPolling(analysisId: string | undefined) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analysisId) {
      setIsLoading(false);
      setError('No analysis ID specified.');
      return;
    }

    let isMounted = true;

    const poll = async () => {
      try {
        const data = await analysisService.getAnalysisById(analysisId);
        if (!isMounted) return;

        if (!data) {
          setError(`Analysis "${analysisId}" could not be located in registry.`);
          setIsLoading(false);
          return;
        }

        setAnalysis(data);
        setIsLoading(false);

        // Continue polling if still queued or processing
        if (data.status === 'queued' || data.status === 'processing') {
          timerRef.current = window.setTimeout(poll, 300);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch analysis status.');
        setIsLoading(false);
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [analysisId]);

  return { analysis, isLoading, error };
}
